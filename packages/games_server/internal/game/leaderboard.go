package game

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/patrick-salvatore/games-server/internal/infra"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

type LeaderboardEntry struct {
	Position int    `json:"position"`
	TeamID   int    `json:"teamId"`
	TeamName string `json:"name"`
	Score    int    `json:"score"` // Relative to par
	Thru     int    `json:"thru"`
}

type LeaderboardResponse struct {
	TournamentID int                `json:"tournamentId"`
	Format       string             `json:"format"`
	Leaderboard  []LeaderboardEntry `json:"leaderboard"`
}

// TeamRoundStats is exported to allow caching (json marshalling)
type TeamRoundStats struct {
	TotalScore  int `json:"totalScore"`
	HolesPlayed int `json:"holesPlayed"`
}

func CalculateLeaderboard(ctx context.Context, db *store.Store, cache *infra.CacheManager, tournamentID int) (*LeaderboardResponse, error) {
	// 1. Fetch Tournament
	t, err := db.GetTournament(tournamentID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("tournament not found")
	}

	// 2. Fetch All Formats (to map ID -> Name)
	formats, err := db.GetAllFormats()
	if err != nil {
		return nil, err
	}
	formatMap := make(map[int]string)
	for _, f := range formats {
		formatMap[f.ID] = f.Name
	}

	// 3. Fetch Tournament Rounds
	rounds, err := db.GetTournamentRounds(tournamentID)
	if err != nil {
		return nil, err
	}

	// 4. Fetch Teams & Players
	teams, err := db.GetTeamsByTournament(tournamentID)
	if err != nil {
		return nil, err
	}
	teamMap := make(map[int]models.Team)
	for _, tm := range teams {
		teamMap[tm.ID] = tm
	}

	players, err := db.GetAvailablePlayers(tournamentID)
	if err != nil {
		return nil, err
	}

	// Map PlayerID -> Handicap
	playerHandicap := make(map[int]float64)
	// Map TeamID -> Player Count (for completion check)
	teamPlayerCount := make(map[int]int)

	for _, p := range players {
		playerHandicap[p.PlayerID] = float64(p.Handicap)
		teamPlayerCount[p.TeamID]++
	}

	// 5. Initialize Stats Accumulator
	// Global stats for the tournament
	stats := make(map[int]*TeamRoundStats)
	for tID := range teamMap {
		stats[tID] = &TeamRoundStats{
			TotalScore:  0,
			HolesPlayed: 0,
		}
	}

	var activeFormatName string

	// 6. Iterate Through Rounds and Accumulate Scores
	for _, round := range rounds {
		// Determine Format Name for this round
		formatName, ok := formatMap[round.FormatID]
		if !ok {
			return nil, fmt.Errorf("unknown format")
		}

		// Keep track of the active round's format for the response
		if round.Status == "active" {
			activeFormatName = formatName
		}

		// --- Cache Check ---
		var currentRoundStats map[int]*TeamRoundStats
		cacheKey := fmt.Sprintf("round_stats:%d", round.ID)

		if round.Status == "completed" && cache != nil {
			var cached map[int]*TeamRoundStats
			if cache.Get(cacheKey, &cached) {
				currentRoundStats = cached
			}
		}

		// If not cached, calculate it
		if currentRoundStats == nil {
			currentRoundStats = make(map[int]*TeamRoundStats)

			// Fetch Course for this round
			course, err := db.GetCourseByTournamentRoundID(round.ID)
			if err != nil {
				return nil, err
			}
			if course == nil {
				// Skip rounds without a course? Or error?
				continue
			}

			holeMap := make(map[int]models.HoleData)
			for _, h := range course.Meta.Holes {
				holeMap[h.ID] = h
			}

			// Fetch Scores for this round
			scores, err := db.GetRoundScores(round.ID, nil, nil)
			if err != nil {
				return nil, err
			}

			lowerFormat := strings.ToLower(formatName)
			isScramble := strings.Contains(lowerFormat, "scramble") ||
				strings.Contains(lowerFormat, "alternate shot")

			if isScramble {
				// Scramble: One score per team per hole
				// Track which holes were played in this round by this team
				teamRoundHoles := make(map[int]map[int]bool) // teamID -> holeID -> played

				for _, s := range scores {
					if s.TeamID == nil {
						continue
					}
					tID := *s.TeamID

					// Ensure team exists in our known teams
					if _, exists := teamMap[tID]; !exists {
						continue
					}

					hole, ok := holeMap[s.CourseHoleID]
					if !ok {
						continue
					}

					// Check if already counted for this round/hole
					if teamRoundHoles[tID] == nil {
						teamRoundHoles[tID] = make(map[int]bool)
					}
					if teamRoundHoles[tID][s.CourseHoleID] {
						continue
					}

					if _, ok := currentRoundStats[tID]; !ok {
						currentRoundStats[tID] = &TeamRoundStats{}
					}

					net := s.Strokes - hole.Par
					currentRoundStats[tID].TotalScore += net
					currentRoundStats[tID].HolesPlayed++
					teamRoundHoles[tID][s.CourseHoleID] = true
				}
			} else {
				// Best Ball / Individual Aggregation
				teamHoleScores := make(map[int]map[int][]int) // teamID -> courseHoleID -> []netScoresRelative

				for _, s := range scores {
					// Resolve TeamID
					var tID int
					if s.TeamID != nil {
						tID = *s.TeamID
					} else if s.PlayerID != nil {
						// Try to find team from player
						continue
					} else {
						continue
					}

					if _, exists := teamMap[tID]; !exists {
						continue
					}

					hole, ok := holeMap[s.CourseHoleID]
					if !ok {
						continue
					}

					// Calculate Net Score Relative to Par
					var hcp float64
					if s.PlayerID != nil {
						hcp = playerHandicap[*s.PlayerID]
					}

					// Calculate Strokes Received
					received := 0
					hcpInt := int(hcp)

					// Use hole.Handicap (Stroke Index) vs Player Handicap
					if float64(hcpInt) >= hole.AllowedHandicap {
						received++
					}
					if float64(hcpInt-18) >= hole.AllowedHandicap {
						received++
					}

					netRelative := (s.Strokes - received) - hole.Par

					if _, ok := teamHoleScores[tID]; !ok {
						teamHoleScores[tID] = make(map[int][]int)
					}
					teamHoleScores[tID][s.CourseHoleID] = append(teamHoleScores[tID][s.CourseHoleID], netRelative)
				}

				// Calculate per hole
				scoresToCount := 1
				isBestBall := false

				if strings.Contains(lowerFormat, "2-man") || strings.Contains(lowerFormat, "2 man") {
					if strings.Contains(lowerFormat, "best ball") {
						scoresToCount = 2
						isBestBall = true
					}
				}
				if strings.Contains(lowerFormat, "4-man") || strings.Contains(lowerFormat, "4 man") {
					if strings.Contains(lowerFormat, "best ball") {
						scoresToCount = 1
						isBestBall = true
					}
				}

				for tID, holes := range teamHoleScores {
					for _, relScores := range holes { // Iterate scores for each hole
						if isBestBall {
							required := teamPlayerCount[tID]
							if len(relScores) < required {
								continue
							}
						}

						sort.Ints(relScores)

						holeTotal := 0
						count := 0
						for i := 0; i < len(relScores) && i < scoresToCount; i++ {
							holeTotal += relScores[i]
							count++
						}

						if count > 0 {
							if _, ok := currentRoundStats[tID]; !ok {
								currentRoundStats[tID] = &TeamRoundStats{}
							}
							currentRoundStats[tID].TotalScore += holeTotal
							currentRoundStats[tID].HolesPlayed++
						}
					}
				}
			}

			// --- Save to Cache if Completed ---
			if round.Status == "completed" && cache != nil {
				// Cache for a long time (e.g., 24 hours)
				cache.Set(cacheKey, currentRoundStats, 24*time.Hour)
			}
		}

		// --- Merge Round Stats into Tournament Stats ---
		for tID, rs := range currentRoundStats {
			if _, exists := stats[tID]; !exists {
				// Should have been initialized but just in case
				stats[tID] = &TeamRoundStats{}
			}
			stats[tID].TotalScore += rs.TotalScore
			stats[tID].HolesPlayed += rs.HolesPlayed
		}
	}

	// 7. Flatten to List
	leaderboard := []LeaderboardEntry{}
	for tID, stat := range stats {
		teamName := "Unknown"
		if t, ok := teamMap[tID]; ok {
			teamName = t.Name
		}
		leaderboard = append(leaderboard, LeaderboardEntry{
			TeamID:   tID,
			TeamName: teamName,
			Score:    stat.TotalScore,
			Thru:     stat.HolesPlayed,
		})
	}

	// 8. Sort Leaderboard (Lowest Score First)
	sort.Slice(leaderboard, func(i, j int) bool {
		if leaderboard[i].Score != leaderboard[j].Score {
			return leaderboard[i].Score < leaderboard[j].Score
		}
		if leaderboard[i].Thru != leaderboard[j].Thru {
			return leaderboard[i].Thru > leaderboard[j].Thru
		}
		return leaderboard[i].TeamName < leaderboard[j].TeamName
	})

	// 9. Assign Positions
	for i := range leaderboard {
		leaderboard[i].Position = i + 1
	}

	return &LeaderboardResponse{
		TournamentID: tournamentID,
		Format:       activeFormatName,
		Leaderboard:  leaderboard,
	}, nil
}
