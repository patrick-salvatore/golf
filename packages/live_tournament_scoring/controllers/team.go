package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/patrick-salvatore/tournament-live-scoring/models"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type TeamsController struct {
	app core.App
	db  dbx.Builder
}

func NewTeamsController(app core.App) *TeamsController {
	return &TeamsController{app: app, db: app.DB()}
}

func (tc *TeamsController) HandleGetTeamById(e *core.RequestEvent) error {
	teamId := e.Request.PathValue("teamId")
	team, err := models.GetTeamById(tc.db, teamId)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, team)
}

func (tc *TeamsController) HandleGetTeamsByTournamentId(e *core.RequestEvent) error {
	teamId := e.Request.PathValue("tournamentId")
	team, err := models.GetTeamsByTournamentId(tc.db, teamId)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, team)
}

func (tc *TeamsController) HandleGetTeams(e *core.RequestEvent) error {
	teams, err := models.GetTeams(tc.db)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, teams)
}

func (tc *TeamsController) HandleGetTeamHoles(e *core.RequestEvent) error {
	teamId := e.Request.PathValue("teamId")

	team, err := models.GetTeamById(tc.db, teamId)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	tournament, err := models.GetTournamentById(tc.db, team.TournamentId)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	players, err := models.GetPlayersFromTeamId(tc.db, team.Id)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	var playerMap = make(map[string]models.Player)
	for _, player := range *players {
		playerMap[player.Id] = player
	}

	course, err := models.GetCourseByTournamentId(tc.db, team.TournamentId)
	if err != nil {
		return err
	}

	holes, err := models.GetTeamHoles(tc.db, teamId)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	holesWithStrokeHole := []models.HoleWithMetadata{}
	for _, hole := range *holes {
		playerTee := playerMap[hole.PlayerId].Tee
		holeIndex := (course.Meta.Holes)[hole.Number-1].Handicap
		courseTeeData := course.Meta.Tees[playerTee]

		hole.StrokeHole = getStrokeHole(hole.PlayerHandicap, float64(courseTeeData.SlopeRating), courseTeeData.CourseRating, float64(courseTeeData.Par), tournament.AwardedHandicap, holeIndex)

		holesWithStrokeHole = append(holesWithStrokeHole, hole)
	}

	return e.JSON(http.StatusOK, holesWithStrokeHole)
}

func (tc *TeamsController) HandleGetTeamPlayers(e *core.RequestEvent) error {
	teamId := e.Request.PathValue("teamId")
	players, err := models.GetPlayersFromTeamId(tc.db, teamId)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, players)
}

func (tc *TeamsController) HandleGetPlayersByTeamId(e *core.RequestEvent) error {
	teamId := e.Request.PathValue("teamId")
	team, err := models.GetPlayersFromTeamId(tc.db, teamId)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, team)
}

func (tc *TeamsController) HandleUpdateTeam(e *core.RequestEvent) error {
	teamId := e.Request.PathValue("teamId")
	var teamPayload models.TeamUpdate

	err := json.NewDecoder(e.Request.Body).Decode(&teamPayload)
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}

	team, err := models.UpdateTeam(tc.db, teamId, teamPayload)
	if err != nil {
		return err
	}

	return e.JSON(http.StatusOK, team)
}

func (tc *TeamsController) HandleAssignPlayerTeam(e *core.RequestEvent) error {
	teamId := e.Request.PathValue("teamId")

	team, err := models.GetTeamById(tc.db, teamId)
	if err != nil {
		return e.NotFoundError(err.Error(), teamId)
	}

	tokenData := map[string]any{
		"teamId":       team.Id,
		"tournamentId": team.TournamentId,
	}

	jwt, err := models.NewAuthToken(tokenData)
	if err != nil {
		return e.InternalServerError("Failed to create session JWT", err)
	}

	return e.JSON(http.StatusOK, map[string]string{
		"token":        jwt,
		"teamId":       team.Id,
		"tournamentId": team.TournamentId,
	})
}
