package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/patrick-salvatore/games-server/internal/middleware"
	"github.com/patrick-salvatore/games-server/internal/security"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// -- Auth --

func GetIdentity(w http.ResponseWriter, r *http.Request) {
	// Try to get from Context (if middleware ran)
	teamID, _ := r.Context().Value(middleware.TeamIDKey).(string)
	tournamentID, _ := r.Context().Value(middleware.TournamentIDKey).(string)
	playerID, _ := r.Context().Value(middleware.PlayerIDKey).(string)
	isAdmin, _ := r.Context().Value(middleware.IsAdminKey).(bool)

	// If not in context, try to parse manually (since this route is unauthed now)
	if teamID == "" && tournamentID == "" && playerID == "" {
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenString != authHeader {
				claims, err := security.ParseJWT(tokenString)
				if err == nil {
					if tid, ok := claims["tournamentId"].(string); ok {
						tournamentID = tid
					}
					if tId, ok := claims["teamId"].(string); ok {
						teamID = tId
					}
					if pId, ok := claims["playerId"].(string); ok {
						playerID = pId
					}
					if iA, ok := claims["isAdmin"].(bool); ok {
						isAdmin = iA
					}
				}
			}
		}
	}

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

// -- Session Management --

func GetAvailablePlayers(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentID, _ := r.Context().Value(middleware.TournamentIDKey).(string)
		if tournamentID == "" {
			http.Error(w, "Tournament context required", http.StatusUnauthorized)
			return
		}

		players, err := db.GetAvailablePlayers(tournamentID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(players)
	}
}

func SelectPlayer(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentID, _ := r.Context().Value(middleware.TournamentIDKey).(string)
		teamID, _ := r.Context().Value(middleware.TeamIDKey).(string)

		var input struct {
			PlayerID string `json:"playerId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid body", http.StatusBadRequest)
			return
		}

		if err := db.SelectPlayer(tournamentID, input.PlayerID); err != nil {
			// Check for unique constraint violation (already selected)
			if strings.Contains(err.Error(), "UNIQUE constraint failed") || strings.Contains(err.Error(), "duplicate key") {
				http.Error(w, "Player already active", http.StatusConflict)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Generate new token with full identity
		claims := jwt.MapClaims{
			"tournamentId": tournamentID,
			"playerId":     input.PlayerID,
		}
		if teamID != "" {
			claims["teamId"] = teamID
		}

		token, err := security.NewJWT(claims, 24*time.Hour)
		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		})
	}
}

func LeaveSession(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentID, _ := r.Context().Value(middleware.TournamentIDKey).(int)
		playerID, _ := r.Context().Value(middleware.PlayerIDKey).(int)

		if tournamentID > 0 && playerID > 0 {
			_ = db.RemoveActivePlayer(tournamentID, playerID)
		}

		w.WriteHeader(http.StatusOK)
	}
}

// -- Invites Acceptance --
func AcceptInvite(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := chi.URLParam(r, "token")

		invite, err := db.GetInvite(token)
		if err != nil || invite == nil {
			http.Error(w, "Invalid or expired invite", http.StatusBadRequest)
			return
		}

		claims := jwt.MapClaims{
			"tournamentId": invite.TournamentID,
		}
		if invite.TeamID != 0 {
			claims["teamId"] = invite.TeamID
		}

		// Note: AcceptInvite currently doesn't know the PlayerID so it can't add it to claims yet.
		// If we want the invite to log you in as a player, we need to know WHICH player.
		// For now, we keep as is (Tournament Context). The player context comes from CreatePlayer.

		tokenString, err := security.NewJWT(claims, 24*time.Hour)
		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"token":        tokenString,
			"tournamentId": invite.TournamentID,
			"teamId":       invite.TeamID,
		})
	}
}
