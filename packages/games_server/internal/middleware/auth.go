package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/patrick-salvatore/games-server/internal/security"
)

type contextKey string

const (
	TeamIDKey       contextKey = "teamId"
	TournamentIDKey contextKey = "tournamentId"
	PlayerIDKey     contextKey = "playerId"
	IsAdminKey      contextKey = "isAdmin"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Fallback: Check Query String for SSE connections
		if tokenString == "" || tokenString == authHeader {
			tokenString = r.URL.Query().Get("token")
		}

		if tokenString == "" {
			http.Error(w, "Bearer token required", http.StatusUnauthorized)
			return
		}

		claims, err := security.ParseJWT(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		ctx := r.Context()
		if tid, ok := claims["tournamentId"].(string); ok {
			ctx = context.WithValue(ctx, TournamentIDKey, tid)
		}
		if teamId, ok := claims["teamId"].(string); ok {
			ctx = context.WithValue(ctx, TeamIDKey, teamId)
		}
		if playerId, ok := claims["playerId"].(string); ok {
			ctx = context.WithValue(ctx, PlayerIDKey, playerId)
		}
		if isAdmin, ok := claims["isAdmin"].(bool); ok {
			ctx = context.WithValue(ctx, IsAdminKey, isAdmin)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
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
