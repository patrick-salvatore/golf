package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/patrick-salvatore/games-server/internal/middleware"
	"github.com/patrick-salvatore/games-server/internal/security"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// -- Auth --

func GetSession(w http.ResponseWriter, r *http.Request) {
	// Try to get from Context (if middleware ran)
	teamID, ok := r.Context().Value(middleware.TeamIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: teamID", http.StatusBadRequest)
		return
	}
	tournamentID, ok := r.Context().Value(middleware.TournamentIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: tournamentID", http.StatusBadRequest)
		return
	}
	playerID, ok := r.Context().Value(middleware.PlayerIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: playerID", http.StatusBadRequest)
		return
	}
	isAdmin, ok := r.Context().Value(middleware.IsAdminKey).(bool)
	if !ok {
		http.Error(w, "malformed input: isAdmin", http.StatusBadRequest)
		return
	}

	fmt.Printf("%#v\n", map[string]interface{}{
		"teamId":       teamID,
		"tournamentId": tournamentID,
		"playerId":     playerID,
		"isAdmin":      isAdmin,
	})

	// Helper to handle boolean properly in map[string]interface{}
	// Or define struct.
	response := map[string]interface{}{
		"teamId":       teamID,
		"tournamentId": tournamentID,
		"playerId":     playerID,
		"isAdmin":      isAdmin,
	}

	json.NewEncoder(w).Encode(response)
}

func HandleRefresh(w http.ResponseWriter, r *http.Request) {
	rCtx := r.Context()

	teamID, ok := r.Context().Value(middleware.TeamIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: teamID", http.StatusBadRequest)
	}
	tournamentID, ok := r.Context().Value(middleware.TournamentIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: tournamentID", http.StatusBadRequest)
	}
	playerID, ok := r.Context().Value(middleware.PlayerIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: playerID", http.StatusBadRequest)
	}
	isAdmin, ok := r.Context().Value(middleware.IsAdminKey).(bool)
	if !ok {
		http.Error(w, "malformed input: isAdmin", http.StatusBadRequest)
	}
	userResfreshTokenVersion, ok := rCtx.Value(middleware.UserResfreshTokenVersionKey).(int)
	if !ok {
		http.Error(w, "malformed input: userResfreshTokenVersion", http.StatusBadRequest)
	}

	tokens, err := security.GenerateUserTokens(teamID, tournamentID, playerID, isAdmin, userResfreshTokenVersion)
	if err != nil {
		http.Error(w, "unable to create token", http.StatusBadRequest)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(tokens)

}

// -- Session Management --

func GetAvailablePlayers(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentIDQuery := r.URL.Query().Get("tournamentId")
		playerIDQuery := r.URL.Query().Get("playerId")

		tournamentID, err := strconv.Atoi(tournamentIDQuery)
		if err != nil {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
			return
		}

		if tournamentID == 0 {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
			return
		}

		playerID, _ := strconv.Atoi(playerIDQuery)

		if playerID > 0 {
			player, err := db.GetAvailablePlayerById(tournamentID, playerID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(player)
		}

		players, err := db.GetAvailablePlayers(tournamentID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(players)
	}
}

type SelectPlayerRequest struct {
	PlayerId     int `json:"playerId"`
	TournamentId int `json:"tournamentId"`
	TeamId       int `json:"teamId"` // Optional
}

func SelectPlayer(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var data SelectPlayerRequest
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			http.Error(w, "Invalid body", http.StatusBadRequest)
			return
		}

		tournamentId := data.TournamentId
		teamId := data.TeamId
		playerId := data.PlayerId

		if tournamentId == 0 {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
			return
		}
		if playerId == 0 {
			http.Error(w, "Player ID required", http.StatusBadRequest)
			return
		}

		tournament, err := db.GetTournament(tournamentId)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		// check is tournament is active
		if tournament.Complete {
			http.Error(w, "", http.StatusUnauthorized)
			return
		}

		// Use IDs directly for DB operations
		if err := db.SelectPlayer(tournamentId, playerId); err != nil {
			// Check for unique constraint violation (already selected)
			if strings.Contains(err.Error(), "UNIQUE constraint failed") || strings.Contains(err.Error(), "duplicate key") {
				http.Error(w, "Player already active", http.StatusConflict)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Fetch player to get admin status
		player, err := db.GetPlayer(playerId)
		if err != nil {
			http.Error(w, "Failed to fetch player details", http.StatusInternalServerError)
			return
		}
		tokens, err := security.GenerateUserTokens(playerId, tournamentId, teamId, player.IsAdmin, player.RefreshTokenVersion)
		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(tokens)
	}
}

func LeaveSession(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentIDStr, _ := r.Context().Value(middleware.TournamentIDKey).(string)
		playerIDStr, _ := r.Context().Value(middleware.PlayerIDKey).(string)

		tournamentID, _ := strconv.Atoi(tournamentIDStr)
		playerID, _ := strconv.Atoi(playerIDStr)

		log.Println("playerID", playerID)
		log.Println("tournamentID", tournamentID)

		if tournamentID > 0 && playerID > 0 {
			err := db.RemoveActivePlayer(tournamentID, playerID)
			if err != nil {
				http.Error(w, "Failed to remove player from session", http.StatusInternalServerError)
				return
			}
		}

		w.WriteHeader(http.StatusOK)
	}
}
