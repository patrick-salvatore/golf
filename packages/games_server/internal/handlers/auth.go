package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/patrick-salvatore/games-server/internal/middleware"
	"github.com/patrick-salvatore/games-server/internal/security"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// Helper to robustly extract string claims (handles string, float64, int)
func getStringClaim(claims map[string]interface{}, key string) string {
	val, ok := claims[key]
	if !ok {
		return ""
	}
	switch v := val.(type) {
	case string:
		return v
	case float64:
		// JWT parser often treats numbers as float64
		return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%f", v), "0"), ".")
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	default:
		return ""
	}
}

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
					tournamentID = getStringClaim(claims, "tournamentId")
					teamID = getStringClaim(claims, "teamId")
					playerID = getStringClaim(claims, "playerId")
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
		tournamentIDQuery := r.URL.Query().Get("tournamentId")

		tournamentID, err := strconv.Atoi(tournamentIDQuery)
		if err != nil {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
			return
		}

		if tournamentID == 0 {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
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
		// Look for context first (legacy/internal), but primarily expect body now for public
		ctxTournamentID, _ := r.Context().Value(middleware.TournamentIDKey).(string)
		ctxTeamID, _ := r.Context().Value(middleware.TeamIDKey).(string)

		// Define input to accept integers as sent by client
		var input struct {
			PlayerID     int `json:"playerId"`
			TournamentID int `json:"tournamentId"`
			TeamID       int `json:"teamId"` // Optional
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid body", http.StatusBadRequest)
			return
		}

		// Prefer input from body (public flow), fallback to context
		tournamentID := input.TournamentID
		if tournamentID == 0 && ctxTournamentID != "" {
			tournamentID, _ = strconv.Atoi(ctxTournamentID)
		}

		teamID := input.TeamID
		if teamID == 0 && ctxTeamID != "" {
			teamID, _ = strconv.Atoi(ctxTeamID)
		}

		if tournamentID == 0 {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
			return
		}
		if input.PlayerID == 0 {
			http.Error(w, "Player ID required", http.StatusBadRequest)
			return
		}

		// Use IDs directly for DB operations
		if err := db.SelectPlayer(tournamentID, input.PlayerID); err != nil {
			// Check for unique constraint violation (already selected)
			if strings.Contains(err.Error(), "UNIQUE constraint failed") || strings.Contains(err.Error(), "duplicate key") {
				http.Error(w, "Player already active", http.StatusConflict)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Fetch player to get admin status
		player, err := db.GetPlayer(input.PlayerID)
		if err != nil {
			http.Error(w, "Failed to fetch player details", http.StatusInternalServerError)
			return
		}

		// Generate new token with full identity
		// Ensure IDs are strings for JWT consistency
		claims := jwt.MapClaims{
			"tournamentId": strconv.Itoa(tournamentID),
			"playerId":     strconv.Itoa(input.PlayerID),
		}
		if player != nil {
			claims["isAdmin"] = player.IsAdmin
		}
		if teamID != 0 {
			claims["teamId"] = strconv.Itoa(teamID)
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

		// Generate new token with full identity
		claims := jwt.MapClaims{
			"tournamentId": strconv.Itoa(invite.TournamentID),
		}
		if invite.TeamID != 0 {
			claims["teamId"] = strconv.Itoa(invite.TeamID)
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
