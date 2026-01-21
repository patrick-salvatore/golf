package store

import (
	"database/sql"
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

func (s *Store) GetPlayer(id int) (*models.Player, error) {
	var p models.Player
	var createdStr string
	var isAdmin sql.NullBool
	err := s.DB.QueryRow("SELECT id, name, handicap, is_admin, created_at FROM players WHERE id = ?", id).
		Scan(&p.ID, &p.Name, &p.Handicap, &isAdmin, &createdStr)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdStr)
	if isAdmin.Valid {
		p.IsAdmin = isAdmin.Bool
	}
	return &p, nil
}

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
	now := time.Now()
	result, err := s.DB.Exec("INSERT INTO players (name, handicap, is_admin, created_at) VALUES (?, ?, ?, ?)",
		name, handicap, isAdmin, now.Format("2006-01-02 15:04:05"))
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.Player{
		ID:        int(id),
		Name:      name,
		Handicap:  handicap,
		IsAdmin:   isAdmin,
		CreatedAt: now,
	}, nil
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

func (s *Store) GetTournament(id int) (*models.Tournament, error) {
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
	now := time.Now().Format("2006-01-02 15:04:05")
	result, err := s.DB.Exec(`
		INSERT INTO tournaments (name, course_id, format_id, team_count, awarded_handicap, is_match_play, start_time, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, req.Name, req.CourseID, req.FormatID, req.TeamCount, req.AwardedHandicap, req.IsMatchPlay, req.StartTime, now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.Tournament{
		ID:              int(id),
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

func (s *Store) CreateTeam(tournamentID int, name string) (int, error) {
	result, err := s.DB.Exec("INSERT INTO teams (name, tournament_id, started, finished, created_at) VALUES (?, ?, 0, 0, ?)",
		name, tournamentID, time.Now().Format("2006-01-02 15:04:05"))
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

func (s *Store) AddPlayerToTeam(teamID, playerID, tournamentID int) error {
	_, err := s.DB.Exec("INSERT INTO team_players (team_id, player_id) VALUES (?, ?, ?)", teamID, playerID)
	return err
}

func (s *Store) GetTeamsByTournament(tournamentID int) ([]models.Team, error) {
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

func (s *Store) GetTeam(id int) (*models.Team, error) {
	var t models.Team
	err := s.DB.QueryRow("SELECT id, name, tournament_id, started, finished FROM teams WHERE id = ?", id).
		Scan(&t.ID, &t.Name, &t.TournamentID, &t.Started, &t.Finished)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *Store) GetTeamPlayers(teamID int) ([]models.Player, error) {
	query := `
		SELECT p.id, p.name, p.handicap, p.is_admin, p.created_at, tp.tee
		FROM players p
		JOIN team_players tp ON tp.player_id = p.id
		WHERE tp.team_id = ?
	`
	rows, err := s.DB.Query(query, teamID)
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

// -- Courses --

func (s *Store) GetAllCourses() ([]models.Course, error) {
	rows, err := s.DB.Query("SELECT id, name FROM courses")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []models.Course
	for rows.Next() {
		var c models.Course
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			return nil, err
		}
		// Populate Meta/Holes from course_holes table
		// Defaulting to "Mens" tee for the summary view if needed, or leave empty
		// For summary list, we might not need full hole data.
		courses = append(courses, c)
	}
	return courses, nil
}

func (s *Store) GetCourseByTournamentID(tournamentID int) (*models.Course, error) {
	var c models.Course
	err := s.DB.QueryRow(`
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
	// We need to know which Tee Set to fetch.
	// For now, we will fetch "Mens" as default, or ALL.
	// The client expects `Holes []HoleData`.
	// Let's fetch "Mens" for now to satisfy the interface.
	// Ideally, the Tournament should have a "Tee" setting, or Players have Tees.
	// The client `ScoreCard` expects a single set of holes for the course info.

	holesQuery := `
		SELECT id, hole_number, par, handicap, hole_index, yardage 
		FROM course_holes 
		WHERE course_id = ? AND tee_set = 'Mens' 
		ORDER BY hole_number ASC
	`
	hRows, err := s.DB.Query(holesQuery, c.ID)
	if err != nil {
		return nil, err
	}
	defer hRows.Close()

	var holes []models.HoleData
	for hRows.Next() {
		var h models.HoleData
		if err := hRows.Scan(&h.ID, &h.Number, &h.Par, &h.Handicap, &h.HoleIndex, &h.Yardage); err != nil {
			return nil, err
		}
		holes = append(holes, h)
	}

	c.Meta = models.CourseMeta{
		Holes: holes,
		Tees:  []string{"Mens"}, // TODO: Fetch available tees dynamically
	}

	return &c, nil
}

// -- Active Players --

func (s *Store) GetAvailablePlayers(tournamentID int) ([]models.Player, error) {
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

func (s *Store) GetAvailablePlayerById(tournamentID int, playerId int) (*models.ActiveTournamentPlayer, error) {
	query := `
		SELECT player_id, tournament_id, created_at FROM active_tournament_players WHERE tournament_id = ? AND player_id = ?
	`
	var state models.ActiveTournamentPlayer
	err := s.DB.QueryRow(query, tournamentID, playerId).Scan(&state.PlayerId, &state.TournamentId, &state.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &state, nil
}

func (s *Store) SelectPlayer(tournamentID, playerID int) error {
	// Attempt to claim player
	_, err := s.DB.Exec(`
		INSERT INTO active_tournament_players (tournament_id, player_id) 
		VALUES (?, ?)
	`, tournamentID, playerID)
	return err
}

func (s *Store) RemoveActivePlayer(tournamentID, playerID int) error {
	_, err := s.DB.Exec(`
		DELETE FROM active_tournament_players 
		WHERE tournament_id = ? AND player_id = ?
	`, tournamentID, playerID)
	return err
}

// -- Invites --

func (s *Store) CreateInvite(tournamentID, teamID int) (*models.Invite, error) {
	token := uuid.New().String()
	// Expires in 7 days
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour).Format(time.RFC3339)
	createdAt := time.Now().UTC().Format(time.RFC3339)

	_, err := s.DB.Exec(`
		INSERT INTO invites (token, tournament_id, team_id, expires_at, created_at, active)
		VALUES (?, ?, ?, ?, ?, 1)
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
		Active:       true,
	}, nil
}

func (s *Store) GetInvite(token string) (*models.Invite, error) {
	var i models.Invite
	var teamID sql.NullInt64
	var active sql.NullBool
	err := s.DB.QueryRow("SELECT token, tournament_id, team_id, expires_at, created_at, active FROM invites WHERE token = ?", token).
		Scan(&i.Token, &i.TournamentID, &teamID, &i.ExpiresAt, &i.CreatedAt, &active)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	i.TeamID = int(teamID.Int64)
	if active.Valid {
		i.Active = active.Bool
	} else {
		// Default to active if null (for legacy records before column addition if any, though migration sets default)
		i.Active = true
	}
	return &i, nil
}

// -- Scores --

func (s *Store) GetScores(tournamentID int, playerID, teamID *int) ([]models.Score, error) {
	query := `
		SELECT s.id, s.tournament_id, s.player_id, s.team_id, s.course_hole_id, s.strokes, s.created_at, ch.hole_number
		FROM scores s
		JOIN course_holes ch ON s.course_hole_id = ch.id
		WHERE s.tournament_id = ?
	`
	args := []interface{}{tournamentID}

	if playerID != nil {
		query += " AND s.player_id = ?"
		args = append(args, *playerID)
	}
	if teamID != nil {
		query += " AND s.team_id = ?"
		args = append(args, *teamID)
	}

	rows, err := s.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scores []models.Score
	for rows.Next() {
		var sc models.Score
		var createdStr string
		var pID sql.NullInt64
		var tID sql.NullInt64

		if err := rows.Scan(&sc.ID, &sc.TournamentID, &pID, &tID, &sc.CourseHoleID, &sc.Strokes, &createdStr, &sc.HoleNumber); err != nil {
			return nil, err
		}
		sc.CreatedAt = createdStr
		if pID.Valid {
			pid := int(pID.Int64)
			sc.PlayerID = &pid
		}
		if tID.Valid {
			tid := int(tID.Int64)
			sc.TeamID = &tid
		}
		scores = append(scores, sc)
	}
	return scores, nil
}

func (s *Store) SubmitScore(req models.SubmitScoreRequest) (*models.Score, error) {
	// 1. Check if score exists using the same logic as the unique index
	var id int64
	playerIDVal := -1
	if req.PlayerID != nil {
		playerIDVal = *req.PlayerID
	}
	teamIDVal := -1
	if req.TeamID != nil {
		teamIDVal = *req.TeamID
	}

	err := s.DB.QueryRow(`
		SELECT id FROM scores 
		WHERE tournament_id = ? 
		  AND IFNULL(player_id, -1) = ? 
		  AND IFNULL(team_id, -1) = ? 
		  AND course_hole_id = ?
	`, req.TournamentID, playerIDVal, teamIDVal, req.CourseHoleID).Scan(&id)

	now := time.Now().Format("2006-01-02 15:04:05")

	if err == sql.ErrNoRows {
		// INSERT
		res, err := s.DB.Exec(`
			INSERT INTO scores (tournament_id, player_id, team_id, course_hole_id, strokes, created_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`, req.TournamentID, req.PlayerID, req.TeamID, req.CourseHoleID, req.Strokes, now)
		if err != nil {
			return nil, err
		}
		id, err = res.LastInsertId()
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// UPDATE
		_, err := s.DB.Exec(`
			UPDATE scores 
			SET strokes = ?
			WHERE id = ?
		`, req.Strokes, id)
		if err != nil {
			return nil, err
		}
	}

	return &models.Score{
		ID:           int(id),
		TournamentID: req.TournamentID,
		PlayerID:     req.PlayerID,
		TeamID:       req.TeamID,
		CourseHoleID: req.CourseHoleID,
		Strokes:      req.Strokes,
		CreatedAt:    now,
	}, nil
}
