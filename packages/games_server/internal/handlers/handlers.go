package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/patrick-salvatore/games-server/internal/middleware"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/security"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// -- Scores --

func GetScores(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentIDStr := r.URL.Query().Get("tournamentId")
		playerIDStr := r.URL.Query().Get("playerId")
		teamIDStr := r.URL.Query().Get("teamId")

		if tournamentIDStr == "" {
			http.Error(w, "tournamentId required", http.StatusBadRequest)
			return
		}

		tournamentID, _ := strconv.Atoi(tournamentIDStr)
		var playerID *int
		if playerIDStr != "" {
			id, _ := strconv.Atoi(playerIDStr)
			playerID = &id
		}
		var teamID *int
		if teamIDStr != "" {
			id, _ := strconv.Atoi(teamIDStr)
			teamID = &id
		}

		scores, err := db.GetScores(tournamentID, playerID, teamID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(scores)
	}
}

func SubmitScore(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.SubmitScoreRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Validation: Ensure at least PlayerID or TeamID is set
		if req.PlayerID == nil && req.TeamID == nil {
			http.Error(w, "Must provide either playerId or teamId", http.StatusBadRequest)
			return
		}

		score, err := db.SubmitScore(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(score)
	}
}

// -- Formats --

func GetAllFormats(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		formats, err := db.GetAllFormats()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(formats)
	}
}

// -- Players --

func GetPlayers(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		players, err := db.GetAllPlayers()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(players)
	}
}

type CreatePlayerRequest struct {
	Name     string  `json:"name"`
	Handicap float64 `json:"handicap"`
	IsAdmin  bool    `json:"isAdmin"` // Allow setting admin status
}

func CreatePlayer(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req CreatePlayerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Security Check for Admin Flag:
		// Only existing Admins can create new Admins.
		// Regular users (via invite) cannot set isAdmin = true.
		requesterIsAdmin, _ := r.Context().Value(middleware.IsAdminKey).(bool)
		if req.IsAdmin && !requesterIsAdmin {
			http.Error(w, "Only admins can create admin users", http.StatusForbidden)
			return
		}

		player, err := db.CreatePlayer(req.Name, req.Handicap, req.IsAdmin)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Linking Logic: If context has TeamID and TournamentID, add player to team
		teamId, _ := r.Context().Value(middleware.TeamIDKey).(int)
		tournamentId, _ := r.Context().Value(middleware.TournamentIDKey).(int)

		if teamId > 0 && tournamentId > 0 {
			err := db.AddPlayerToTeam(teamId, player.ID, tournamentId)
			if err != nil {
			}
		}

		claims := jwt.MapClaims{
			"playerId": strconv.Itoa(player.ID),
			"isAdmin":  player.IsAdmin,
		}
		if tournamentId > 0 {
			claims["tournamentId"] = strconv.Itoa(tournamentId)
		}
		if teamId > 0 {
			claims["teamId"] = strconv.Itoa(teamId)
		}

		tokenString, err := security.NewJWT(claims, 24*time.Hour*30) // 30 day token for players
		if err != nil {
			http.Error(w, "Player created but token generation failed", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		// Return Player AND Token
		json.NewEncoder(w).Encode(map[string]interface{}{
			"player": player,
			"token":  tokenString,
		})
	}
}

// -- Tournaments --

func GetTournaments(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournaments, err := db.GetAllTournaments()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(tournaments)
	}
}

func GetTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")

		id, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		t, err := db.GetTournament(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if t == nil {
			http.Error(w, "Tournament not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(t)
	}
}

func CreateTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.CreateTournamentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// 1. Create Tournament Record
		t, err := db.CreateTournament(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// 2. Generate Teams Logic (Ported from old controller)
		if len(req.Players) > 0 {
			teams, err := generateTeams(t.ID, req.Players, req.TeamCount)
			if err != nil {
				// In a real app we might rollback here, keeping it simple for now
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			// 3. Save Teams and Player Assignments
			for _, teamData := range teams {
				teamID, err := db.CreateTeam(t.ID, teamData.Name)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}

				for _, p := range teamData.Players {
					if err := db.AddPlayerToTeam(teamID, p.ID, t.ID); err != nil {
						http.Error(w, err.Error(), http.StatusInternalServerError)
						return
					}
				}
			}
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(t)
	}
}

type teamWithPlayers struct {
	Name    string
	Players []models.Player
}

// Ported Logic from live_tournament_scoring/controllers/tournament.go
func generateTeams(tournamentId int, players []models.Player, teamCount int) ([]teamWithPlayers, error) {
	if teamCount <= 0 {
		return nil, fmt.Errorf("invalid TeamCount, must be at least 1")
	}
	if len(players)%teamCount != 0 {
		return nil, fmt.Errorf("player count (%d) must be divisible by team size (%d)", len(players), teamCount)
	}

	// Sort by handicap for snake draft balancing
	sort.Slice(players, func(i, j int) bool {
		return players[i].Handicap < players[j].Handicap
	})

	numTeams := len(players) / teamCount
	teams := make([]teamWithPlayers, numTeams)

	// "Snake" distribution logic
	// e.g. 1 2 3 4 ... 4 3 2 1
	for i := 0; i < teamCount; i++ {
		for j := 0; j < numTeams; j++ {
			playerIdx := 0
			if i%2 == 0 {
				// Forward pass
				playerIdx = (i * numTeams) + j
			} else {
				// Backward pass
				playerIdx = (i * numTeams) + (numTeams - 1 - j)
			}
			teams[j].Players = append(teams[j].Players, players[playerIdx])
		}
	}

	// Generate Names
	for i := range teams {
		names := []string{}
		for _, p := range teams[i].Players {
			names = append(names, fmt.Sprintf("%s (%.1f)", p.Name, p.Handicap))
		}
		teams[i].Name = strings.Join(names, " + ")
	}

	return teams, nil
}

// -- Courses --

func GetCourses(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		courses, err := db.GetAllCourses()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(courses)
	}
}

func GetCourseByTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		course, err := db.GetCourseByTournamentID(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if course == nil {
			http.Error(w, "Course not found for this tournament", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(course)
	}
}

// -- Teams --

func GetTeam(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		team, err := db.GetTeam(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if team == nil {
			http.Error(w, "Team not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(team)
	}
}

func GetTeamPlayers(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		players, err := db.GetTeamPlayers(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(players)
	}
}

func GetTeamsByTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentIdParam := chi.URLParam(r, "id")

		tournamentID, err := strconv.Atoi(tournamentIdParam)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		teams, err := db.GetTeamsByTournament(tournamentID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(teams)
	}
}

// -- Invites --

func CreateInvite(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.CreateInviteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		invite, err := db.CreateInvite(req.TournamentID, req.TeamID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(invite)
	}
}

func GetInvite(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := chi.URLParam(r, "token")
		invite, err := db.GetInvite(token)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if invite == nil {
			http.Error(w, "Invite not found", http.StatusNotFound)
			return
		}

		// Check Active Status
		if !invite.Active {
			http.Error(w, "Invite is no longer active", http.StatusGone)
			return
		}

		// Check Expiration
		expiresAt, err := time.Parse(time.RFC3339, invite.ExpiresAt)
		// Fallback for legacy format if needed, but we switched to RFC3339
		if err != nil {
			expiresAt, err = time.Parse("2006-01-02 15:04:05", invite.ExpiresAt)
		}

		if err == nil && time.Now().UTC().After(expiresAt) {
			http.Error(w, "Invite has expired", http.StatusGone)
			return
		}

		// Enrich with Tournament and Team names
		t, err := db.GetTournament(invite.TournamentID)
		if err != nil {
			http.Error(w, "Tournament not found", http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"token":          invite.Token,
			"tournamentId":   invite.TournamentID,
			"tournamentName": t.Name,
			"teamId":         invite.TeamID,
		}

		json.NewEncoder(w).Encode(response)
	}
}
