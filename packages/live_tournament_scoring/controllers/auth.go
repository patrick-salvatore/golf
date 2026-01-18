package controllers

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

type AuthController struct {
}

type contextKey string

const (
	TeamId       contextKey = "teamId"
	TournamentId contextKey = "tournamentId"
)

func NewAuthController() *AuthController {
	return &AuthController{}
}

type IndentityData struct {
	TeamId       string `json:"teamId"`
	TournamentId string `json:"tournamentId"`
}

func (a *AuthController) HandleGetIndentity(e *core.RequestEvent) error {
	teamId := e.Request.Context().Value(TeamId).(string)
	tournamentId := e.Request.Context().Value(TournamentId).(string)

	return e.JSON(http.StatusOK, IndentityData{
		TeamId:       teamId,
		TournamentId: tournamentId,
	})
}
