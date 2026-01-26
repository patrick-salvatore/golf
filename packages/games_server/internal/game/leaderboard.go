package game

import (
	"context"
	"fmt"
	"sort"
	"strings"

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

func CalculateLeaderboard(ctx context.Context, db *store.Store, tournamentID int) (*LeaderboardResponse, error) {
	// 1. Fetch Tournament
	t, err := db.GetTournament(tournamentID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("tournament not found")
	}

	// 2. Fetch Format
	formats, err := db.GetAllFormats()
	if err != nil {
		return nil, err
	}
	var formatName string
	for _, f := range formats {
		if f.ID == t.FormatID {
			formatName = f.Name
			break
		}
	}

	// 3. Fetch Course & Holes (for Par)
	course, err := db.GetCourseByTournamentID(tournamentID)
	if err != nil {
		return nil, err
	}
	if course == nil {
		return nil, fmt.Errorf("course not found")
	}
	holeMap := make(map[int]models.HoleData) // course_hole_id -> HoleData
	for _, h := range course.Meta.Holes {
		holeMap[h.ID] = h
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

	// 5. Fetch Scores
	scores, err := db.GetScores(tournamentID, nil, nil)
	if err != nil {
		return nil, err
	}

	// 6. Calculate
	leaderboard := []LeaderboardEntry{}

	// Helper to track team stats
	type teamStats struct {
		TotalScore  int
		HolesPlayed map[int]bool
	}
	stats := make(map[int]*teamStats)
	for tID := range teamMap {
		stats[tID] = &teamStats{
			TotalScore:  0,
			HolesPlayed: make(map[int]bool),
		}
	}

	lowerFormat := strings.ToLower(formatName)
	isScramble := strings.Contains(lowerFormat, "scramble") ||
		strings.Contains(lowerFormat, "alternate shot")

	if isScramble {
		// Scramble / Alternate Shot: One score per team per hole
		for _, s := range scores {
			// Scramble scores must have TeamID
			if s.TeamID == nil {
				continue
			}
			tID := *s.TeamID
			if _, exists := stats[tID]; !exists {
				continue
			}

			hole, ok := holeMap[s.CourseHoleID]
			if !ok {
				continue
			}

			net := s.Strokes - hole.Par
			stats[tID].TotalScore += net
			stats[tID].HolesPlayed[s.CourseHoleID] = true
		}
	} else {
		teamHoleScores := make(map[int]map[int][]int) // teamID -> courseHoleID -> []netScoresRelative

		for _, s := range scores {
			// Resolve TeamID
			var tID int
			if s.TeamID != nil {
				tID = *s.TeamID
			} else {
				continue
			}

			if _, exists := stats[tID]; !exists {
				continue
			}

			hole, ok := holeMap[s.CourseHoleID]
			if !ok {
				continue
			}

			// Calculate Net Score Relative to Par
			// 1. Get Player Handicap
			var hcp float64
			if s.PlayerID != nil {
				hcp = playerHandicap[*s.PlayerID]
			}

			// 2. Calculate Strokes Received
			received := 0
			// Cast to int for comparison
			hcpInt := int(hcp)

			if float64(hcpInt) >= hole.AllowedHandicap {
				received++
			}
			if float64(hcpInt-18) >= hole.AllowedHandicap {
				received++
			}

			// 3. Net Relative
			// (Gross - Received) - Par
			netRelative := (s.Strokes - received) - hole.Par

			if _, ok := teamHoleScores[tID]; !ok {
				teamHoleScores[tID] = make(map[int][]int)
			}
			teamHoleScores[tID][s.CourseHoleID] = append(teamHoleScores[tID][s.CourseHoleID], netRelative)
		}

		// Calculate per hole
		scoresToCount := 1
		isBestBall := false

		// "sum the 2 lowest scores on the hole for the teams score" for 2-Man Best Ball
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
			for hID, relScores := range holes {
				if isBestBall {
					required := teamPlayerCount[tID]
					if len(relScores) < required {
						continue
					}
				}

				// Sort (Best/Lowest first)
				sort.Ints(relScores)

				// Take top N
				holeTotal := 0
				count := 0
				for i := 0; i < len(relScores) && i < scoresToCount; i++ {
					holeTotal += relScores[i]
					count++
				}

				if count > 0 {
					stats[tID].TotalScore += holeTotal
					stats[tID].HolesPlayed[hID] = true
				}
			}
		}
	}

	// Flatten to List
	for tID, stat := range stats {
		teamName := "Unknown"
		if t, ok := teamMap[tID]; ok {
			teamName = t.Name
		}
		leaderboard = append(leaderboard, LeaderboardEntry{
			TeamID:   tID,
			TeamName: teamName,
			Score:    stat.TotalScore,
			Thru:     len(stat.HolesPlayed),
		})
	}

	// Sort Leaderboard (Lowest Score First)
	sort.Slice(leaderboard, func(i, j int) bool {
		if leaderboard[i].Score != leaderboard[j].Score {
			return leaderboard[i].Score < leaderboard[j].Score
		}
		if leaderboard[i].Thru != leaderboard[j].Thru {
			return leaderboard[i].Thru > leaderboard[j].Thru
		}
		return leaderboard[i].TeamName < leaderboard[j].TeamName
	})

	// Assign Positions
	for i := range leaderboard {
		leaderboard[i].Position = i + 1
	}

	return &LeaderboardResponse{
		TournamentID: tournamentID,
		Format:       formatName,
		Leaderboard:  leaderboard,
	}, nil
}
