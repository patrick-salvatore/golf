package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/patrick-salvatore/games-server/internal/models"
	db "github.com/patrick-salvatore/games-server/models"
)

// -- Transactions --

func (s *Store) SelectPlayerTx(inviteToken string, tournamentID, playerID int) (*models.Player, *models.TournamentRound, error) {
	var player *models.Player
	var round *models.TournamentRound

	err := s.RunInTransaction(func(tx *sql.Tx) error {
		q := s.Queries.WithTx(tx)
		ctx := context.Background()

		// 1. Verify Invite
		invite, err := q.GetInvite(ctx, inviteToken)
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("invalid invite token")
			}
			return err
		}
		if !invite.Active {
			return fmt.Errorf("invite is no longer active")
		}
		if invite.ExpiresAt.Before(time.Now()) {
			return fmt.Errorf("invite has expired")
		}
		if int(invite.TournamentID) != tournamentID {
			return fmt.Errorf("invite is for a different tournament")
		}

		// 2. Check Tournament Status
		t, err := q.GetTournament(ctx, int64(tournamentID))
		if err != nil {
			return err
		}
		if t.Complete {
			return fmt.Errorf("tournament is complete")
		}

		// 3. Claim Player
		if err := q.ClaimPlayer(ctx, int64(playerID)); err != nil {
			return err
		}

		// 4. Get Player Details
		p, err := q.GetAvailablePlayerById(ctx, int64(playerID))
		if err != nil {
			return err
		}

		player = &models.Player{
			ID:                  int(p.ID),
			Name:                p.Name,
			Handicap:            p.Handicap.Float64,
			IsAdmin:             p.IsAdmin.Bool,
			RefreshTokenVersion: int(p.Refreshtokenversion),
			TournamentID:        int(p.TournamentID),
			TeamID:              int(p.TeamID),
		}

		// 5. Get Active Round
		r, err := q.GetActiveTournamentRound(ctx, int64(tournamentID))
		if err != nil {
			return fmt.Errorf("failed to get active round: %w", err)
		}

		var createdAt string
		if r.CreatedAt.Valid {
			createdAt = r.CreatedAt.Time.Format("2006-01-02 15:04:05")
		}

		round = &models.TournamentRound{
			ID:           int(r.ID),
			TournamentID: int(r.TournamentID),
			RoundNumber:  int(r.RoundNumber),
			Date:         r.Date.String(),
			CourseID:     int(r.CourseID),
			Name:         r.Name,
			Status:       r.Status.String,
			CreatedAt:    createdAt,
		}

		return nil
	})

	return player, round, err
}

func (s *Store) CreateInviteTx(tx *sql.Tx, tournamentID, teamID int) (*models.Invite, error) {
	q := s.Queries.WithTx(tx)
	ctx := context.Background()

	// Verify team belongs to tournament
	if teamID != 0 {
		exists, err := q.CheckTeamExists(ctx, int64(teamID))
		if err != nil {
			return nil, err
		}
		if exists == 0 {
			return nil, sql.ErrNoRows
		}
	}

	token := uuid.New().String()
	// Expires in 7 days
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	createdAt := time.Now().UTC()

	i, err := q.CreateInvite(ctx, db.CreateInviteParams{
		Token:        token,
		TournamentID: int64(tournamentID),
		ExpiresAt:    expiresAt,
		CreatedAt:    sql.NullTime{Time: createdAt, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	return &models.Invite{
		Token:        i.Token,
		Active:       i.Active,
		TournamentID: int(i.TournamentID),
		ExpiresAt:    i.ExpiresAt.Format(time.RFC3339),
		CreatedAt:    i.CreatedAt.Time.Format(time.RFC3339),
	}, nil
}

func (s *Store) RunInTransaction(fn func(*sql.Tx) error) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
		} else {
			commitErr := tx.Commit()
			if commitErr != nil && err == nil {
				err = commitErr
			}
		}
	}()

	err = fn(tx)
	return err
}

func (s *Store) GetCourseByTournamentRoundIDTx(tx *sql.Tx, tournamentRoundID int) (*models.Course, error) {
	q := s.Queries.WithTx(tx)
	ctx := context.Background()

	c, err := q.GetCourseByTournamentRoundID(ctx, int64(tournamentRoundID))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	hRows, err := q.GetCourseHoles(ctx, c.ID)
	if err != nil {
		return nil, err
	}

	var holes []models.HoleData
	for _, h := range hRows {
		holes = append(holes, models.HoleData{
			ID:       int(h.ID),
			Number:   int(h.HoleNumber),
			Par:      int(h.Par),
			Handicap: int(h.Handicap),
			Yardage:  int(h.Yardage),
		})
	}

	return &models.Course{
		ID:   int(c.ID),
		Name: c.Name,
		Meta: models.CourseMeta{
			Holes: holes,
			Tees:  []string{"Mens"},
		},
	}, nil
}

func (s *Store) GetTeamPlayersTx(tx *sql.Tx, teamID int) ([]models.Player, error) {
	q := s.Queries.WithTx(tx)
	ctx := context.Background()

	dbPlayers, err := q.GetTeamPlayers(ctx, int64(teamID))
	if err != nil {
		return nil, err
	}

	var players []models.Player
	for _, p := range dbPlayers {
		var teeName string
		if p.TeeName.Valid {
			teeName = p.TeeName.String
		}

		players = append(players, models.Player{
			ID:           int(p.ID),
			Name:         p.Name,
			Handicap:     p.Handicap.Float64,
			IsAdmin:      p.IsAdmin.Bool,
			Active:       p.Active,
			TeeName:      teeName,
			Tee:          int(p.CourseTeesID),
			TournamentID: int(p.TournamentID),
			TeamID:       int(p.TeamID),
			CreatedAt:    p.CreatedAt.Time,
		})
	}
	return players, nil
}
