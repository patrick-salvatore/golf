package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

func upsertEntity(db *sql.DB, namespace, eType, id string, data interface{}) {
	dataBytes, _ := json.Marshal(data)
	_, err := db.Exec(`
		INSERT INTO entities (namespace, type, id, data, updated_at, updated_by) 
		VALUES (?, ?, ?, ?, ?, ?) 
		ON CONFLICT(namespace, type, id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
	`, namespace, eType, id, string(dataBytes), time.Now().UnixMilli(), "seed-script")
	if err != nil {
		log.Printf("Error upserting entity %s/%s: %v", eType, id, err)
	}
}

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

	db := store.NewStore(sqlDB)

	// 1. Seed Formats
	formats := []struct {
		ID          string
		Name        string
		Description string
	}{
		{"scramble", "Scramble", "Teams play from the best shot selected after every stroke."},
		{"shamble", "Shamble", "Teams play from the best drive, then each player plays their own ball into the hole."},
		{"best_ball_2", "2-Man Best Ball", "Teams of 2. The lowest score on the hole counts as the team score."},
		{"best_ball_4", "4-Man Best Ball", "Teams of 4. The lowest score on the hole counts as the team score."},
		{"alt_shot", "Alternate Shot (Foursomes)", "Teammates take turns hitting the same ball until holed."},
		{"stroke", "Individual Stroke Play", "Standard individual scoring. Every stroke counts."},
		{"match_play", "Match Play", "Scoring is by hole won, lost, or halved, not total strokes."},
		{"stableford", "Stableford", "Points awarded based on score relative to fixed score (usually par)."},
		{"skins", "Skins", "Players compete for a prize (skin) on each hole. Lowest score wins the skin."},
	}

	log.Println("Seeding tournament formats...")
	for _, f := range formats {
		_, err := sqlDB.Exec(`
			INSERT INTO tournament_formats (id, name, description) 
			VALUES (?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description;
		`, f.ID, f.Name, f.Description)
		if err != nil {
			log.Printf("Error seeding format %s: %v", f.Name, err)
		}
	}

	// 2. Seed Course
	log.Println("Seeding course...")
	courseId := "course-pebble-beach"
	holes := make([]models.HoleData, 18)
	for i := 0; i < 18; i++ {
		holes[i] = models.HoleData{
			Number:   i + 1,
			Par:      4, // Simplified
			Handicap: i + 1,
		}
	}
	courseMeta := models.CourseMeta{
		Holes: holes,
		Tees:  []string{"Pro", "Mens", "Ladies"},
	}
	metaBytes, _ := json.Marshal(courseMeta)

	_, err = sqlDB.Exec(`
		INSERT INTO courses (id, name, data) VALUES (?, ?, ?)
		ON CONFLICT(id) DO NOTHING
	`, courseId, "Pebble Beach (Seed)", string(metaBytes))
	if err != nil {
		log.Printf("Error seeding course: %v", err)
	}

	// 4. Seed Tournament (Define ID early for namespace)
	log.Println("Seeding tournament...")
	tournamentId := "tournament-seed-1"

	// Sync: Course
	upsertEntity(sqlDB, tournamentId, "course", courseId, map[string]interface{}{
		"id":           courseId,
		"name":         "Pebble Beach (Seed)",
		"holes":        holes,
		"tees":         []string{"Pro", "Mens", "Ladies"},
		"tournamentId": tournamentId,
	})

	// 3. Seed Players (8 players, 1 admin)
	log.Println("Seeding players...")
	playerIds := []string{}
	for i := 1; i <= 8; i++ {
		id := fmt.Sprintf("player-%d", i)
		name := fmt.Sprintf("Player %d", i)
		isAdmin := i == 1 // Player 1 is Admin

		_, err := sqlDB.Exec(`
			INSERT INTO players (id, name, handicap, is_admin) VALUES (?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET is_admin=excluded.is_admin
		`, id, name, float64(10+i), isAdmin)

		if err != nil {
			log.Printf("Error seeding player %d: %v", i, err)
		}
		playerIds = append(playerIds, id)

		// Sync: Player (Initially no team)
		upsertEntity(sqlDB, tournamentId, "player", id, map[string]interface{}{
			"id":       id,
			"name":     name,
			"handicap": 10 + i,
			"teamId":   "", // Will update later
			"tee":      "Mens",
		})
	}

	_, err = sqlDB.Exec(`
		INSERT INTO tournaments (id, name, course_id, format_id, team_count, awarded_handicap, is_match_play, start_time)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO NOTHING
	`, tournamentId, "Seed Tournament", courseId, "scramble", 4, 1.0, false, time.Now())
	if err != nil {
		log.Printf("Error seeding tournament: %v", err)
	}

	// Sync: Tournament
	upsertEntity(sqlDB, tournamentId, "tournament", tournamentId, map[string]interface{}{
		"id":              tournamentId,
		"name":            "Seed Tournament",
		"uuid":            tournamentId, // Legacy field
		"awardedHandicap": 1.0,
		"isMatchPlay":     false,
		"status":          "active",
	})

	// 5. Seed Teams (2 Teams of 4)
	log.Println("Seeding teams...")
	teamAId := "team-A"
	teamBId := "team-B"

	// Create Team A
	_, err = sqlDB.Exec(`INSERT INTO teams (id, name, tournament_id, started) VALUES (?, ?, ?, 1) ON CONFLICT(id) DO NOTHING`, teamAId, "Team Alpha", tournamentId)
	upsertEntity(sqlDB, tournamentId, "team", teamAId, map[string]interface{}{
		"id":           teamAId,
		"name":         "Team Alpha",
		"displayName":  "Team Alpha",
		"tournamentId": tournamentId,
		"started":      true,
		"finished":     false,
	})

	// Create Team B
	_, err = sqlDB.Exec(`INSERT INTO teams (id, name, tournament_id, started) VALUES (?, ?, ?, 1) ON CONFLICT(id) DO NOTHING`, teamBId, "Team Bravo", tournamentId)
	upsertEntity(sqlDB, tournamentId, "team", teamBId, map[string]interface{}{
		"id":           teamBId,
		"name":         "Team Bravo",
		"displayName":  "Team Bravo",
		"tournamentId": tournamentId,
		"started":      true,
		"finished":     false,
	})

	// Assign Players
	for i, pid := range playerIds {
		teamId := teamAId
		if i >= 4 {
			teamId = teamBId
		}

		_, err = sqlDB.Exec(`
			INSERT INTO team_players (team_id, player_id, tee) VALUES (?, ?, ?)
			ON CONFLICT(team_id, player_id) DO NOTHING
		`, teamId, pid, "Mens")

		// Sync: Update Player with TeamID
		upsertEntity(sqlDB, tournamentId, "player", pid, map[string]interface{}{
			"id":       pid,
			"name":     fmt.Sprintf("Player %d", i+1),
			"handicap": 10 + i + 1,
			"teamId":   teamId,
			"tee":      "Mens",
		})
	}

	// 6. Create Invite for Team A
	invite, err := db.CreateInvite(tournamentId, teamAId)
	if err != nil {
		log.Printf("Error creating invite: %v", err)
	} else {
		fmt.Println("========================================")
		fmt.Printf("Seed Complete!\n")
		fmt.Printf("Tournament ID: %s\n", tournamentId)
		fmt.Printf("Team A ID: %s\n", teamAId)
		fmt.Printf("Admin Player ID: player-1\n")
		fmt.Printf("Invite Token: %s\n", invite.Token)
		fmt.Printf("Join URL: http://localhost:3000/join/%s\n", invite.Token)
		fmt.Println("========================================")
	}
}
