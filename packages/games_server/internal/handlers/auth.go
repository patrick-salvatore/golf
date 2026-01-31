package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/patrick-salvatore/games-server/internal/middleware"
	"github.com/patrick-salvatore/games-server/internal/security"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// -- Auth --

func GetSession(w http.ResponseWriter, r *http.Request) {
	// Try to get from Context (if middleware ran)
	teamID, ok := r.Context().Value(middleware.TeamIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: teamID", http.StatusBadRequest)
		return
	}
	tournamentID, ok := r.Context().Value(middleware.TournamentIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: tournamentID", http.StatusBadRequest)
		return
	}
	playerID, ok := r.Context().Value(middleware.PlayerIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: playerID", http.StatusBadRequest)
		return
	}
	roundID, ok := r.Context().Value(middleware.RoundIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: roundID", http.StatusBadRequest)
		return
	}
	isAdmin, ok := r.Context().Value(middleware.IsAdminKey).(bool)
	if !ok {
		http.Error(w, "malformed input: isAdmin", http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"teamId":       teamID,
		"tournamentId": tournamentID,
		"playerId":     playerID,
		"roundId":      roundID,
		"isAdmin":      isAdmin,
	})
}

func HandleRefresh(w http.ResponseWriter, r *http.Request) {
	rCtx := r.Context()

	teamID, ok := r.Context().Value(middleware.TeamIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: teamID", http.StatusBadRequest)
	}
	tournamentID, ok := r.Context().Value(middleware.TournamentIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: tournamentID", http.StatusBadRequest)
	}
	playerID, ok := r.Context().Value(middleware.PlayerIDKey).(int)
	if !ok {
		http.Error(w, "malformed input: playerID", http.StatusBadRequest)
	}
	isAdmin, ok := r.Context().Value(middleware.IsAdminKey).(bool)
	if !ok {
		http.Error(w, "malformed input: isAdmin", http.StatusBadRequest)
	}
	userResfreshTokenVersion, ok := rCtx.Value(middleware.UserResfreshTokenVersionKey).(int)
	if !ok {
		http.Error(w, "malformed input: userResfreshTokenVersion", http.StatusBadRequest)
	}

	tokens, err := security.GenerateUserTokens(security.UserTokenParams{
		PlayerId:            playerID,
		TournamentId:        tournamentID,
		TeamId:              teamID,
		IsAdmin:             isAdmin,
		RefreshTokenVersion: userResfreshTokenVersion,
	})
	if err != nil {
		http.Error(w, "unable to create token", http.StatusBadRequest)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(tokens)

}

// -- Session Management --

func GetAvailablePlayers(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentIDQuery := r.URL.Query().Get("tournamentId")
		playerIDQuery := r.URL.Query().Get("playerId")

		tournamentID, err := strconv.Atoi(tournamentIDQuery)
		if err != nil {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
			return
		}

		if tournamentID == 0 {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
			return
		}

		playerID, _ := strconv.Atoi(playerIDQuery)
		if playerID > 0 {
			player, err := db.GetAvailablePlayerById(playerID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(player)
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

type SelectPlayerRequest struct {
	PlayerId     int `json:"playerId"`
	TournamentId int `json:"tournamentId"`
	TeamId       int `json:"teamId"` // Optional
}

func SelectPlayer(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var data SelectPlayerRequest
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			http.Error(w, "Invalid body", http.StatusBadRequest)
			return
		}

		inviteToken := r.Header.Get("X-Invite-Token")
		if inviteToken == "" {
			http.Error(w, "Invite token required", http.StatusUnauthorized)
			return
		}

		tournamentId := data.TournamentId
		teamId := data.TeamId
		playerId := data.PlayerId

		if tournamentId == 0 {
			http.Error(w, "Tournament ID required", http.StatusBadRequest)
			return
		}
		if playerId == 0 {
			http.Error(w, "Player ID required", http.StatusBadRequest)
			return
		}

		player, round, err := db.SelectPlayerTx(inviteToken, tournamentId, playerId)
		if err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") || strings.Contains(err.Error(), "duplicate key") {
				http.Error(w, "Player already active", http.StatusConflict)
				return
			}
			if strings.Contains(err.Error(), "invite") {
				http.Error(w, err.Error(), http.StatusUnauthorized)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		tokens, err := security.GenerateUserTokens(security.UserTokenParams{
			PlayerId:            player.ID,
			TournamentId:        player.TournamentID,
			TeamId:              teamId,
			RoundId:             round.ID,
			IsAdmin:             player.IsAdmin,
			RefreshTokenVersion: player.RefreshTokenVersion,
		})
		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(tokens)
	}
}

func LeaveSession(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournamentIDStr, _ := r.Context().Value(middleware.TournamentIDKey).(string)
		playerIDStr, _ := r.Context().Value(middleware.PlayerIDKey).(string)

		tournamentID, _ := strconv.Atoi(tournamentIDStr)
		playerID, _ := strconv.Atoi(playerIDStr)

		log.Println("playerID", playerID)
		log.Println("tournamentID", tournamentID)

		if tournamentID > 0 && playerID > 0 {
			err := db.UnclaimPlayer(tournamentID, playerID)
			if err != nil {
				http.Error(w, "Failed to remove player from session", http.StatusInternalServerError)
				return
			}
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	}
}

// SwitchRound allows users to switch to a different round in their tournament
func SwitchRound(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get current session context
		tournamentID, ok := r.Context().Value(middleware.TournamentIDKey).(int)
		if !ok {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}
		playerID, ok := r.Context().Value(middleware.PlayerIDKey).(int)
		if !ok {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}
		teamID, ok := r.Context().Value(middleware.TeamIDKey).(int)
		if !ok {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}
		isAdmin, ok := r.Context().Value(middleware.IsAdminKey).(bool)
		if !ok {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}

		// Get requested round ID from URL
		roundIDStr := r.URL.Query().Get("roundId")
		if roundIDStr == "" {
			http.Error(w, "roundId parameter required", http.StatusBadRequest)
			return
		}
		requestedRoundID, err := strconv.Atoi(roundIDStr)
		if err != nil {
			http.Error(w, "Invalid roundId", http.StatusBadRequest)
			return
		}

		// Validate that the round belongs to the user's tournament
		round, err := db.GetTournamentRound(requestedRoundID)
		if err != nil {
			http.Error(w, "Round not found", http.StatusNotFound)
			return
		}
		if round.TournamentID != tournamentID {
			http.Error(w, "Round does not belong to your tournament", http.StatusForbidden)
			return
		}

		// Fetch player to get current refresh token version
		player, err := db.GetPlayer(playerID)
		if err != nil {
			http.Error(w, "Failed to fetch player details", http.StatusInternalServerError)
			return
		}

		// Generate new tokens with updated round ID
		tokens, err := security.GenerateUserTokens(security.UserTokenParams{
			PlayerId:            playerID,
			TournamentId:        tournamentID,
			TeamId:              teamID,
			RoundId:             requestedRoundID,
			IsAdmin:             isAdmin,
			RefreshTokenVersion: player.RefreshTokenVersion,
		})
		if err != nil {
			http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(tokens)
	}
}
