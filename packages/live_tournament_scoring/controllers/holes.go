package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/patrick-salvatore/tournament-live-scoring/models"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type HolesController struct {
	db  dbx.Builder
	app core.App
}

func NewHolesController(app core.App) *HolesController {
	return &HolesController{db: app.DB(), app: app}
}

type UpdateHoleData struct {
	HoleId string `json:"holeId"`
	Score  int    `json:"score"`
}

func (hc *HolesController) HandleUpdateTeamHoleScores(e *core.RequestEvent) error {
	var holesPayload []models.HoleUpdate

	err := json.NewDecoder(e.Request.Body).Decode(&holesPayload)
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}

	var updatedHoles []*models.HoleUpdate
	err = hc.app.RunInTransaction(func(txApp core.App) error {
		for _, holeUpdate := range holesPayload {

			updatedHole, err := models.UpdateHoleForPlayer(txApp.DB(), *holeUpdate.Id, holeUpdate)
			if err != nil {
				return fmt.Errorf("failed to update hole %s: %w", *holeUpdate.Id, err)
			}
			updatedHoles = append(updatedHoles, updatedHole)
		}
		return nil
	})

	if err != nil {
		return e.InternalServerError(err.Error(), nil)
	}

	return e.JSON(http.StatusOK, map[string]interface{}{
		"updatedHoles": updatedHoles,
	})

}

func (hc *HolesController) HandleGetHoles(e *core.RequestEvent) error {
	tournamentId := e.Request.URL.Query().Get("tournamentId")
	if len(tournamentId) > 0 {
		teams, err := models.GetTeamsByTournamentId(hc.db, tournamentId)
		if err != nil {
			return e.Error(http.StatusInternalServerError, err.Error(), "GetTeamsByTournamentId")
		}
		teamIds := []string{}
		for _, team := range *teams {
			teamIds = append(teamIds, team.Id)
		}

		data, err := models.GetTournamentHoles(hc.db, tournamentId, teamIds)
		if err != nil {
			return e.Error(http.StatusInternalServerError, err.Error(), "GetHolesForLeaderboard")
		}
		holes, err := getHolesWithStroke(hc.db, data)
		if err != nil {
			return e.Error(http.StatusInternalServerError, err.Error(), "GetHolesForLeaderboard, getHolesWithStroke")
		}
		return e.JSON(http.StatusOK, holes)
	}

	playerId := e.Request.URL.Query().Get("playerId")
	if len(playerId) > 0 {
		data, err := models.GetPlayerHoles(hc.db, playerId)
		if err != nil {
			return e.Error(http.StatusInternalServerError, err.Error(), "GetPlayerHoles")
		}
		holes, err := getHolesWithStroke(hc.db, data)
		if err != nil {
			return e.Error(http.StatusInternalServerError, err.Error(), "GetPlayerHoles, getHolesWithStroke")
		}
		return e.JSON(http.StatusOK, holes)
	}

	teamId := e.Request.URL.Query().Get("teamId")
	if len(teamId) > 0 {
		data, err := models.GetTeamHoles(hc.db, teamId)
		if err != nil {
			return e.Error(http.StatusInternalServerError, err.Error(), "GetTeamHoles")
		}

		holes, err := getHolesWithStroke(hc.db, data)
		if err != nil {
			return e.Error(http.StatusInternalServerError, err.Error(), "GetTeamHoles, getHolesWithStroke")
		}
		return e.JSON(http.StatusOK, holes)
	}

	data, err := models.GetHoles(hc.db)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), "GetHoles")
	}
	holes, err := getHolesWithStroke(hc.db, data)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), "GetHoles")
	}
	return e.JSON(http.StatusOK, holes)
}

func getHolesWithStroke(db dbx.Builder, holes *[]models.HoleWithMetadata) (*[]models.HoleWithMetadata, error) {
	if len(*holes) == 0 {
		return holes, nil
	}
	// holes should be joined and filtered by TournamentId so we can grab first objest
	course, err := models.GetCourseByTournamentId(db, (*holes)[0].TournamentId)
	if err != nil {
		return nil, err
	}

	for index, hole := range *holes {
		playerTee := hole.Tee
		holeIndex := (course.Meta.Holes)[hole.Number-1].Handicap
		courseTeeData := course.Meta.Tees[playerTee]

		hole.StrokeHole = getStrokeHole(
			hole.PlayerHandicap,
			float64(courseTeeData.SlopeRating),
			courseTeeData.CourseRating,
			float64(courseTeeData.Par),
			hole.AwardedTournamentHandicap,
			holeIndex,
		)

		(*holes)[index] = hole
	}

	return holes, nil
}
