package store

import (
	"context"
	"database/sql"
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

func (s *Store) GetAllFormats() ([]models.TournamentFormat, error) {
	formats, err := s.Queries.GetAllFormats(context.Background())
	if err != nil {
		return nil, err
	}

	var result []models.TournamentFormat
	for _, f := range formats {
		result = append(result, models.TournamentFormat{
			ID:          int(f.ID),
			Name:        f.Name,
			Description: f.Description.String,
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

// -- Tournaments --

func (s *Store) GetAllTournaments() ([]models.Tournament, error) {
	tournaments, err := s.Queries.GetAllTournaments(context.Background())
	if err != nil {
		return nil, err
	}

	var result []models.Tournament
	for _, t := range tournaments {
		var startTime string
		if t.StartTime.Valid {
			startTime = t.StartTime.Time.Format("2006-01-02 15:04:05")
		}
		var createdAt string
		if t.CreatedAt.Valid {
			createdAt = t.CreatedAt.Time.Format("2006-01-02 15:04:05")
		}

		result = append(result, models.Tournament{
			ID:              int(t.ID),
			Name:            t.Name,
			CourseID:        int(t.CourseID.Int64),
			FormatID:        int(t.FormatID.Int64),
			TeamCount:       int(t.TeamCount.Int64),
			AwardedHandicap: t.AwardedHandicap.Float64,
			IsMatchPlay:     t.IsMatchPlay.Bool,
			Complete:        t.Complete.Bool,
			StartTime:       startTime,
			CreatedAt:       createdAt,
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

	var startTime string
	if t.StartTime.Valid {
		startTime = t.StartTime.Time.Format("2006-01-02 15:04:05")
	}
	var createdAt string
	if t.CreatedAt.Valid {
		createdAt = t.CreatedAt.Time.Format("2006-01-02 15:04:05")
	}

	return &models.Tournament{
		ID:              int(t.ID),
		Name:            t.Name,
		CourseID:        int(t.CourseID.Int64),
		FormatID:        int(t.FormatID.Int64),
		TeamCount:       int(t.TeamCount.Int64),
		AwardedHandicap: t.AwardedHandicap.Float64,
		IsMatchPlay:     t.IsMatchPlay.Bool,
		Complete:        t.Complete.Bool,
		StartTime:       startTime,
		CreatedAt:       createdAt,
	}, nil
}

func (s *Store) CreateTournament(req models.CreateTournamentRequest) (*models.Tournament, error) {
	// Parse StartTime if provided
	var startTime sql.NullTime
	if req.StartTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.StartTime)
		if err == nil {
			startTime = sql.NullTime{Time: parsed, Valid: true}
		}
	}
	now := time.Now()

	t, err := s.Queries.CreateTournament(context.Background(), db.CreateTournamentParams{
		Name:            req.Name,
		CourseID:        sql.NullInt64{Int64: int64(req.CourseID), Valid: true},
		FormatID:        sql.NullInt64{Int64: int64(req.FormatID), Valid: true},
		TeamCount:       sql.NullInt64{Int64: int64(req.TeamCount), Valid: true},
		AwardedHandicap: sql.NullFloat64{Float64: req.AwardedHandicap, Valid: true},
		IsMatchPlay:     sql.NullBool{Bool: req.IsMatchPlay, Valid: true},
		StartTime:       startTime,
		CreatedAt:       sql.NullTime{Time: now, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	return &models.Tournament{
		ID:              int(t.ID),
		Name:            t.Name,
		CourseID:        int(t.CourseID.Int64),
		FormatID:        int(t.FormatID.Int64),
		TeamCount:       int(t.TeamCount.Int64),
		AwardedHandicap: t.AwardedHandicap.Float64,
		IsMatchPlay:     t.IsMatchPlay.Bool,
		Complete:        t.Complete.Bool,
		StartTime:       req.StartTime,
		CreatedAt:       now.Format("2006-01-02 15:04:05"),
	}, nil
}

// -- Teams --

func (s *Store) CreateTeam(tournamentID int, name string) (int, error) {
	id, err := s.Queries.CreateTeam(context.Background(), db.CreateTeamParams{
		Name:         name,
		TournamentID: sql.NullInt64{Int64: int64(tournamentID), Valid: true},
		CreatedAt:    sql.NullTime{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return 0, err
	}
	return int(id), nil
}

func (s *Store) AddPlayerToTeam(teamID, playerID, tournamentID int) error {
	err := s.Queries.AddPlayerToTeam(context.Background(), db.AddPlayerToTeamParams{
		TeamID:   sql.NullInt64{Int64: int64(teamID), Valid: true},
		PlayerID: sql.NullInt64{Int64: int64(playerID), Valid: true},
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
			Started:      t.Started.Bool,
			Finished:     t.Finished.Bool,
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
		Started:      t.Started.Bool,
		Finished:     t.Finished.Bool,
	}, nil
}

func (s *Store) GetTeamPlayers(teamID int) ([]models.Player, error) {
	dbPlayers, err := s.Queries.GetTeamPlayers(context.Background(), sql.NullInt64{Int64: int64(teamID), Valid: true})
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
			Tee:       p.Tee.String,
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

func (s *Store) GetCourseByTournamentID(tournamentID int) (*models.Course, error) {
	c, err := s.Queries.GetCourseByTournamentID(context.Background(), int64(tournamentID))
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

// -- Active Players --

func (s *Store) GetAvailablePlayers(tournamentID int) ([]models.AvailablePlayer, error) {
	dbPlayers, err := s.Queries.GetAvailablePlayers(context.Background(), db.GetAvailablePlayersParams{
		TournamentID:   sql.NullInt64{Int64: int64(tournamentID), Valid: true},
		TournamentID_2: int64(tournamentID),
	})
	if err != nil {
		return nil, err
	}

	var players []models.AvailablePlayer
	for _, p := range dbPlayers {
		players = append(players, models.AvailablePlayer{
			PlayerID:     int(p.PlayerID),
			Name:         p.Name,
			TeamID:       int(p.TeamID),
			TournamentID: int(p.TournamentID.Int64),
			Handicap:     float32(p.Handicap.Float64),
		})
	}
	return players, nil
}

func (s *Store) GetAvailablePlayerById(tournamentID int, playerId int) (*models.AvailablePlayer, error) {
	p, err := s.Queries.GetAvailablePlayerById(context.Background(), db.GetAvailablePlayerByIdParams{
		TournamentID: sql.NullInt64{
			Int64: int64(tournamentID),
			Valid: true,
		},
		PlayerID: sql.NullInt64{
			Int64: int64(playerId),
			Valid: true,
		},
	})
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &models.AvailablePlayer{
		PlayerID:     int(p.PlayerID),
		Name:         p.Name,
		TeamID:       int(p.TeamID),
		Handicap:     float32(p.Handicap.Float64),
		TournamentID: int(p.TournamentID.Int64),
	}, nil
}

func (s *Store) SelectPlayer(tournamentID, playerID int) error {
	return s.Queries.SelectPlayer(context.Background(), db.SelectPlayerParams{
		TournamentID: int64(tournamentID),
		PlayerID:     int64(playerID),
	})
}

func (s *Store) RemoveActivePlayer(tournamentID, playerID int) error {
	return s.Queries.RemoveActivePlayer(context.Background(), db.RemoveActivePlayerParams{
		TournamentID: int64(tournamentID),
		PlayerID:     int64(playerID),
	})
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

func (s *Store) GetScores(tournamentID int, playerID, teamID *int) ([]models.Score, error) {
	var pid interface{}
	if playerID != nil {
		pid = int64(*playerID)
	}
	var tid interface{}
	if teamID != nil {
		tid = int64(*teamID)
	}

	scores, err := s.Queries.GetScores(context.Background(), db.GetScoresParams{
		TournamentID: int64(tournamentID),
		PlayerID:     pid,
		TeamID:       tid,
	})
	if err != nil {
		return nil, err
	}

	var result []models.Score
	for _, sc := range scores {
		var pID *int
		if sc.PlayerID.Valid {
			v := int(sc.PlayerID.Int64)
			pID = &v
		}
		var tID *int
		if sc.TeamID.Valid {
			v := int(sc.TeamID.Int64)
			tID = &v
		}

		createdStr := ""
		if sc.CreatedAt.Valid {
			createdStr = sc.CreatedAt.Time.Format("2006-01-02 15:04:05")
		}

		result = append(result, models.Score{
			ID:           int(sc.ID),
			TournamentID: int(sc.TournamentID),
			PlayerID:     pID,
			TeamID:       tID,
			CourseHoleID: int(sc.CourseHoleID),
			HoleNumber:   int(sc.HoleNumber),
			Strokes:      int(sc.Strokes),
			CreatedAt:    createdStr,
		})
	}
	return result, nil
}

func (s *Store) SubmitScore(req models.SubmitScoreRequest) (*models.Score, error) {
	ctx := context.Background()

	// Start Transaction
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	q := s.Queries.WithTx(tx)

	// 1. Check if score exists using the same logic as the unique index
	var pid interface{}
	if req.PlayerID != nil {
		pid = int64(*req.PlayerID)
	}
	var tid interface{}
	if req.TeamID != nil {
		tid = int64(*req.TeamID)
	}

	id, err := q.GetScoreByUniqueKey(ctx, db.GetScoreByUniqueKeyParams{
		TournamentID: int64(req.TournamentID),
		PlayerID:     pid,
		TeamID:       tid,
		CourseHoleID: int64(req.CourseHoleID),
	})

	now := time.Now()
	var scoreID int64

	if err == sql.ErrNoRows {
		// INSERT
		var pID sql.NullInt64
		if req.PlayerID != nil {
			pID = sql.NullInt64{Int64: int64(*req.PlayerID), Valid: true}
		}
		var tID sql.NullInt64
		if req.TeamID != nil {
			tID = sql.NullInt64{Int64: int64(*req.TeamID), Valid: true}
		}

		scoreID, err = q.InsertScore(ctx, db.InsertScoreParams{
			TournamentID: int64(req.TournamentID),
			PlayerID:     pID,
			TeamID:       tID,
			CourseHoleID: int64(req.CourseHoleID),
			Strokes:      int64(req.Strokes),
			CreatedAt:    sql.NullTime{Time: now, Valid: true},
		})
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	// UPDATE
	scoreID = id
	err = q.UpdateScore(ctx, db.UpdateScoreParams{
		Strokes: int64(req.Strokes),
		ID:      id,
	})
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &models.Score{
		ID:           int(scoreID),
		TournamentID: req.TournamentID,
		PlayerID:     req.PlayerID,
		TeamID:       req.TeamID,
		CourseHoleID: req.CourseHoleID,
		Strokes:      req.Strokes,
		CreatedAt:    now.Format("2006-01-02 15:04:05"),
	}, nil
}
