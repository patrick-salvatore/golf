package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/jung-kurt/gofpdf"
	"github.com/patrick-salvatore/tournament-live-scoring/models"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type TournamentController struct {
	app core.App
	db  dbx.Builder
}

func NewTournamentController(app core.App) *TournamentController {
	return &TournamentController{app: app, db: app.DB()}
}

func (tc *TournamentController) HandleGetTournaments(e *core.RequestEvent) error {
	tournaments, err := models.GetTournaments(tc.app.DB())

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, tournaments)
}

func (tc *TournamentController) HandleGetTournamentById(e *core.RequestEvent) error {
	tournamentId := e.Request.PathValue("tournamentId")
	tournament, err := models.GetTournamentById(tc.app.DB(), tournamentId)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, tournament)
}

func (tc *TournamentController) HandleGetAllTournamentFormats(e *core.RequestEvent) error {
	formats, err := models.GetAllTournamentFormats(tc.app.DB())

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, formats)
}

func (tc *TournamentController) HandleStartTournamentForTeam(e *core.RequestEvent) error {
	tournamentId := e.Request.PathValue("tournamentId")
	teamId := e.Request.PathValue("teamId")

	course, err := models.GetCourseByTournamentId(tc.db, tournamentId)
	if err != nil {
		return err
	}

	players, err := models.GetPlayersFromTeamId(tc.db, teamId)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	if len(*players) == 0 {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	err = tc.app.RunInTransaction(func(txDb core.App) error {
		for _, player := range *players {
			_, err = models.CreateAllHolesForPlayer(txDb.DB(), player.Id, tournamentId, course.Meta.Holes)
			if err != nil {
				return err
			}

			started := true
			_, err = models.UpdateTeam(txDb.DB(), teamId, models.TeamUpdate{Started: &started})
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusCreated, "OK")
}

func (tc *TournamentController) HandleGetTeamSheetFromTournament(e *core.RequestEvent) error {
	tournamentId := e.Request.PathValue("tournamentId")

	tournament, err := models.GetTournamentById(tc.db, tournamentId)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}
	teams, err := models.GetTeamsByTournamentId(tc.db, tournamentId)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	pdf.SetFont("Arial", "B", 20)
	pdf.Cell(190, 15, tournament.Name)
	pdf.Ln(20)

	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(190, 10, "Team List")
	pdf.Ln(15)

	pdf.SetFont("Arial", "", 12)

	for i, team := range *teams {
		if i%2 == 0 {
			pdf.SetFillColor(240, 240, 240)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		pdf.SetDrawColor(0, 0, 0)
		pdf.SetLineWidth(0.2)

		pdf.CellFormat(20, 10, fmt.Sprintf("%d", i+1), "1", 0, "C", true, 0, "")
		pdf.CellFormat(170, 10, team.Name, "1", 1, "L", true, 0, "")
	}

	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to generate PDF", nil)
	}

	fileName := fmt.Sprintf("%s_teams.pdf", strings.ToLower(strings.Join(strings.Split(tournament.Name, " "), "_")))

	e.Response.Header().Set("Content-Type", "application/pdf")
	e.Response.Header().Set("Content-Disposition", "inline; filename="+fileName)
	e.Response.Header().Set("Content-Length", fmt.Sprintf("%d", buf.Len()))

	_, err = e.Response.Write(buf.Bytes())
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to write PDF response", nil)
	}

	return e.JSON(http.StatusOK, "OK")
}

func (tc *TournamentController) HandleUpdateTournament(e *core.RequestEvent) error {
	var data models.TournamentUpdate
	tournamentId := e.Request.PathValue("tournamentId")

	err := json.NewDecoder(e.Request.Body).Decode(&data)
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}

	err = tc.app.RunInTransaction(func(txDb core.App) error {
		_, err := models.UpdateTournament(txDb.DB(), tournamentId, data)
		if err != nil {
			return err
		}

		_, err = models.DeleteHolesForTeam(txDb.DB(), tournamentId)
		if err != nil {
			return err
		}
		_, err = models.DeleteTournamentTeams(txDb.DB(), tournamentId)
		if err != nil {
			return err
		}

		teams, err := generateTeams(tournamentId, *data.Players, *data.TeamCount)
		if err != nil {
			return err
		}

		for _, team := range *teams {
			newTeam, err := models.CreateTeam(txDb.DB(), team.Team.TournamentId, team.Team.Name)
			if err != nil {
				return err
			}

			for _, player := range team.Players {
				_, err = models.CreateTeamPlayerLookup(txDb.DB(), newTeam.Id, player.Id, player.Tee, tournamentId)
				if err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		return e.InternalServerError(err.Error(), nil)
	}

	return e.JSON(http.StatusCreated, "ok")
}

func (tc *TournamentController) HandleCreateTournament(e *core.RequestEvent) error {
	var data models.CreateTournamentData

	err := json.NewDecoder(e.Request.Body).Decode(&data)
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}

	err = tc.app.RunInTransaction(func(txDb core.App) error {
		tournament, err := models.CreateTournament(txDb.DB(), data.CourseId, data.FormatId, data.Name, data.TeamCount, data.AwardedHandicap, data.IsMatchPlay)
		if err != nil {
			return err
		}

		teams, err := generateTeams(tournament.Id, data.Players, data.TeamCount)
		if err != nil {
			return err
		}

		for _, team := range *teams {
			newTeam, err := models.CreateTeam(txDb.DB(), team.Team.TournamentId, team.Team.Name)
			if err != nil {
				return err
			}

			for _, player := range team.Players {
				_, err = models.CreateTeamPlayerLookup(txDb.DB(), newTeam.Id, player.Id, player.Tee, tournament.Id)
				if err != nil {
					return err
				}
			}
		}

		return nil
	})
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusCreated, "ok")
}

func generateTeams(tournamentId string, players []models.Player, teamCount int) (*[]models.TeamWithPlayerCreate, error) {
	if teamCount <= 0 {
		return nil, fmt.Errorf("invalid TeamCount, must be at least 1")
	}
	if len(players)%teamCount != 0 {
		return nil, fmt.Errorf(fmt.Sprintf("player count (%d) must be divisible by team size (%d)", len(players), teamCount))
	}

	// ensure handicaps are sorts for team match making
	sort.Slice(players, func(i, j int) bool {
		return players[i].Handicap < players[j].Handicap
	})

	teamsCount := len(players) / teamCount
	teams := make([]models.TeamWithPlayerCreate, teamsCount)
	for i := range teamsCount {
		teams[i] = models.TeamWithPlayerCreate{
			Team: models.TeamCreate{
				TournamentId: tournamentId,
			},
			Players: []models.Player{},
		}
	}

	start := 0
	end := len(players) - 1
	index := 0
	for start < end {
		teams[index].Players = append(teams[index].Players, players[start])
		teams[index].Players = append(teams[index].Players, players[end])

		index++
		start++
		end--
	}

	for i, team := range teams {
		playerNames := []string{}
		for _, player := range team.Players {
			playerNames = append(playerNames, fmt.Sprintf(`%s (%v)`, player.Name, player.Handicap))
		}
		teams[i].Team.Name = strings.Join(playerNames, " + ")
	}

	return &teams, nil
}

type LeaderboardRow struct {
	Id             string `json:"id"`
	TeamName       string `json:"teamName"`
	Gross          int    `json:"grossScore"`
	Net            int    `json:"netScore"`
	MatchPlayScore string `json:"matchPlayScore,omitempty"`
	Thru           int    `json:"thru"`
	CoursePar      int    `json:"coursePar"`
}

func (tc *TournamentController) HandleGetLeaderboard(e *core.RequestEvent) error {
	tournamentId := e.Request.PathValue("tournamentId")
	individuals := e.Request.URL.Query().Get("individuals")

	course, err := models.GetCourseByTournamentId(tc.db, tournamentId)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), "GetCourseByTournamentId")
	}

	var courseHoles = make(models.CourseHoleDataMap)
	for _, hole := range course.Meta.Holes {
		courseHoles[hole.Number] = hole
	}

	teams, err := models.GetTeamsByTournamentId(tc.db, tournamentId)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), "GetTeamsByTournamentId")
	}
	teamIds := []string{}
	for _, team := range *teams {
		teamIds = append(teamIds, team.Id)
	}

	holes, err := models.GetTournamentHoles(tc.db, tournamentId, teamIds)
	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), "GetHolesForLeaderboard")
	}

	var coursePar int

	for index, hole := range *holes {
		playerTee := hole.Tee
		holeIndex := (course.Meta.Holes)[hole.Number-1].Handicap
		courseTeeData := course.Meta.Tees[playerTee]

		if coursePar == 0 {
			coursePar = course.Meta.Tees[playerTee].Par
		}

		hole.StrokeHole = getStrokeHole(
			hole.PlayerHandicap,
			float64(courseTeeData.SlopeRating),
			courseTeeData.CourseRating,
			float64(courseTeeData.Par),
			hole.AwardedTournamentHandicap,
			holeIndex)
		(*holes)[index] = hole
	}

	var leaderboardRows []LeaderboardRow

	if individuals == "false" {
		leaderboardRows = getTeamLeaderboard(holes, courseHoles, coursePar)
	} else {
		leaderboardRows = getIndividualLeaderboard(holes, courseHoles, coursePar)
	}

	return e.JSON(http.StatusOK, leaderboardRows)
}

func groupHolesByPlayerByTeam(holes []models.HoleWithMetadata) map[string]map[int][]models.HoleWithMetadata {
	result := make(map[string]map[int][]models.HoleWithMetadata)

	for _, hole := range holes {
		teamID := hole.TeamId
		holeNumber := hole.Number

		if _, ok := result[teamID]; !ok {
			result[teamID] = make(map[int][]models.HoleWithMetadata)
		}
		result[teamID][holeNumber] = append(result[teamID][holeNumber], hole)
	}

	return result
}

func getTeamLeaderboard(holes *[]models.HoleWithMetadata, courseHoles models.CourseHoleDataMap, coursePar int) []LeaderboardRow {
	holesByTeamAndPlayer := groupHolesByPlayerByTeam(*holes)
	leaderboardRows := []LeaderboardRow{}

	for teamId, teamHolesMap := range holesByTeamAndPlayer {
		leaderboardRow := LeaderboardRow{
			CoursePar: coursePar,
		}
		players := map[string]bool{}

		leaderboardRow.Id = teamId

		thruCount := 0
		for _, teamScoreOnHole := range teamHolesMap {
			var holePar int
			var netScore int
			var grossScore int

			for _, hole := range teamScoreOnHole {
				players[hole.PlayerName] = true

				if len(hole.Score) > 0 {
					holePar = courseHoles[hole.Number].Par

					var holeScore int
					if hole.Score == "X" {
						holeScore = 3 + holePar
					} else {
						holeScore, _ = strconv.Atoi(hole.Score)
					}

					if holeScore <= grossScore || grossScore == 0 {
						netScore = holeScore
						grossScore = holeScore

						if hole.StrokeHole > 0 {
							netScore = holeScore - hole.StrokeHole
						}
					}
				}
			}

			if netScore > 0 || grossScore > 0 {
				thruCount++
			}

			leaderboardRow.Thru = thruCount
			leaderboardRow.Gross -= holePar - grossScore
			leaderboardRow.Net -= holePar - netScore
		}

		names := []string{}
		for name := range players {
			names = append(names, name)
		}
		leaderboardRow.TeamName = joinNames(names)

		leaderboardRows = append(leaderboardRows, leaderboardRow)
	}

	return leaderboardRows
}

func groupHolesByPlayer(holes []models.HoleWithMetadata) map[string][]models.HoleWithMetadata {
	result := make(map[string][]models.HoleWithMetadata)

	for _, hole := range holes {
		playerName := hole.PlayerName

		if _, ok := result[playerName]; !ok {
			result[playerName] = []models.HoleWithMetadata{}
		}
		result[playerName] = append(result[playerName], hole)
	}

	return result
}

func getIndividualLeaderboard(holes *[]models.HoleWithMetadata, courseHoles models.CourseHoleDataMap, coursePar int) []LeaderboardRow {
	holesByPlayer := groupHolesByPlayer(*holes)
	leaderboardRows := []LeaderboardRow{}

	for playerName, holes := range holesByPlayer {
		leaderboardRow := LeaderboardRow{
			TeamName:  playerName,
			CoursePar: coursePar,
		}

		var thruHole int
		for _, hole := range holes {
			if len(leaderboardRow.Id) == 0 {
				leaderboardRow.Id = hole.PlayerId
			}

			if len(hole.Score) > 0 {
				holePar := courseHoles[hole.Number].Par

				var holeScore int
				if hole.Score == "X" {
					holeScore = 3 + holePar
				} else {
					holeScore, _ = strconv.Atoi(hole.Score)
				}

				grossScore := holeScore

				netScore := holeScore
				if hole.StrokeHole > 0 {
					netScore = holeScore - hole.StrokeHole
				}

				thruHole += 1
				leaderboardRow.Thru = thruHole
				leaderboardRow.Gross += grossScore - holePar
				leaderboardRow.Net += netScore - holePar
			}
		}
		leaderboardRows = append(leaderboardRows, leaderboardRow)
	}

	return leaderboardRows
}
