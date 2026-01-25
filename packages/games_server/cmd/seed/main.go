package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/patrick-salvatore/games-server/internal/store"
	db "github.com/patrick-salvatore/games-server/models"
)

func main() {
	dbPath := "golf.db"
	sqlDB, err := store.New(dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer sqlDB.Close()

	if err := store.InitSchema(sqlDB); err != nil {
		log.Fatalf("Failed to init schema: %v", err)
	}

	s := store.NewStore(sqlDB)
	ctx := context.Background()

	// Begin transaction
	tx, err := sqlDB.Begin()
	if err != nil {
		log.Fatalf("Failed to begin transaction: %v", err)
	}

	defer func() {
		if p := recover(); p != nil {
			log.Printf("[PANIC] Seed failed, rolling back: %v", p)
			tx.Rollback()
		}
	}()

	now := time.Now()
	nowStr := now.Format("2006-01-02 15:04:05")
	q := db.New(tx)

	// ------------------------
	// 1. Seed Tournament Formats
	// ------------------------
	formats := []struct {
		Name, Description string
	}{
		{"Scramble", "Teams play from the best shot selected after every stroke."},
		{"Shamble", "Teams play from the best drive, then each player plays their own ball into the hole."},
		{"2-Man Best Ball", "Teams of 2. The lowest score on the hole counts as the team score."},
		{"4-Man Best Ball", "Teams of 4. The lowest score on the hole counts as the team score."},
		{"Alternate Shot (Foursomes)", "Teammates take turns hitting the same ball until holed."},
		{"Individual Stroke Play", "Standard individual scoring. Every stroke counts."},
		{"Match Play", "Scoring is by hole won, lost, or halved, not total strokes."},
		{"Stableford", "Points awarded based on score relative to fixed score (usually par)."},
		{"Skins", "Players compete for a prize (skin) on each hole. Lowest score wins the skin."},
	}

	formatIDs := make(map[string]int64)
	log.Println("[INFO] Seeding tournament formats...")
	for _, f := range formats {
		log.Printf("[DEBUG] Inserting format: %s", f.Name)
		res, err := tx.Exec(`
			INSERT INTO tournament_formats (name, description, created_at)
			VALUES (?, ?, ?)
		`, f.Name, f.Description, nowStr)
		if err != nil {
			log.Printf("[ERROR] Seeding format %s: %v", f.Name, err)
			tx.Rollback()
			return
		}
		id, _ := res.LastInsertId()
		log.Printf("[DEBUG] Inserted format ID=%d", id)
		formatIDs[f.Name] = id
	}

	// ------------------------
	// 2. Seed Course
	// ------------------------
	log.Println("[INFO] Seeding course...")
	res, err := tx.Exec(`
		INSERT INTO courses (name, data, created_at) VALUES (?, ?, ?)
	`, "Pebble Beach (Seed)", "{}", nowStr) // data is legacy/unused for holes now
	if err != nil {
		log.Printf("[ERROR] Seeding course: %v", err)
		tx.Rollback()
		return
	}
	courseID, _ := res.LastInsertId()
	log.Printf("[DEBUG] Inserted course ID=%d", courseID)

	// Seed Course Tees
	res, err = tx.Exec(`
		INSERT INTO course_tees (course_id, name, created_at) VALUES (?, ?, ?)
	`, courseID, "Mens", nowStr)
	if err != nil {
		log.Printf("[ERROR] Seeding course tees: %v", err)
		tx.Rollback()
		return
	}
	teeID, _ := res.LastInsertId()
	log.Printf("[DEBUG] Inserted tee ID=%d", teeID)

	// Seed Course Holes (Mens Tee)
	for i := 0; i < 18; i++ {
		_, err := tx.Exec(`
			INSERT INTO course_holes (course_id, tee_set, hole_number, par, handicap, yardage, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, courseID, "Mens", i+1, 4, i+1, 350+(i*10), nowStr)
		if err != nil {
			log.Printf("[ERROR] Seeding hole %d: %v", i+1, err)
			tx.Rollback()
			return
		}
	}

	// ------------------------
	// 3. Seed Tournament
	// ------------------------
	log.Println("[INFO] Seeding tournament...")
	tournament, err := q.CreateTournament(ctx, db.CreateTournamentParams{
		Name:            "Seed Tournament",
		CourseID:        sql.NullInt64{Int64: courseID, Valid: true},
		FormatID:        sql.NullInt64{Int64: formatIDs["Scramble"], Valid: true},
		TeamCount:       sql.NullInt64{Int64: 4, Valid: true},
		AwardedHandicap: sql.NullFloat64{Float64: 1.0, Valid: true},
		IsMatchPlay:     sql.NullBool{Bool: false, Valid: true},
		StartTime:       sql.NullTime{Time: now, Valid: true},
		CreatedAt:       sql.NullTime{Time: now, Valid: true},
	})
	if err != nil {
		log.Printf("[ERROR] Seeding tournament: %v", err)
		tx.Rollback()
		return
	}
	tournamentID := tournament.ID
	log.Printf("[DEBUG] Inserted tournament ID=%d", tournamentID)

	// ------------------------
	// 4. Seed Teams (3 teams)
	// ------------------------
	log.Println("[INFO] Seeding teams...")

	teamA, err := q.CreateTeam(ctx, db.CreateTeamParams{
		Name:         "Team Alpha",
		TournamentID: sql.NullInt64{Int64: tournamentID, Valid: true},
	})
	if err != nil {
		log.Printf("[ERROR] Seeding Team Alpha: %v", err)
		tx.Rollback()
		return
	}
	teamAID := teamA.ID
	log.Printf("[DEBUG] Inserted Team Alpha ID=%d", teamAID)

	// Team Bravo
	teamB, err := q.CreateTeam(ctx, db.CreateTeamParams{
		Name:         "Team Bravo",
		TournamentID: sql.NullInt64{Int64: tournamentID, Valid: true},
	})
	if err != nil {
		log.Printf("[ERROR] Seeding Team Bravo: %v", err)
		tx.Rollback()
		return
	}
	teamBID := teamB.ID
	log.Printf("[DEBUG] Inserted Team Bravo ID=%d", teamBID)

	// Team Charlie
	teamC, err := q.CreateTeam(ctx, db.CreateTeamParams{
		Name:         "Team Charlie",
		TournamentID: sql.NullInt64{Int64: tournamentID, Valid: true},
	})
	if err != nil {
		log.Printf("[ERROR] Seeding Team Charlie: %v", err)
		tx.Rollback()
		return
	}
	teamCID := teamC.ID
	log.Printf("[DEBUG] Inserted Team Charlie ID=%d", teamCID)

	// ------------------------
	// 5. Seed Players (8 players, 1 admin)
	// ------------------------
	log.Println("[INFO] Seeding players...")
	playerIDs := make([]int64, 0)
	for i := 1; i <= 8; i++ {
		isAdmin := i == 1
		name := fmt.Sprintf("Player %d", i)

		// Determine team
		var teamID int64
		if i <= 3 {
			teamID = teamAID
		} else if i <= 6 {
			teamID = teamBID
		} else {
			teamID = teamCID
		}

		p, err := q.CreatePlayer(ctx, db.CreatePlayerParams{
			Name:         name,
			Handicap:     sql.NullFloat64{Float64: float64(10 + i), Valid: true},
			IsAdmin:      sql.NullBool{Bool: isAdmin, Valid: true},
			CreatedAt:    sql.NullTime{Time: now, Valid: true},
			TournamentID: tournamentID,
			TeamID:       teamID,
			CourseTeesID: teeID,
		})
		if err != nil {
			log.Printf("[ERROR] Seeding player %s: %v", name, err)
			tx.Rollback()
			return
		}
		playerIDs = append(playerIDs, p.ID)
		log.Printf("[DEBUG] Inserted player %s with ID=%d into Team %d", name, p.ID, teamID)
	}

	// ------------------------
	// 6. Assign Players to Teams (Updated: No longer needed as players are created with teams, but we verify)
	// ------------------------

	for i, pid := range playerIDs {
		var teamID int64
		if i < 3 {
			teamID = teamAID
		} else if i < 6 {
			teamID = teamBID
		} else {
			teamID = teamCID
		}

		// Activate player
		err := q.AddPlayerToTeam(ctx, db.AddPlayerToTeamParams{
			TeamID: teamID,
			ID:     pid,
		})
		if err != nil {
			log.Printf("[ERROR] Activating player %d: %v", pid, err)
			tx.Rollback()
			return
		}
	}

	// ------------------------
	// 7. Create Invite for Team Alpha
	// ------------------------
	log.Println("[INFO] Creating invite...")
	// Use store method which handles token generation
	invite, err := s.CreateInviteTx(tx, int(tournamentID), int(teamAID))
	if err != nil {
		log.Printf("[ERROR] Creating invite: %v", err)
		tx.Rollback()
		return
	}
	log.Printf("[DEBUG] Created invite token=%s", invite.Token)

	// ------------------------
	// 8. Seed Scores
	// ------------------------
	log.Println("[INFO] Seeding scores...")

	// Fetch hole IDs
	courseHoles, err := q.GetCourseHoles(ctx, courseID)
	if err != nil {
		log.Printf("[ERROR] Fetching course holes: %v", err)
		tx.Rollback()
		return
	}

	holeMap := make(map[int]int64)
	for _, h := range courseHoles {
		holeMap[int(h.HoleNumber)] = h.ID
	}

	scores := []struct {
		Hole    int
		Strokes int
	}{
		{1, 4},
		{2, 3},
		{3, 5},
	}

	for _, s := range scores {
		courseHoleID := holeMap[s.Hole]

		_, err := q.InsertScore(ctx, db.InsertScoreParams{
			TournamentID: tournamentID,
			TeamID:       sql.NullInt64{Int64: teamAID, Valid: true},
			CourseHoleID: courseHoleID,
			Strokes:      int64(s.Strokes),
			CreatedAt:    sql.NullTime{Time: now, Valid: true},
		})

		if err != nil {
			log.Printf("[ERROR] Seeding score for Team Alpha Hole %d: %v", s.Hole, err)
			tx.Rollback()
			return
		}
		log.Printf("[DEBUG] Inserted score for Team Alpha Hole %d: %d strokes", s.Hole, s.Strokes)
	}

	// ------------------------
	// 9. Commit transaction
	// ------------------------
	if err := tx.Commit(); err != nil {
		log.Fatalf("[ERROR] Failed to commit transaction: %v", err)
	}

	log.Println("========================================")
	log.Println("[INFO] Seed complete!")
	log.Printf("Tournament ID: %d", tournamentID)
	log.Printf("Team Alpha ID: %d", teamAID)
	// log.Printf("Invite Token: %s", token)
	log.Println("========================================")
}
