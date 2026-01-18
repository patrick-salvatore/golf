package controllers

import (
	"net/http"

	"github.com/patrick-salvatore/tournament-live-scoring/models"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type PlayersController struct {
	app core.App
	db  dbx.Builder
}

func NewPlayersController(app core.App) *PlayersController {
	return &PlayersController{app: app, db: app.DB()}
}

func (pc *PlayersController) HandleGetPlayers(e *core.RequestEvent) error {
	players, err := models.GetAllPlayers(pc.db)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, players)
}

func (pc *PlayersController) HandleGetPlayersByTournament(e *core.RequestEvent) error {
	tournamentId := e.Request.PathValue("tournamentId")
	players, err := models.GetPlayersByTournament(pc.db, tournamentId)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, players)
}
