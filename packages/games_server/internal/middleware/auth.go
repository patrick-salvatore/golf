package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
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
		if tid := getStringClaim(claims, "tournamentId"); tid != "" {
			ctx = context.WithValue(ctx, TournamentIDKey, tid)
		}
		if teamId := getStringClaim(claims, "teamId"); teamId != "" {
			ctx = context.WithValue(ctx, TeamIDKey, teamId)
		}
		if playerId := getStringClaim(claims, "playerId"); playerId != "" {
			ctx = context.WithValue(ctx, PlayerIDKey, playerId)
		}
		if isAdmin, ok := claims["isAdmin"].(bool); ok {
			ctx = context.WithValue(ctx, IsAdminKey, isAdmin)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

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
