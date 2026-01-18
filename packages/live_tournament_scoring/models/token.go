package models

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/patrick-salvatore/tournament-live-scoring/internal/security"
)

var (
	jwtLifeSpan = 2 * 24 * time.Hour // 2 days
)

type TokenClaims struct {
	TournamentId string `json:"tournamentId"`
}

func NewAuthToken(data map[string]any) (string, error) {
	claims := jwt.MapClaims{}

	for k, v := range data {
		claims[k] = v
	}

	return security.NewJWT(claims, jwtLifeSpan)
}

func VerifyJwtToken(tokenString string) (jwt.MapClaims, error) {
	claims, err := security.ParseJWT(tokenString)
	if err != nil {
		return nil, err
	}

	return claims, nil
}
