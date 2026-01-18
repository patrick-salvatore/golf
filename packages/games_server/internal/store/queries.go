package store

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/patrick-salvatore/games-server/internal/models"
)

// Wrapper struct to hang methods off of
type Store struct {
	DB *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{DB: db}
}

// -- Formats --

func (s *Store) GetAllFormats() ([]models.TournamentFormat, error) {
	rows, err := s.DB.Query("SELECT id, name, description FROM tournament_formats ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var formats []models.TournamentFormat
	for rows.Next() {
		var f models.TournamentFormat
		var desc sql.NullString
		if err := rows.Scan(&f.ID, &f.Name, &desc); err != nil {
			return nil, err
		}
		f.Description = desc.String
		formats = append(formats, f)
	}
	return formats, nil
}

// -- Players --

func (s *Store) GetAllPlayers() ([]models.Player, error) {
	rows, err := s.DB.Query("SELECT id, name, handicap, is_admin, created_at FROM players ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []models.Player
	for rows.Next() {
		var p models.Player
		var createdStr string
		var isAdmin sql.NullBool
		if err := rows.Scan(&p.ID, &p.Name, &p.Handicap, &isAdmin, &createdStr); err != nil {
			return nil, err
		}
		p.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdStr)
		if isAdmin.Valid {
			p.IsAdmin = isAdmin.Bool
		}
		players = append(players, p)
	}
	return players, nil
}

func (s *Store) CreatePlayer(name string, handicap float64, isAdmin bool) (*models.Player, error) {
	id := uuid.New().String()
	now := time.Now()
	_, err := s.DB.Exec("INSERT INTO players (id, name, handicap, is_admin, created_at) VALUES (?, ?, ?, ?, ?)",
		id, name, handicap, isAdmin, now.Format("2006-01-02 15:04:05"))
	if err != nil {
		return nil, err
	}
	return &models.Player{ID: id, Name: name, Handicap: handicap, IsAdmin: isAdmin, CreatedAt: now}, nil
}

// -- Tournaments --

func (s *Store) GetAllTournaments() ([]models.Tournament, error) {
	rows, err := s.DB.Query("SELECT id, name, course_id, format_id, team_count, awarded_handicap, is_match_play, complete, start_time, created_at FROM tournaments ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tournaments []models.Tournament
	for rows.Next() {
		var t models.Tournament
		var startTime sql.NullString
		if err := rows.Scan(&t.ID, &t.Name, &t.CourseID, &t.FormatID, &t.TeamCount, &t.AwardedHandicap, &t.IsMatchPlay, &t.Complete, &startTime, &t.CreatedAt); err != nil {
			return nil, err
		}
		if startTime.Valid {
			t.StartTime = startTime.String
		}
		tournaments = append(tournaments, t)
	}
	return tournaments, nil
}

func (s *Store) GetTournament(id string) (*models.Tournament, error) {
	var t models.Tournament
	var startTime sql.NullString
	err := s.DB.QueryRow("SELECT id, name, course_id, format_id, team_count, awarded_handicap, is_match_play, complete, start_time, created_at FROM tournaments WHERE id = ?", id).
		Scan(&t.ID, &t.Name, &t.CourseID, &t.FormatID, &t.TeamCount, &t.AwardedHandicap, &t.IsMatchPlay, &t.Complete, &startTime, &t.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if startTime.Valid {
		t.StartTime = startTime.String
	}
	return &t, nil
}

func (s *Store) CreateTournament(req models.CreateTournamentRequest) (*models.Tournament, error) {
	id := uuid.New().String()
	now := time.Now().Format("2006-01-02 15:04:05")
	_, err := s.DB.Exec(`
		INSERT INTO tournaments (id, name, course_id, format_id, team_count, awarded_handicap, is_match_play, start_time, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, req.Name, req.CourseID, req.FormatID, req.TeamCount, req.AwardedHandicap, req.IsMatchPlay, req.StartTime, now)

	if err != nil {
		return nil, err
	}

	return &models.Tournament{
		ID:              id,
		Name:            req.Name,
		CourseID:        req.CourseID,
		FormatID:        req.FormatID,
		TeamCount:       req.TeamCount,
		AwardedHandicap: req.AwardedHandicap,
		IsMatchPlay:     req.IsMatchPlay,
		StartTime:       req.StartTime,
		CreatedAt:       now,
	}, nil
}

// -- Teams --

func (s *Store) CreateTeam(tournamentID, name string) (string, error) {
	id := uuid.New().String()
	_, err := s.DB.Exec("INSERT INTO teams (id, name, tournament_id, started, finished) VALUES (?, ?, ?, 0, 0)", id, name, tournamentID)
	if err != nil {
		return "", err
	}
	return id, nil
}

func (s *Store) AddPlayerToTeam(teamID, playerID, tee, tournamentID string) error {
	_, err := s.DB.Exec("INSERT INTO team_players (team_id, player_id, tee) VALUES (?, ?, ?)", teamID, playerID, tee)
	return err
}

func (s *Store) GetTeamsByTournament(tournamentID string) ([]models.Team, error) {
	rows, err := s.DB.Query("SELECT id, name, tournament_id, started, finished FROM teams WHERE tournament_id = ?", tournamentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var teams []models.Team
	for rows.Next() {
		var t models.Team
		if err := rows.Scan(&t.ID, &t.Name, &t.TournamentID, &t.Started, &t.Finished); err != nil {
			return nil, err
		}
		teams = append(teams, t)
	}
	return teams, nil
}

// -- Courses --

func (s *Store) GetAllCourses() ([]models.Course, error) {
	rows, err := s.DB.Query("SELECT id, name, data FROM courses")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []models.Course
	for rows.Next() {
		var c models.Course
		var data sql.NullString
		if err := rows.Scan(&c.ID, &c.Name, &data); err != nil {
			return nil, err
		}
		if data.Valid {
			_ = json.Unmarshal([]byte(data.String), &c.Meta)
		}
		courses = append(courses, c)
	}
	return courses, nil
}

// -- Active Players --

func (s *Store) GetAvailablePlayers(tournamentID string) ([]models.Player, error) {
	query := `
		SELECT p.id, p.name, p.handicap 
		FROM players p
		JOIN team_players tp ON tp.player_id = p.id
		JOIN teams t ON t.id = tp.team_id
		WHERE t.tournament_id = ?
		AND p.id NOT IN (
			SELECT player_id FROM active_tournament_players WHERE tournament_id = ?
		)
		ORDER BY p.name
	`
	rows, err := s.DB.Query(query, tournamentID, tournamentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []models.Player
	for rows.Next() {
		var p models.Player
		if err := rows.Scan(&p.ID, &p.Name, &p.Handicap); err != nil {
			return nil, err
		}
		players = append(players, p)
	}
	return players, nil
}

func (s *Store) SelectPlayer(tournamentID, playerID string) error {
	// Attempt to claim player
	_, err := s.DB.Exec(`
		INSERT INTO active_tournament_players (tournament_id, player_id) 
		VALUES (?, ?)
	`, tournamentID, playerID)
	return err
}

func (s *Store) RemoveActivePlayer(tournamentID, playerID string) error {
	_, err := s.DB.Exec(`
		DELETE FROM active_tournament_players 
		WHERE tournament_id = ? AND player_id = ?
	`, tournamentID, playerID)
	return err
}

// -- Invites --

func (s *Store) CreateInvite(tournamentID, teamID string) (*models.Invite, error) {
	token := uuid.New().String()
	// Expires in 7 days
	expiresAt := time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02 15:04:05")
	createdAt := time.Now().Format("2006-01-02 15:04:05")

	_, err := s.DB.Exec(`
		INSERT INTO invites (token, tournament_id, team_id, expires_at, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, token, tournamentID, teamID, expiresAt, createdAt)

	if err != nil {
		return nil, err
	}

	return &models.Invite{
		Token:        token,
		TournamentID: tournamentID,
		TeamID:       teamID,
		ExpiresAt:    expiresAt,
		CreatedAt:    createdAt,
	}, nil
}

func (s *Store) GetInvite(token string) (*models.Invite, error) {
	var i models.Invite
	var teamID sql.NullString
	err := s.DB.QueryRow("SELECT token, tournament_id, team_id, expires_at, created_at FROM invites WHERE token = ?", token).
		Scan(&i.Token, &i.TournamentID, &teamID, &i.ExpiresAt, &i.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	i.TeamID = teamID.String
	return &i, nil
}
