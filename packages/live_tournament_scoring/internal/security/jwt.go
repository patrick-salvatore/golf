package security

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/patrick-salvatore/tournament-live-scoring/internal/utils"
)

func ParseUnverifiedJWT(token string) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}

	parser := &jwt.Parser{}
	_, _, err := parser.ParseUnverified(token, claims)

	if err == nil {
		err = jwt.NewValidator(jwt.WithIssuedAt()).Validate(claims)
	}

	return claims, err
}

func ParseJWT(token string) (jwt.MapClaims, error) {
	signingKey := utils.GetEnvVarOrPanic("ACCESS_TOKEN_SECRET")

	parser := jwt.NewParser(jwt.WithValidMethods([]string{"HS256"}))

	parsedToken, err := parser.Parse(token, func(t *jwt.Token) (any, error) {
		return []byte(signingKey), nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok && parsedToken.Valid {
		return claims, nil
	}

	return nil, errors.New("unable to parse token")
}

func NewJWT(payload jwt.MapClaims, duration time.Duration) (string, error) {
	signingKey := utils.GetEnvVarOrPanic("ACCESS_TOKEN_SECRET")

	claims := jwt.MapClaims{
		"exp": jwt.NewNumericDate(time.Now().Add(duration)),
		"iat": jwt.NewNumericDate(time.Now()).Unix(),
	}

	for k, v := range payload {
		claims[k] = v
	}

	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(signingKey))
}
