package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/patrick-salvatore/games-server/internal/security"
	"github.com/patrick-salvatore/games-server/internal/store"
)

type contextKey string

const (
	TeamIDKey                   contextKey = "teamId"
	TournamentIDKey             contextKey = "tournamentId"
	PlayerIDKey                 contextKey = "playerId"
	IsAdminKey                  contextKey = "isAdmin"
	UserResfreshTokenVersionKey contextKey = "UserResfreshTokenVersionKey"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Fallback: Check Query String for SSE connections
		if tokenString == "" || tokenString == authHeader {
			tokenString = r.URL.Query().Get("token")
		}

		if tokenString == "" {
			http.Error(w, "Bearer token required", http.StatusUnauthorized)
			return
		}

		claims, err := security.VerifyJwtToken(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		ctx := r.Context()
		ctx = context.WithValue(ctx, TournamentIDKey, claims.TournamentId)
		ctx = context.WithValue(ctx, TeamIDKey, claims.TeamId)
		ctx = context.WithValue(ctx, PlayerIDKey, claims.PlayerId)
		ctx = context.WithValue(ctx, IsAdminKey, claims.IsAdmin)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RefreshTokenAuthMiddleware(db *store.Store) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get the token from the Authorization header
			tokenString := r.Header.Get("Authorization")
			if tokenString == "" {
				http.Error(w, "Bearer token required", http.StatusUnauthorized)
				return
			}
			fmt.Println(tokenString, len(strings.Split(tokenString, " ")) != 2, strings.ToLower(strings.Split(tokenString, " ")[0]) != "bearer")

			// Bearer token format
			if len(strings.Split(tokenString, " ")) != 2 || strings.ToLower(strings.Split(tokenString, " ")[0]) != "bearer" {
				http.Error(w, "Bearer token required", http.StatusUnauthorized)
				return
			}

			// Get the actual token
			tokenString = strings.Split(tokenString, " ")[1]
			// verify RefreshToken
			refreshTokenData, err := security.VerifyRefreshToken(tokenString)
			if err != nil {
				http.Error(w, "", http.StatusUnauthorized)
				return
			}

			player, err := db.GetPlayer(refreshTokenData.PlayerId)
			fmt.Println(player.RefreshTokenVersion, refreshTokenData.Version)

			if err != nil || player.RefreshTokenVersion != refreshTokenData.Version {
				http.Error(w, "", http.StatusUnauthorized)
				return
			}

			ctx := r.Context()
			ctx = context.WithValue(ctx, TournamentIDKey, refreshTokenData.TournamentId)
			ctx = context.WithValue(ctx, TeamIDKey, refreshTokenData.TeamId)
			ctx = context.WithValue(ctx, PlayerIDKey, refreshTokenData.PlayerId)
			ctx = context.WithValue(ctx, IsAdminKey, refreshTokenData.IsAdmin)
			ctx = context.WithValue(ctx, UserResfreshTokenVersionKey, refreshTokenData.Version)

			r = r.WithContext(ctx)
			next.ServeHTTP(w, r)
		})
	}
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		isAdmin, ok := r.Context().Value(IsAdminKey).(bool)
		if !ok || !isAdmin {
			http.Error(w, "Admin access required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireTournamentOrAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		isAdmin, _ := r.Context().Value(IsAdminKey).(bool)
		tournamentId, _ := r.Context().Value(TournamentIDKey).(string)

		if !isAdmin && tournamentId == "" {
			http.Error(w, "Tournament invite or Admin access required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
