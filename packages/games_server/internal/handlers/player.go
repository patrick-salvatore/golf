package handlers

import (
	"encoding/json"
	"net/http"

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
