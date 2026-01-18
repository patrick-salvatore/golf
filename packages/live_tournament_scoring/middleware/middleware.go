package middleware

import (
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/patrick-salvatore/tournament-live-scoring/controllers"
	"github.com/patrick-salvatore/tournament-live-scoring/models"
	"github.com/pocketbase/pocketbase/core"

	"context"
)

type JwtClaims struct {
	KindeId string `json:"sub"`
	Email   string `json:"email"`
	jwt.RegisteredClaims
}

func WithJWTVerify(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		authHeader := e.Request.Header.Get("Authorization")
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		claims, err := models.VerifyJwtToken(tokenString)
		if err != nil {
			return e.Error(308, "unauthorized", "verifyJwtToken")
		}

		tournamentId, ok := claims["tournamentId"].(string)
		if !ok {
			return e.Error(308, "unauthorized", "tournament_id not found")
		}

		teamId, ok := claims["teamId"].(string)
		if !ok {
			return e.Error(308, "unauthorized", "team_id not found")
		}

		tourney, err := models.GetTournamentById(app.DB(), tournamentId)
		if tourney.IsComplete {
			return e.Error(308, "unauthorized", "tournament has completed")
		}

		rCtx := e.Request.Context()
		rCtx = context.WithValue(rCtx, controllers.TeamId, teamId)
		rCtx = context.WithValue(rCtx, controllers.TournamentId, tournamentId)

		e.Request = e.Request.WithContext(rCtx)

		app.Logger().Info("Token is valid")

		return e.Next()
	}
}
