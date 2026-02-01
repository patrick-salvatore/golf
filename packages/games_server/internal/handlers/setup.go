package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

func SetupTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.SetupTournamentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if len(req.Rounds) == 0 {
			http.Error(w, "At least one round is required", http.StatusBadRequest)
			return
		}
		if req.TeamCount <= 0 {
			http.Error(w, "TeamCount must be greater than 0", http.StatusBadRequest)
			return
		}

		t, err := db.SetupTournamentTx(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(t)
	}
}
