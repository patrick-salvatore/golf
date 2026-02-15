package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/patrick-salvatore/games-server/internal/store"
)

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

		player, err := db.CreatePlayer(req.Name, req.Handicap, req.IsAdmin)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(player)
	}
}

type UpdatePlayerRequest struct {
	Name     string  `json:"name"`
	Handicap float64 `json:"handicap"`
	Active   bool    `json:"active"`
	TeamID   int     `json:"team_id"`
}

func UpdatePlayer(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		playerID := chi.URLParam(r, "id")
		id, err := strconv.Atoi(playerID)
		if err != nil {
			http.Error(w, "Invalid player ID", http.StatusBadRequest)
			return
		}

		var req UpdatePlayerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := db.UpdatePlayer(id, req.Name, req.Handicap, req.Active, req.TeamID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Fetch and return updated player
		player, err := db.GetPlayer(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(player)
	}
}

func GetPlayersByTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentID := chi.URLParam(r, "id")
		id, err := strconv.Atoi(tournamentID)
		if err != nil {
			http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
			return
		}

		players, err := db.GetPlayersByTournament(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(players)
	}
}
