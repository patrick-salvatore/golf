package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/patrick-salvatore/games-server/internal/infra"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

func GetTournamentScores(db *store.Store) http.HandlerFunc {
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

		scores, err := db.GetRoundScores(tournamentID, playerID, teamID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(scores)
	}
}

func GetRoundScores(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		roundIDParam := chi.URLParam(r, "roundId")
		roundID, err := strconv.Atoi(roundIDParam)
		if err != nil {
			http.Error(w, "Invalid round ID", http.StatusBadRequest)
			return
		}

		playerIDStr := r.URL.Query().Get("playerId")
		teamIDStr := r.URL.Query().Get("teamId")

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

		scores, err := db.GetRoundScores(roundID, playerID, teamID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(scores)
	}
}

func SubmitScore(db *store.Store, cache *infra.CacheManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var scores []models.SubmitScoreRequest
		if err := json.NewDecoder(r.Body).Decode(&scores); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		newScores := []models.Score{}
		invalidatedRounds := make(map[int]bool)

		for _, score := range scores {
			// Validation: Ensure at least PlayerID or TeamID is set
			if score.PlayerID == nil && score.TeamID == nil {
				http.Error(w, "Must provide either playerId or teamId", http.StatusBadRequest)
				return
			}

			newScore, err := db.SubmitScore(score)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			if newScore.TournamentRoundID != nil {
				rID := *newScore.TournamentRoundID
				if !invalidatedRounds[rID] {
					cache.InvalidateRoundStats(rID)
					invalidatedRounds[rID] = true
				}
			}

			newScores = append(newScores, *newScore)
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(newScores)
	}
}
