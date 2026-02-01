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
		Name          string
		Description   string
		IsTeamScoring bool
	}{
		{"Scramble", "Teams play from the best shot selected after every stroke.", true},
		{"Shamble", "Teams play from the best drive, then each player plays their own ball into the hole.", false},
		{"2-Man Best Ball (Combined)", "Teams of 4. The top two scores on the hole combined.", false},
		{"Best Ball", "The lowest score on the hole counts as the team score.", false},
		{"Alternate Shot (Foursomes)", "Teammates take turns hitting the same ball until holed.", true},
		{"Individual Stroke Play", "Standard individual scoring. Every stroke counts.", false},
		{"Match Play", "Scoring is by hole won, lost, or halved, not total strokes.", false},
		{"Combined Score", "The sum of all net scores of team members counts as the team score.", true},
	}

	formatIDs := make(map[string]int64)
	log.Println("[INFO] Seeding tournament formats...")
	for _, f := range formats {
		log.Printf("[DEBUG] Inserting format: %s", f.Name)
		res, err := tx.Exec(`
			INSERT INTO tournament_formats (name, description, is_team_scoring, created_at)
			VALUES (?, ?, ?, ?)
		`, f.Name, f.Description, f.IsTeamScoring, nowStr)
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
	// Create a multi-round tournament for testing
	startDate := time.Now()
	teamCount := 4

	tournament, err := q.CreateTournament(ctx, db.CreateTournamentParams{
		Name:      "Seed Multi-Round Tournament",
		TeamCount: int64(teamCount),
		CreatedAt: sql.NullTime{Time: now, Valid: true},
	})
	if err != nil {
		log.Printf("[ERROR] Seeding tournament: %v", err)
		tx.Rollback()
		return
	}
	tournamentID := tournament.ID
	log.Printf("[DEBUG] Inserted tournament ID=%d", tournamentID)

	// ------------------------
	// 4. Seed Tournament Rounds (3 rounds)
	// ------------------------
	log.Println("[INFO] Seeding tournament rounds...")

	rounds := []struct {
		Number   int
		Date     time.Time
		Name     string
		Status   string
		FormatId int64
	}{
		{1, startDate, "Opening Round", "completed", formatIDs["Best Ball"]},
		{2, startDate.AddDate(0, 0, 1), "Second Round", "active", formatIDs["Shamble"]},
	}

	for _, round := range rounds {
		_, err = q.CreateTournamentRound(ctx, db.CreateTournamentRoundParams{
			TournamentID: tournamentID,
			RoundNumber:  int64(round.Number),
			Date:         round.Date,
			CourseID:     courseID,
			Name:         round.Name,
			FormatID:     round.FormatId,
			Status:       sql.NullString{String: round.Status, Valid: true},
		})
		if err != nil {
			log.Printf("[ERROR] Seeding round %d: %v", round.Number, err)
			tx.Rollback()
			return
		}
		log.Printf("[DEBUG] Created round: %s", round.Name)
	}

	// ------------------------
	// 5. Seed Teams (Dynamically)
	// ------------------------
	log.Println("[INFO] Seeding teams...")
	teamIDs := make([]int64, 0, teamCount)

	for i := 1; i <= teamCount; i++ {
		name := fmt.Sprintf("Team %d", i)
		team, err := q.CreateTeam(ctx, db.CreateTeamParams{
			Name:         name,
			TournamentID: sql.NullInt64{Int64: tournamentID, Valid: true},
		})
		if err != nil {
			log.Printf("[ERROR] Seeding Team %d: %v", i, err)
			tx.Rollback()
			return
		}
		log.Printf("[DEBUG] Inserted Team %s ID=%d", name, team.ID)
		teamIDs = append(teamIDs, team.ID)
	}

	// ------------------------
	// 5a. Seed Team Groups (Red / Blue)
	// ------------------------
	log.Println("[INFO] Seeding team groups...")

	redGroup, err := q.CreateTeamGroup(ctx, db.CreateTeamGroupParams{
		Name:         "Red",
		TournamentID: tournamentID,
	})
	if err != nil {
		log.Printf("[ERROR] Creating Red group: %v", err)
		tx.Rollback()
		return
	}
	log.Printf("[DEBUG] Created Red Group ID=%d", redGroup.ID)

	blueGroup, err := q.CreateTeamGroup(ctx, db.CreateTeamGroupParams{
		Name:         "Blue",
		TournamentID: tournamentID,
	})
	if err != nil {
		log.Printf("[ERROR] Creating Blue group: %v", err)
		tx.Rollback()
		return
	}
	log.Printf("[DEBUG] Created Blue Group ID=%d", blueGroup.ID)

	// Assign Teams to Groups
	for i, tID := range teamIDs {
		var groupID int64
		if i%2 == 0 {
			groupID = redGroup.ID
		} else {
			groupID = blueGroup.ID
		}
		if err := q.AddTeamToGroup(ctx, db.AddTeamToGroupParams{
			TeamID:  tID,
			GroupID: groupID,
		}); err != nil {
			log.Printf("[ERROR] Adding team %d to group %d: %v", tID, groupID, err)
			tx.Rollback()
			return
		}
	}

	// ------------------------
	// 5b. Seed Tournament Rewards
	// ------------------------
	log.Println("[INFO] Seeding rewards...")
	_, err = q.CreateTournamentReward(ctx, db.CreateTournamentRewardParams{
		TournamentID: tournamentID,
		Scope:        "team",
		Metric:       "total_score",
		Description:  sql.NullString{String: "Lowest Total Score (Team)", Valid: true},
	})
	if err != nil {
		log.Printf("[ERROR] Creating Team Reward: %v", err)
		tx.Rollback()
		return
	}
	_, err = q.CreateTournamentReward(ctx, db.CreateTournamentRewardParams{
		TournamentID: tournamentID,
		Scope:        "group",
		Metric:       "total_score",
		Description:  sql.NullString{String: "Lowest Aggregate Score (Group)", Valid: true},
	})
	if err != nil {
		log.Printf("[ERROR] Creating Group Reward: %v", err)
		tx.Rollback()
		return
	}

	// ------------------------
	// 5c. Seed Players (2 per team)
	// ------------------------
	log.Println("[INFO] Seeding players...")
	playerIDs := make([]int64, 0)
	playersPerTeam := 2
	totalPlayers := teamCount * playersPerTeam

	for i := 1; i <= totalPlayers; i++ {
		isAdmin := i == 1
		name := fmt.Sprintf("Player %d", i)

		// Determine team (round robin)
		teamIndex := (i - 1) / playersPerTeam
		if teamIndex >= len(teamIDs) {
			teamIndex = len(teamIDs) - 1 // Safety, though loop should prevent this
		}
		teamID := teamIDs[teamIndex]

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
	// 6. Assign Players to Teams
	// ------------------------
	for i, pid := range playerIDs {
		teamIndex := (i) / playersPerTeam
		if teamIndex >= len(teamIDs) {
			teamIndex = len(teamIDs) - 1
		}
		teamID := teamIDs[teamIndex]

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
	// 7. Create Invite for First Team
	// ------------------------
	log.Println("[INFO] Creating invite...")
	// Use store method which handles token generation
	invite, err := s.CreateInviteTx(tx, int(tournamentID), int(teamIDs[0]))
	if err != nil {
		log.Printf("[ERROR] Creating invite: %v", err)
		tx.Rollback()
		return
	}
	log.Printf("[DEBUG] Created invite token=%s", invite.Token)

	// ------------------------
	// 9. Commit transaction
	// ------------------------
	if err := tx.Commit(); err != nil {
		log.Fatalf("[ERROR] Failed to commit transaction: %v", err)
	}

	log.Println("========================================")
	log.Println("[INFO] Seed complete!")
	log.Printf("Tournament ID: %d", tournamentID)
	log.Printf("First Team ID: %d", teamIDs[0])
	// log.Printf("Invite Token: %s", token)
	log.Println("========================================")
}
