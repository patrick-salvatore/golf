package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/patrick-salvatore/games-server/internal/game"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// GetLeaderboard calculates and returns the leaderboard for a tournament
func GetLeaderboard(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
			return
		}

		leaderboard, err := game.CalculateLeaderboard(r.Context(), db, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(leaderboard)
	}
}

// SubmitTeamScore handles score submission for team-based formats (like Scramble)
func SubmitTeamScore(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.SubmitScoreRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Enforce TeamID presence
		if req.TeamID == nil {
			http.Error(w, "TeamID is required for team scores", http.StatusBadRequest)
			return
		}

		// Enforce PlayerID absence (or ignore/set to nil explicitly)
		req.PlayerID = nil

		score, err := db.SubmitScore(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(score)
	}
}
