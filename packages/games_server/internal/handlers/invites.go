package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

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
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"tournamentName": t.Name,
			"token":          invite.Token,
			"tournamentId":   invite.TournamentID,
		}

		json.NewEncoder(w).Encode(response)
	}
}
