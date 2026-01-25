package store

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/patrick-salvatore/games-server/internal/models"
	db "github.com/patrick-salvatore/games-server/models"
)

// -- Transactions --

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
		Token:        sql.NullString{String: token, Valid: true},
		TournamentID: int64(tournamentID),
		ExpiresAt:    sql.NullTime{Time: expiresAt, Valid: true},
		CreatedAt:    sql.NullTime{Time: createdAt, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	return &models.Invite{
		Token:        i.Token.String,
		TournamentID: int(i.TournamentID),
		ExpiresAt:    i.ExpiresAt.Time.Format(time.RFC3339),
		CreatedAt:    i.CreatedAt.Time.Format(time.RFC3339),
		Active:       i.Active.Bool,
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

func (s *Store) GetCourseByTournamentIDTx(tx *sql.Tx, tournamentID int) (*models.Course, error) {
	q := s.Queries.WithTx(tx)
	ctx := context.Background()

	c, err := q.GetCourseByTournamentID(ctx, int64(tournamentID))
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
			ID:        int(h.ID),
			Number:    int(h.HoleNumber),
			Par:       int(h.Par),
			Handicap:  int(h.Handicap),
			HoleIndex: int(h.HoleIndex.Int64),
			Yardage:   int(h.Yardage),
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
