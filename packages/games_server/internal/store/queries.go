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

// Wrapper struct to hang methods off of
type Store struct {
	DB      *sql.DB
	Queries *db.Queries
}

func NewStore(conn *sql.DB) *Store {
	return &Store{
		DB:      conn,
		Queries: db.New(conn),
	}
}

// -- Formats --

func (s *Store) GetTournamentFormats(tournamentId int) ([]models.TournamentFormat, error) {
	formats, err := s.Queries.GetTournamentFormats(context.Background(), int64(tournamentId))
	if err != nil {
		return nil, err
	}

	var result []models.TournamentFormat
	for _, f := range formats {
		result = append(result, models.TournamentFormat{
			ID:            int(f.ID),
			Name:          f.Name,
			Description:   f.Description.String,
			IsTeamScoring: f.IsTeamScoring.Bool,
		})
	}
	return result, nil
}

func (s *Store) GetAllFormats() ([]models.TournamentFormat, error) {
	formats, err := s.Queries.GetAllFormats(context.Background())
	if err != nil {
		return nil, err
	}

	var result []models.TournamentFormat
	for _, f := range formats {
		result = append(result, models.TournamentFormat{
			ID:            int(f.ID),
			Name:          f.Name,
			Description:   f.Description.String,
			IsTeamScoring: f.IsTeamScoring.Bool,
		})
	}
	return result, nil
}

// -- Players --

func (s *Store) GetPlayer(id int) (*models.Player, error) {
	p, err := s.Queries.GetPlayer(context.Background(), int64(id))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &models.Player{
		ID:        int(p.ID),
		Name:      p.Name,
		Handicap:  p.Handicap.Float64,
		IsAdmin:   p.IsAdmin.Bool,
		CreatedAt: p.CreatedAt.Time,
	}, nil
}

func (s *Store) GetAllPlayers() ([]models.Player, error) {
	dbPlayers, err := s.Queries.GetAllPlayers(context.Background())
	if err != nil {
		return nil, err
	}

	var players []models.Player
	for _, p := range dbPlayers {
		players = append(players, models.Player{
			ID:        int(p.ID),
			Name:      p.Name,
			Handicap:  p.Handicap.Float64,
			IsAdmin:   p.IsAdmin.Bool,
			CreatedAt: p.CreatedAt.Time,
		})
	}
	return players, nil
}

func (s *Store) CreatePlayer(name string, handicap float64, isAdmin bool) (*models.Player, error) {
	p, err := s.Queries.CreatePlayer(context.Background(), db.CreatePlayerParams{
		Name:      name,
		Handicap:  sql.NullFloat64{Float64: handicap, Valid: true},
		IsAdmin:   sql.NullBool{Bool: isAdmin, Valid: true},
		CreatedAt: sql.NullTime{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return nil, err
	}

	return &models.Player{
		ID:        int(p.ID),
		Name:      p.Name,
		Handicap:  p.Handicap.Float64,
		IsAdmin:   p.IsAdmin.Bool,
		CreatedAt: p.CreatedAt.Time,
	}, nil
}

// -- Tournaments --`	`
func (s *Store) GetTournamentById(tournamentID int) (*models.Tournament, error) {
	t, err := s.Queries.GetTournament(context.Background(), int64(tournamentID))
	if err != nil {
		return nil, err
	}

	return &models.Tournament{
		ID:        int(t.ID),
		Name:      t.Name,
		TeamCount: int(t.TeamCount),
		Complete:  t.Complete,
		StartDate: t.StartDate.String(),
		EndDate:   t.EndDate.String(),
	}, nil
}

func (s *Store) GetAllTournaments() ([]models.Tournament, error) {
	tournaments, err := s.Queries.GetAllTournaments(context.Background())
	if err != nil {
		return nil, err
	}

	var result []models.Tournament
	for _, t := range tournaments {
		var createdAt string
		if t.CreatedAt.Valid {
			createdAt = t.CreatedAt.Time.Format("2006-01-02 15:04:05")
		}

		result = append(result, models.Tournament{
			ID:        int(t.ID),
			Name:      t.Name,
			TeamCount: int(t.TeamCount),
			Complete:  t.Complete,
			StartDate: t.StartDate.String(),
			EndDate:   t.EndDate.String(),
			CreatedAt: createdAt,
		})
	}
	return result, nil
}

func (s *Store) GetTournament(id int) (*models.Tournament, error) {
	t, err := s.Queries.GetTournament(context.Background(), int64(id))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &models.Tournament{
		ID:        int(t.ID),
		Name:      t.Name,
		TeamCount: int(t.TeamCount),
		Complete:  t.Complete,
		StartDate: t.StartDate.String(),
		EndDate:   t.EndDate.String(),
		CreatedAt: t.CreatedAt.Time.String(),
	}, nil
}

func (s *Store) CreateTournament(req models.CreateTournamentRequest) (*models.Tournament, error) {
	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, err
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, err
	}

	t, err := s.Queries.CreateTournament(context.Background(), db.CreateTournamentParams{
		Name:      req.Name,
		TeamCount: int64(req.TeamCount),
		StartDate: startDate,
		EndDate:   endDate,
		CreatedAt: sql.NullTime{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return nil, err
	}

	tournament := &models.Tournament{
		ID:        int(t.ID),
		Name:      t.Name,
		TeamCount: int(t.TeamCount),
		Complete:  t.Complete,
		StartDate: t.StartDate.String(),
		EndDate:   t.EndDate.String(),
		CreatedAt: t.CreatedAt.Time.Format("2006-01-02 15:04:05"),
	}

	return tournament, nil
}

// -- Teams --

func (s *Store) CreateTeam(tournamentID int, name string) (int, error) {
	team, err := s.Queries.CreateTeam(context.Background(), db.CreateTeamParams{
		Name:         name,
		TournamentID: sql.NullInt64{Int64: int64(tournamentID), Valid: true},
	})
	if err != nil {
		return 0, err
	}
	return int(team.ID), nil
}

func (s *Store) AddPlayerToTeam(teamID, playerID, tournamentID int) error {
	err := s.Queries.AddPlayerToTeam(context.Background(), db.AddPlayerToTeamParams{
		TeamID: int64(teamID),
		ID:     int64(playerID),
	})
	return err
}

func (s *Store) GetTeamsByTournament(tournamentID int) ([]models.Team, error) {
	teams, err := s.Queries.GetTeamsByTournament(context.Background(), sql.NullInt64{Int64: int64(tournamentID), Valid: true})
	if err != nil {
		return nil, err
	}

	var result []models.Team
	for _, t := range teams {
		result = append(result, models.Team{
			ID:           int(t.ID),
			Name:         t.Name,
			TournamentID: int(t.TournamentID.Int64),
		})
	}
	return result, nil
}

func (s *Store) GetTeam(id int) (*models.Team, error) {
	t, err := s.Queries.GetTeam(context.Background(), int64(id))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &models.Team{
		ID:           int(t.ID),
		Name:         t.Name,
		TournamentID: int(t.TournamentID.Int64),
	}, nil
}

func (s *Store) GetTeamPlayers(teamID int) ([]models.Player, error) {
	dbPlayers, err := s.Queries.GetTeamPlayers(context.Background(), int64(teamID))
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

// -- Courses --

func (s *Store) GetAllCourses() ([]models.Course, error) {
	dbCourses, err := s.Queries.GetAllCourses(context.Background())
	if err != nil {
		return nil, err
	}

	var courses []models.Course
	for _, c := range dbCourses {
		courses = append(courses, models.Course{
			ID:   int(c.ID),
			Name: c.Name,
		})
	}
	return courses, nil
}

func (s *Store) GetCourseByTournamentRoundID(tournamentID int) (*models.Course, error) {
	c, err := s.Queries.GetCourseByTournamentRoundID(context.Background(), int64(tournamentID))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	hRows, err := s.Queries.GetCourseHoles(context.Background(), c.ID)
	if err != nil {
		return nil, err
	}

	percentage := c.AwardedHandicap.Float64
	if percentage == 0 {
		percentage = 1.0
	}

	var holes []models.HoleData
	for _, h := range hRows {
		rawHandicap := int(h.Handicap)
		holes = append(holes, models.HoleData{
			ID:              int(h.ID),
			Number:          int(h.HoleNumber),
			Par:             int(h.Par),
			Handicap:        int(h.Handicap),
			RawHandicap:     rawHandicap,
			AllowedHandicap: c.AwardedHandicap.Float64,
			Yardage:         int(h.Yardage),
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

// -- Active Players --

func (s *Store) GetAvailablePlayers(tournamentID int) ([]models.AvailablePlayer, error) {
	dbPlayers, err := s.Queries.GetAvailablePlayers(context.Background(), int64(tournamentID))
	if err != nil {
		return nil, err
	}

	var players []models.AvailablePlayer
	for _, p := range dbPlayers {
		players = append(players, models.AvailablePlayer{
			PlayerID:     int(p.ID),
			Name:         p.Name,
			TeamID:       int(p.TeamID),
			TournamentID: int(p.TournamentID),
			Handicap:     float32(p.Handicap.Float64),
		})
	}
	return players, nil
}

func (s *Store) GetAvailablePlayerById(playerId int) (*models.AvailablePlayer, error) {
	p, err := s.Queries.GetAvailablePlayerById(context.Background(), int64(playerId))

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &models.AvailablePlayer{

		PlayerID:     int(p.ID),
		Name:         p.Name,
		TeamID:       int(p.TeamID),
		Handicap:     float32(p.Handicap.Float64),
		TournamentID: int(p.TournamentID),
	}, nil
}

func (s *Store) ClaimPlayer(tournamentID, playerID int) error {
	return s.Queries.ClaimPlayer(context.Background(), int64(playerID))
}

func (s *Store) UnclaimPlayer(tournamentID, playerID int) error {
	return s.Queries.UnclaimPlayer(context.Background(), int64(playerID))
}

// -- Invites --

func (s *Store) CreateInvite(tournamentID, teamID int) (*models.Invite, error) {
	token := uuid.New().String()
	// Expires in 7 days
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	createdAt := time.Now().UTC()

	i, err := s.Queries.CreateInvite(context.Background(), db.CreateInviteParams{
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

func (s *Store) GetInvite(token string) (*models.Invite, error) {
	i, err := s.Queries.GetInvite(context.Background(), sql.NullString{String: token, Valid: true})
	if err == sql.ErrNoRows {
		return nil, nil
	}
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

// -- Scores --
func (s *Store) GetTournamentScores(tournamentID int, playerID *int, teamID *int) ([]models.Score, error) {
	var pid interface{}
	if playerID != nil {
		pid = int64(*playerID)
	}
	var tid interface{}
	if teamID != nil {
		tid = int64(*teamID)
	}

	scores, err := s.Queries.GetTournamentScores(context.Background(), db.GetTournamentScoresParams{
		TournamentID: int64(tournamentID),
		PlayerID:     pid,
		TeamID:       tid,
	})
	if err != nil {
		return nil, err
	}

	var result []models.Score
	for _, sc := range scores {
		s := models.Score{
			ID:           int(sc.ID),
			CourseHoleID: int(sc.CourseHoleID),
			Strokes:      int(sc.Strokes),
			HoleNumber:   int(sc.HoleNumber),
			CreatedAt:    sc.CreatedAt.Time.Format("2006-01-02 15:04:05"),
		}

		// Set tournament round ID
		roundId := int(sc.TournamentRoundID)
		s.TournamentRoundID = &roundId

		// Set optional fields
		if sc.PlayerID.Valid {
			playerId := int(sc.PlayerID.Int64)
			s.PlayerID = &playerId
		}
		if sc.TeamID.Valid {
			teamId := int(sc.TeamID.Int64)
			s.TeamID = &teamId
		}

		result = append(result, s)
	}
	return result, nil
}

func (s *Store) GetRoundScores(tournamentRoundID int, playerID, teamID *int) ([]models.Score, error) {
	var pid interface{}
	if playerID != nil {
		pid = int64(*playerID)
	}
	var tid interface{}
	if teamID != nil {
		tid = int64(*teamID)
	}

	scores, err := s.Queries.GetRoundScores(context.Background(), db.GetRoundScoresParams{
		TournamentRoundID: int64(tournamentRoundID),
		PlayerID:          pid,
		TeamID:            tid,
	})
	if err != nil {
		return nil, err
	}

	var result []models.Score
	for _, sc := range scores {
		var pID *int
		if sc.PlayerID.Valid {
			id := int(sc.PlayerID.Int64)
			pID = &id
		}
		var tID *int
		if sc.TeamID.Valid {
			id := int(sc.TeamID.Int64)
			tID = &id
		}

		var createdStr string
		if sc.CreatedAt.Valid {
			createdStr = sc.CreatedAt.Time.Format("2006-01-02 15:04:05")
		}

		roundId := int(sc.TournamentRoundID)
		result = append(result, models.Score{
			ID:                int(sc.ID),
			TournamentRoundID: &roundId,
			PlayerID:          pID,
			TeamID:            tID,
			CourseHoleID:      int(sc.CourseHoleID),
			HoleNumber:        int(sc.HoleNumber),
			Strokes:           int(sc.Strokes),
			CreatedAt:         createdStr,
		})
	}
	return result, nil
}

func (s *Store) SubmitScore(req models.SubmitScoreRequest) (*models.Score, error) {
	// For backward compatibility, if TournamentID is provided, find the active round
	var roundID int
	if req.RoundID != nil {
		roundID = *req.RoundID
	} else if req.TournamentID != 0 {
		// Find the active round for this tournament
		rounds, err := s.GetTournamentRounds(req.TournamentID)
		if err != nil {
			return nil, err
		}
		// Find active round, or default to first round
		activeRound := rounds[0] // Default to first round
		for _, r := range rounds {
			if r.Status == "active" {
				activeRound = r
				break
			}
		}
		roundID = activeRound.ID
	} else {
		return nil, fmt.Errorf("either tournamentId or roundId must be provided")
	}

	// Use the round-specific submission
	roundReq := models.SubmitRoundScoreRequest{
		PlayerID:     req.PlayerID,
		TeamID:       req.TeamID,
		CourseHoleID: req.CourseHoleID,
		Strokes:      req.Strokes,
	}

	err := s.SubmitRoundScore(roundID, roundReq)
	if err != nil {
		return nil, err
	}

	// Return a score object for compatibility
	return &models.Score{
		TournamentRoundID: &roundID,
		PlayerID:          req.PlayerID,
		TeamID:            req.TeamID,
		CourseHoleID:      req.CourseHoleID,
		Strokes:           req.Strokes,
		CreatedAt:         time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// -- Tournament Rounds --

func (s *Store) GetTournamentRounds(tournamentID int) ([]models.TournamentRound, error) {
	rounds, err := s.Queries.GetTournamentRounds(context.Background(), int64(tournamentID))
	if err != nil {
		return nil, err
	}

	var result []models.TournamentRound
	for _, r := range rounds {
		var createdAt string
		if r.CreatedAt.Valid {
			createdAt = r.CreatedAt.Time.Format("2006-01-02 15:04:05")
		}

		result = append(result, models.TournamentRound{
			ID:           int(r.ID),
			TournamentID: int(r.TournamentID),
			RoundNumber:  int(r.RoundNumber),
			Date:         r.Date.String(),
			CourseID:     int(r.CourseID),
			Name:         r.Name,
			Status:       r.Status.String,
			CreatedAt:    createdAt,
		})
	}
	return result, nil
}

func (s *Store) GetTournamentRound(roundID int) (*models.TournamentRound, error) {
	r, err := s.Queries.GetTournamentRound(context.Background(), int64(roundID))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var createdAt string
	if r.CreatedAt.Valid {
		createdAt = r.CreatedAt.Time.Format("2006-01-02 15:04:05")
	}

	return &models.TournamentRound{
		ID:           int(r.ID),
		TournamentID: int(r.TournamentID),
		RoundNumber:  int(r.RoundNumber),
		Date:         r.Date.String(),
		CourseID:     int(r.CourseID),
		Name:         r.Name,
		Status:       r.Status.String,
		CourseName:   r.CourseName,
		CreatedAt:    createdAt,
	}, nil
}

func (s *Store) CreateTournamentRound(tournamentID int, req models.CreateRoundRequest) (*models.TournamentRound, error) {
	roundDate, err := time.Parse("2006-01-02", req.RoundDate)
	if err != nil {
		return nil, err
	}

	r, err := s.Queries.CreateTournamentRound(context.Background(), db.CreateTournamentRoundParams{
		TournamentID: int64(tournamentID),
		RoundNumber:  int64(req.RoundNumber),
		Date:         roundDate,
		CourseID:     int64(req.CourseID),
		Name:         req.Name,
		Status:       sql.NullString{String: "pending", Valid: true},
	})
	if err != nil {
		return nil, err
	}

	return &models.TournamentRound{
		ID:           int(r.ID),
		TournamentID: int(r.TournamentID),
		RoundNumber:  int(r.RoundNumber),
		Date:         r.Date.String(),
		CourseID:     int(r.CourseID),
		Name:         r.Name,
		Status:       r.Status.String,
	}, nil
}

func (s *Store) SubmitRoundScore(roundID int, req models.SubmitRoundScoreRequest) error {
	ctx := context.Background()

	// Start Transaction
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	q := s.Queries.WithTx(tx)

	// Check if score exists
	var pid interface{}
	if req.PlayerID != nil {
		pid = int64(*req.PlayerID)
	}
	var tid interface{}
	if req.TeamID != nil {
		tid = int64(*req.TeamID)
	}

	id, err := q.GetScoreByUniqueKey(ctx, db.GetScoreByUniqueKeyParams{
		TournamentRoundID: int64(roundID),
		PlayerID:          pid,
		TeamID:            tid,
		CourseHoleID:      int64(req.CourseHoleID),
	})

	if err == sql.ErrNoRows {
		// Insert new score
		var pID sql.NullInt64
		if req.PlayerID != nil {
			pID = sql.NullInt64{Int64: int64(*req.PlayerID), Valid: true}
		}
		var tID sql.NullInt64
		if req.TeamID != nil {
			tID = sql.NullInt64{Int64: int64(*req.TeamID), Valid: true}
		}

		_, err = q.InsertScore(ctx, db.InsertScoreParams{
			TournamentRoundID: int64(roundID),
			PlayerID:          pID,
			TeamID:            tID,
			CourseHoleID:      int64(req.CourseHoleID),
			Strokes:           int64(req.Strokes),
			CreatedAt:         sql.NullTime{Time: time.Now(), Valid: true},
		})
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	} else {
		// Update existing score
		err = q.UpdateScore(ctx, db.UpdateScoreParams{
			Strokes: int64(req.Strokes),
			ID:      id,
		})
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
