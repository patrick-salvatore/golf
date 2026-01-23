package main

import (
	"fmt"
	"log"
	"time"

	"github.com/patrick-salvatore/games-server/internal/store"
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

	// db := store.NewStore(sqlDB)

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

	now := time.Now().Format("2006-01-02 15:04:05")

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
		`, f.Name, f.Description, now)
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
	`, "Pebble Beach (Seed)", "{}", now) // data is legacy/unused for holes now
	if err != nil {
		log.Printf("[ERROR] Seeding course: %v", err)
		tx.Rollback()
		return
	}
	courseID, _ := res.LastInsertId()
	log.Printf("[DEBUG] Inserted course ID=%d", courseID)

	// Seed Course Holes (Mens Tee)
	for i := 0; i < 18; i++ {
		_, err := tx.Exec(`
			INSERT INTO course_holes (course_id, tee_set, hole_number, par, handicap, yardage, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, courseID, "Mens", i+1, 4, i+1, 350+(i*10), now)
		if err != nil {
			log.Printf("[ERROR] Seeding hole %d: %v", i+1, err)
			tx.Rollback()
			return
		}
	}

	// ------------------------
	// 3. Seed Players (8 players, 1 admin)
	// ------------------------
	log.Println("[INFO] Seeding players...")
	playerIDs := make([]int64, 0)
	for i := 1; i <= 8; i++ {
		isAdmin := i == 1
		name := fmt.Sprintf("Player %d", i)
		res, err := tx.Exec(`
			INSERT INTO players (name, handicap, is_admin, created_at) VALUES (?, ?, ?, ?)
		`, name, float64(10+i), isAdmin, now)
		if err != nil {
			log.Printf("[ERROR] Seeding player %s: %v", name, err)
			tx.Rollback()
			return
		}
		id, _ := res.LastInsertId()
		playerIDs = append(playerIDs, id)
		log.Printf("[DEBUG] Inserted player %s with ID=%d", name, id)
	}

	// ------------------------
	// 4. Seed Tournament
	// ------------------------
	log.Println("[INFO] Seeding tournament...")
	tournamentRes, err := tx.Exec(`
		INSERT INTO tournaments (name, course_id, format_id, team_count, awarded_handicap, is_match_play, start_time, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "Seed Tournament", courseID, formatIDs["Scramble"], 4, 1.0, false, now, now)
	if err != nil {
		log.Printf("[ERROR] Seeding tournament: %v", err)
		tx.Rollback()
		return
	}
	tournamentID, _ := tournamentRes.LastInsertId()
	log.Printf("[DEBUG] Inserted tournament ID=%d", tournamentID)

	// ------------------------
	// 5. Seed Teams (2 teams)
	// ------------------------
	log.Println("[INFO] Seeding teams...")
	teamRes, err := tx.Exec(`INSERT INTO teams (name, tournament_id, started, finished, created_at) VALUES (?, ?, ?, ?, ?)`,
		"Team Alpha", tournamentID, 0, 0, now)
	if err != nil {
		log.Printf("[ERROR] Seeding Team Alpha: %v", err)
		tx.Rollback()
		return
	}
	teamAID, _ := teamRes.LastInsertId()
	log.Printf("[DEBUG] Inserted Team Alpha ID=%d", teamAID)

	teamRes, err = tx.Exec(`INSERT INTO teams (name, tournament_id, started, finished, created_at) VALUES (?, ?, ?, ?, ?)`,
		"Team Bravo", tournamentID, 1, 0, now)
	if err != nil {
		log.Printf("[ERROR] Seeding Team Bravo: %v", err)
		tx.Rollback()
		return
	}
	teamBID, _ := teamRes.LastInsertId()
	log.Printf("[DEBUG] Inserted Team Bravo ID=%d", teamBID)

	// ------------------------
	// 6. Assign Players to Teams
	// ------------------------
	for i, pid := range playerIDs {
		teamID := teamAID
		if i >= 4 {
			teamID = teamBID
		}
		_, err := tx.Exec(`INSERT INTO team_players (team_id, player_id, tee) VALUES (?, ?, ?)`, teamID, pid, "Mens")
		if err != nil {
			log.Printf("[ERROR] Assigning player %d to team %d: %v", pid, teamID, err)
			tx.Rollback()
			return
		}
		log.Printf("[DEBUG] Assigned player %d to team %d", pid, teamID)
	}

	// ------------------------
	// 7. Create Invite for Team Alpha
	// ------------------------
	// log.Println("[INFO] Creating invite...")
	// token := fmt.Sprintf("%s-%d", "invite", time.Now().Unix())
	// expiresAt := time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02 15:04:05")
	// _, err = tx.Exec(`INSERT INTO invites (token, tournament_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
	// 	token, tournamentID, expiresAt, now)
	// if err != nil {
	// 	log.Printf("[ERROR] Creating invite: %v", err)
	// 	tx.Rollback()
	// 	return
	// }
	// log.Printf("[DEBUG] Created invite token=%s", token)

	// ------------------------
	// 8. Seed Scores
	// ------------------------
	log.Println("[INFO] Seeding scores...")
	// Seed scores for Team Alpha (Scramble format -> Team Score)
	// Map Hole Number to Course Hole ID (assuming they were inserted sequentially and ID starts at 1 relative to the seed)
	// Actually, we can just query them or infer from seed logic.
	// Course holes were inserted for courseID.
	// Since we are seeding, we know the hole numbers are 1..18.
	// But we need the DB IDs.
	// Let's fetch them for correctness.
	rows, err := tx.Query("SELECT id, hole_number FROM course_holes WHERE course_id = ? ORDER BY hole_number", courseID)
	if err != nil {
		log.Printf("[ERROR] Fetching course holes: %v", err)
		tx.Rollback()
		return
	}
	defer rows.Close()

	holeMap := make(map[int]int64)
	for rows.Next() {
		var id int64
		var num int
		rows.Scan(&id, &num)
		holeMap[num] = id
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
		_, err := tx.Exec(`
			INSERT INTO scores (tournament_id, team_id, course_hole_id, strokes, created_at)
			VALUES (?, ?, ?, ?, ?)
		`, tournamentID, teamAID, courseHoleID, s.Strokes, now)
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
