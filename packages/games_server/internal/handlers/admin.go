package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/patrick-salvatore/games-server/internal/security"
	"github.com/patrick-salvatore/games-server/internal/store"
)

type AdminLoginRequest struct {
	Password string `json:"password"`
}

func AdminLogin(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req AdminLoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid body", http.StatusBadRequest)
			return
		}

		adminPassword, err := db.GetAdminPassword()
		if err != nil {
			// Fail securely if no password is set or db error
			http.Error(w, "Admin login not configured", http.StatusInternalServerError)
			return
		}

		if req.Password != adminPassword {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// Create admin session tokens
		// We use PlayerId 0 or -1 to signify a system admin user who isn't a real player
		tokens, err := security.GenerateUserTokens(security.UserTokenParams{
			PlayerId:            -1, // System Admin ID
			TournamentId:        0,  // Global Admin
			TeamId:              0,
			RoundId:             0,
			IsAdmin:             true,
			RefreshTokenVersion: 1, // Default version
		})

		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(tokens)
	}
}
