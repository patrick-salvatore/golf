package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/patrick-salvatore/games-server/internal/models"
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
	holes := make([]models.HoleData, 18)
	for i := 0; i < 18; i++ {
		holes[i] = models.HoleData{
			Number:   i + 1,
			Par:      4,
			Handicap: i + 1,
		}
	}
	courseMeta := models.CourseMeta{
		Holes: holes,
		Tees:  []string{"Pro", "Mens", "Ladies"},
	}
	metaBytes, _ := json.Marshal(courseMeta)

	res, err := tx.Exec(`
		INSERT INTO courses (name, data, created_at) VALUES (?, ?, ?)
	`, "Pebble Beach (Seed)", string(metaBytes), now)
	if err != nil {
		log.Printf("[ERROR] Seeding course: %v", err)
		tx.Rollback()
		return
	}
	courseID, _ := res.LastInsertId()
	log.Printf("[DEBUG] Inserted course ID=%d", courseID)

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
		"Team Alpha", tournamentID, 1, 0, now)
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
	log.Println("[INFO] Creating invite...")
	token := fmt.Sprintf("%s-%d", "invite", time.Now().Unix())
	expiresAt := time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02 15:04:05")
	_, err = tx.Exec(`INSERT INTO invites (token, tournament_id, team_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
		token, tournamentID, teamAID, expiresAt, now)
	if err != nil {
		log.Printf("[ERROR] Creating invite: %v", err)
		tx.Rollback()
		return
	}
	log.Printf("[DEBUG] Created invite token=%s", token)

	// ------------------------
	// 8. Commit transaction
	// ------------------------
	if err := tx.Commit(); err != nil {
		log.Fatalf("[ERROR] Failed to commit transaction: %v", err)
	}

	log.Println("========================================")
	log.Println("[INFO] Seed complete!")
	log.Printf("Tournament ID: %d", tournamentID)
	log.Printf("Team Alpha ID: %d", teamAID)
	log.Printf("Invite Token: %s", token)
	log.Println("========================================")
}
