package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/patrick-salvatore/games-server/internal/models"
	db "github.com/patrick-salvatore/games-server/models"
)

func (s *Store) SetupTournamentTx(req models.SetupTournamentRequest) (*models.Tournament, error) {
	ctx := context.Background()

	// 1. Calculate Start/End Date from Rounds
	if len(req.Rounds) == 0 {
		return nil, fmt.Errorf("at least one round is required")
	}

	var startDate, endDate time.Time
	for i, r := range req.Rounds {
		d, err := time.Parse("2006-01-02", r.Date)
		if err != nil {
			return nil, fmt.Errorf("invalid date format for round %d: %v", r.RoundNumber, err)
		}
		if i == 0 {
			startDate = d
			endDate = d
		} else {
			if d.Before(startDate) {
				startDate = d
			}
			if d.After(endDate) {
				endDate = d
			}
		}
	}

	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	q := s.Queries.WithTx(tx)

	// 2. Create Tournament
	t, err := q.CreateTournament(ctx, db.CreateTournamentParams{
		Name:      req.Name,
		TeamCount: int64(req.TeamCount),
		StartDate: startDate,
		EndDate:   endDate,
		CreatedAt: sql.NullTime{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create tournament: %w", err)
	}

	// 3. Create Rounds
	for _, r := range req.Rounds {
		d, _ := time.Parse("2006-01-02", r.Date) // Already validated
		status := r.Status
		if status == "" {
			status = "pending"
		}

		_, err := q.CreateTournamentRound(ctx, db.CreateTournamentRoundParams{
			TournamentID: t.ID,
			RoundNumber:  int64(r.RoundNumber),
			Date:         d,
			CourseID:     int64(r.CourseID),
			FormatID:     int64(r.FormatID),
			Name:         r.Name,
			Status:       sql.NullString{String: status, Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create round %d: %w", r.RoundNumber, err)
		}
	}

	// 4. Create Groups
	groupMap := make(map[string]int64)
	for _, groupName := range req.Groups {
		g, err := q.CreateTeamGroup(ctx, db.CreateTeamGroupParams{
			Name:         groupName,
			TournamentID: t.ID,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create group %s: %w", groupName, err)
		}
		groupMap[groupName] = g.ID
	}

	// 5. Create Teams
	for _, teamReq := range req.Teams {
		tm, err := q.CreateTeam(ctx, db.CreateTeamParams{
			Name:         teamReq.Name,
			TournamentID: sql.NullInt64{Int64: t.ID, Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create team %s: %w", teamReq.Name, err)
		}

		if teamReq.GroupName != "" {
			groupID, ok := groupMap[teamReq.GroupName]
			if !ok {
				return nil, fmt.Errorf("group %s not found for team %s", teamReq.GroupName, teamReq.Name)
			}
			err := q.AddTeamToGroup(ctx, db.AddTeamToGroupParams{
				TeamID:  tm.ID,
				GroupID: groupID,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to add team %s to group %s: %w", teamReq.Name, teamReq.GroupName, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// 7. Return Tournament
	return s.GetTournament(int(t.ID))
}
