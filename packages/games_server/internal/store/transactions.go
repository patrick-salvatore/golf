package store

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/patrick-salvatore/games-server/internal/models"
)

// -- Transactions --

func (s *Store) CreateInviteTx(tx *sql.Tx, tournamentID, teamID int) (*models.Invite, error) {
	// Verify team belongs to tournament
	if teamID != 0 {
		var exists bool
		err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM teams WHERE id = ? AND tournament_id = ?)`, teamID, tournamentID).Scan(&exists)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, sql.ErrNoRows
		}
	}

	token := uuid.New().String()
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour).Format(time.RFC3339)
	createdAt := time.Now().UTC().Format(time.RFC3339)

	_, err := tx.Exec(`INSERT INTO invites (token, tournament_id, team_id, expires_at, created_at, active) VALUES (?, ?, ?, ?, ?, 1)`,
		token, tournamentID, teamID, expiresAt, createdAt)
	if err != nil {
		return nil, err
	}

	return &models.Invite{
		Token:        token,
		TournamentID: tournamentID,
		TeamID:       teamID,
		ExpiresAt:    expiresAt,
		CreatedAt:    createdAt,
		Active:       true,
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
			err = tx.Commit()
		}
	}()

	err = fn(tx)
	return err
}

func (s *Store) GetCourseByTournamentIDTx(tx *sql.Tx, tournamentID int) (*models.Course, error) {
	var c models.Course
	err := tx.QueryRow(`
		SELECT c.id, c.name
		FROM courses c
		JOIN tournaments t ON t.course_id = c.id
		WHERE t.id = ?
	`, tournamentID).Scan(&c.ID, &c.Name)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Fetch Holes from table
	holesQuery := `
		SELECT id, hole_number, par, handicap, yardage 
		FROM course_holes 
		WHERE course_id = ? AND tee_set = 'Mens' 
		ORDER BY hole_number ASC
	`
	hRows, err := tx.Query(holesQuery, c.ID)
	if err != nil {
		return nil, err
	}
	defer hRows.Close()

	var holes []models.HoleData
	for hRows.Next() {
		var h models.HoleData
		if err := hRows.Scan(&h.ID, &h.Number, &h.Par, &h.Handicap, &h.Yardage); err != nil {
			return nil, err
		}
		holes = append(holes, h)
	}

	c.Meta = models.CourseMeta{
		Holes: holes,
		Tees:  []string{"Mens"},
	}

	return &c, nil
}

func (s *Store) GetTeamPlayersTx(tx *sql.Tx, teamID int) ([]models.Player, error) {
	query := `
		SELECT p.id, p.name, p.handicap, p.is_admin, p.created_at, tp.tee
		FROM players p
		JOIN team_players tp ON tp.player_id = p.id
		WHERE tp.team_id = ?
	`
	rows, err := tx.Query(query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []models.Player
	for rows.Next() {
		var p models.Player
		var createdStr string
		var isAdmin sql.NullBool
		var tee sql.NullString

		if err := rows.Scan(&p.ID, &p.Name, &p.Handicap, &isAdmin, &createdStr, &tee); err != nil {
			return nil, err
		}
		p.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdStr)
		if isAdmin.Valid {
			p.IsAdmin = isAdmin.Bool
		}
		if tee.Valid {
			p.Tee = tee.String
		}
		players = append(players, p)
	}
	return players, nil
}

func (s *Store) StartTeamTx(tx *sql.Tx, teamID int) error {
	_, err := tx.Exec("UPDATE teams SET started = 1 WHERE id = ?", teamID)
	return err
}
