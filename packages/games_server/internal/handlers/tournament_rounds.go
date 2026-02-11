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

func GetTournamentRounds(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")
		tournamentID, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
			return
		}

		rounds, err := db.GetTournamentRounds(tournamentID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(rounds)
	}
}

func GetTournamentRound(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "roundId")
		roundID, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, "Invalid round ID", http.StatusBadRequest)
			return
		}

		round, err := db.GetTournamentRound(roundID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(round)
	}
}

func CreateTournamentRound(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")
		tournamentID, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
			return
		}

		var req models.CreateRoundRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		round, err := db.CreateTournamentRound(tournamentID, req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(round)
	}
}

func SubmitRoundScore(db *store.Store, cache *infra.CacheManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		roundIDParam := chi.URLParam(r, "roundId")
		roundID, err := strconv.Atoi(roundIDParam)
		if err != nil {
			http.Error(w, "Invalid round ID", http.StatusBadRequest)
			return
		}

		var req models.SubmitRoundScoreRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		_, err = db.SubmitRoundScore(roundID, req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		cache.InvalidateRoundStats(roundID)

		// Broadcast update
		if namespace, err := getNamespace(r); err == nil {
			var version int64
			_ = db.DB.QueryRow("SELECT value FROM meta WHERE key='version'").Scan(&version)
			broadcaster.Broadcast(namespace, version)
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	}
}
