package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/patrick-salvatore/games-server/internal/game"
	"github.com/patrick-salvatore/games-server/internal/infra"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// GetLeaderboard calculates and returns the leaderboard for a tournament
func GetLeaderboard(db *store.Store, cache *infra.CacheManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
			return
		}

		leaderboard, err := game.CalculateLeaderboard(r.Context(), db, cache, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(leaderboard)
	}
}

// SubmitTeamScore handles score submission for team-based formats (like Scramble)
func SubmitTeamScore(db *store.Store, cache *infra.CacheManager) http.HandlerFunc {
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

		if score.TournamentRoundID != nil {
			cache.InvalidateRoundStats(*score.TournamentRoundID)
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(score)
	}
}

// GetRoundLeaderboard calculates and returns the leaderboard for a specific tournament round
func GetRoundLeaderboard(db *store.Store, cache *infra.CacheManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentIDParam := chi.URLParam(r, "id")
		roundIDParam := chi.URLParam(r, "roundId")

		tournamentID, err := strconv.Atoi(tournamentIDParam)
		if err != nil {
			http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
			return
		}

		roundID, err := strconv.Atoi(roundIDParam)
		if err != nil {
			http.Error(w, "Invalid round ID", http.StatusBadRequest)
			return
		}

		// Validate that round belongs to tournament
		round, err := db.GetTournamentRound(roundID)
		if err != nil {
			http.Error(w, "Round not found", http.StatusNotFound)
			return
		}
		if round.TournamentID != tournamentID {
			http.Error(w, "Round does not belong to tournament", http.StatusBadRequest)
			return
		}

		leaderboard, err := game.CalculateLeaderboard(r.Context(), db, cache, tournamentID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(leaderboard)
	}
}
