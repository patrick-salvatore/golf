package security

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
	"github.com/patrick-salvatore/games-server/internal/utils"
)

type Tokens struct {
	Rid string `json:"rid"`
	Jid string `json:"jid"`
}

type UserTokenParams struct {
	PlayerId            int
	TournamentId        int
	TeamId              int
	RoundId             int
	IsAdmin             bool
	RefreshTokenVersion int
}

func GenerateUserTokens(params UserTokenParams) (Tokens, error) {
	jwt, err := GenerateJWT(params)
	if err != nil {
		return Tokens{}, err
	}
	refreshToken, err := GenerateRefreshToken(params)
	if err != nil {
		return Tokens{}, err
	}

	tokens := Tokens{
		Rid: refreshToken,
		Jid: jwt,
	}

	return tokens, nil
}

type JwtClaims struct {
	PlayerId     int  `json:"playerId"`
	TournamentId int  `json:"tournamentId"`
	TeamId       int  `json:"teamId"`
	RoundId      int  `json:"roundId"`
	IsAdmin      bool `json:"isAdmin"`
	jwt.RegisteredClaims
}

func GenerateJWT(params UserTokenParams) (string, error) {
	secretKey := utils.GetEnvVarOrPanic("ACCESS_TOKEN_SECRET")

	claims := JwtClaims{
		PlayerId:     params.PlayerId,
		TournamentId: params.TournamentId,
		TeamId:       params.TeamId,
		RoundId:      params.RoundId,
		IsAdmin:      params.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ss, err := token.SignedString([]byte(secretKey))

	return ss, err
}

type RefreshTokenClaims struct {
	PlayerId     int  `json:"playerId"`
	TournamentId int  `json:"tournamentId"`
	TeamId       int  `json:"teamId"`
	RoundId      int  `json:"roundId"`
	IsAdmin      bool `json:"isAdmin"`
	Version      int  `json:"version"`
	jwt.RegisteredClaims
}

func GenerateRefreshToken(params UserTokenParams) (string, error) {
	secretKey := utils.GetEnvVarOrPanic("REFRESH_TOKEN_SECRET")

	claims := RefreshTokenClaims{
		PlayerId:     params.PlayerId,
		TournamentId: params.TournamentId,
		TeamId:       params.TeamId,
		RoundId:      params.RoundId,
		IsAdmin:      params.IsAdmin,
		Version:      params.RefreshTokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
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

type TokenData struct {
	Version      int
	TeamId       int
	TournamentId int
	PlayerId     int
	RoundId      int
	IsAdmin      bool
}

func VerifyJwtToken(tokenString string) (TokenData, error) {
	secretKey := utils.GetEnvVarOrPanic("ACCESS_TOKEN_SECRET")
	token, err := jwt.ParseWithClaims(tokenString, &JwtClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secretKey), nil
	})
	if err != nil {
		return TokenData{}, err
	}

	claims, ok := token.Claims.(*JwtClaims)
	if !ok {
		return TokenData{}, fmt.Errorf("unable to verify jwt")
	}

	return TokenData{
		TeamId:       claims.TeamId,
		TournamentId: claims.TournamentId,
		PlayerId:     claims.PlayerId,
		RoundId:      claims.RoundId,
		IsAdmin:      claims.IsAdmin,
	}, nil
}

func VerifyRefreshToken(tokenString string) (TokenData, error) {
	secretKey := utils.GetEnvVarOrPanic("REFRESH_TOKEN_SECRET")
	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secretKey), nil
	})
	if err != nil {
		return TokenData{}, err
	}

	claims, ok := token.Claims.(*RefreshTokenClaims)
	if !ok {
		return TokenData{}, fmt.Errorf("unable to verify refresh token")
	}

	return TokenData{
		TeamId:       claims.TeamId,
		TournamentId: claims.TournamentId,
		PlayerId:     claims.PlayerId,
		RoundId:      claims.RoundId,
		IsAdmin:      claims.IsAdmin,
		Version:      claims.Version,
	}, nil
}

// GetCurrentRound determines the current active round for a tournament based on date and status
func GetCurrentRound(store *store.Store, tournamentID int) (*models.TournamentRound, error) {
	round, err := store.GetActiveTournamentRound(tournamentID)
	if err != nil {
		return nil, err
	}
	if round == nil {
		return nil, err
	}
	return round, nil
}
