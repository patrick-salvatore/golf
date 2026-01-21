package security

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/patrick-salvatore/games-server/internal/utils"
)

type JwtClaims struct {
	TeamId       int  `json:"teamId"`
	TournamentId int  `json:"tournamentId"`
	PlayerId     int  `json:"playerId"`
	IsAdmin      bool `json:"isAdmin"`
	jwt.RegisteredClaims
}

type RefreshTokenClaims struct {
	TeamId       int  `json:"teamId"`
	TournamentId int  `json:"tournamentId"`
	PlayerId     int  `json:"playerId"`
	IsAdmin      bool `json:"isAdmin"`
	Version      int  `json:"version"`
	jwt.RegisteredClaims
}

type UserTokenData struct {
	Version      int
	TeamId       int
	TournamentId int
	PlayerId     int
	IsAdmin      bool
}

type Tokens struct {
	Rid string `json:"rid"`
	Jid string `json:"jid"`
}

func GenerateJWT(playerId, tournamentId, teamId int, isAdmin bool) (string, error) {
	secretKey := utils.GetEnvVarOrPanic("ACCESS_TOKEN_SECRET")

	claims := JwtClaims{
		playerId,
		tournamentId,
		teamId,
		isAdmin,
		jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ss, err := token.SignedString([]byte(secretKey))

	return ss, err
}

func GenerateRefreshToken(playerId, tournamentId, teamId int, isAdmin bool, refreshTokenVersion int) (string, error) {
	secretKey := utils.GetEnvVarOrPanic("REFRESH_TOKEN_SECRET")

	claims := RefreshTokenClaims{
		playerId,
		tournamentId,
		teamId,
		isAdmin,
		refreshTokenVersion,
		jwt.RegisteredClaims{
			// may want to change this but have refresh token last 6 months to prevent users getting stuck
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(6 * 30 * (24 * time.Hour))),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ss, err := token.SignedString([]byte(secretKey))

	return ss, err
}

func GenerateUserTokens(playerId, tournamentId, teamId int, isAdmin bool, refreshTokenVersion int) (Tokens, error) {
	jwt, err := GenerateJWT(playerId, tournamentId, teamId, isAdmin)
	if err != nil {
		return Tokens{}, err
	}
	refreshToken, err := GenerateRefreshToken(playerId, tournamentId, teamId, isAdmin, refreshTokenVersion)
	if err != nil {
		return Tokens{}, err
	}

	tokens := Tokens{
		Rid: refreshToken,
		Jid: jwt,
	}

	return tokens, nil
}

func VerifyJwtToken(tokenString string) (UserTokenData, error) {
	secretKey := utils.GetEnvVarOrPanic("ACCESS_TOKEN_SECRET")
	token, err := jwt.ParseWithClaims(tokenString, &JwtClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secretKey), nil
	})
	if err != nil {
		return UserTokenData{}, err
	}

	claims, ok := token.Claims.(*JwtClaims)
	if !ok {
		return UserTokenData{}, fmt.Errorf("unable to verify jwt")
	}

	return UserTokenData{
		TeamId:       claims.TeamId,
		TournamentId: claims.TournamentId,
		PlayerId:     claims.PlayerId,
		IsAdmin:      claims.IsAdmin,
	}, nil
}

func VerifyRefreshToken(tokenString string) (UserTokenData, error) {
	secretKey := utils.GetEnvVarOrPanic("REFRESH_TOKEN_SECRET")
	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secretKey), nil
	})
	if err != nil {
		return UserTokenData{}, err
	}

	claims, ok := token.Claims.(*RefreshTokenClaims)
	if !ok {
		return UserTokenData{}, fmt.Errorf("unable to verify refresh token")
	}

	return UserTokenData{
		TeamId:       claims.TeamId,
		TournamentId: claims.TournamentId,
		PlayerId:     claims.PlayerId,
		IsAdmin:      claims.IsAdmin,
		Version:      claims.Version,
	}, nil
}
