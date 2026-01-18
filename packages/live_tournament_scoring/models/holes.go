package models

import (
	"fmt"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
)

type Hole struct {
	Id       string `db:"id" json:"id"`
	Score    string `db:"score" json:"score"`
	Number   int    `db:"number" json:"number"`
	PlayerId string `db:"player_id" json:"playerId"`
	TeamId   string `db:"team_id" json:"teamId"`

	PlayerHandicap float64 `db:"player_handicap" json:"-"`
	StrokeHole     int     `json:"strokeHole"`
}

type HoleMetaData struct {
	PlayerName                string  `db:"player_name" json:"playerName"`
	TeamId                    string  `db:"team_id" json:"teamId"`
	TournamentId              string  `db:"tournament_id" json:"tournamentId"`
	PlayerHandicap            float64 `db:"player_handicap" json:"playerHandicap"`
	AwardedTournamentHandicap float64 `db:"awarded_handicap" json:"awardedTournamentHandicap"`
}

type HoleWithMetadata struct {
	Id                        string  `db:"id" json:"id"`
	Score                     string  `db:"score" json:"score"`
	Number                    int     `db:"number" json:"number"`
	PlayerId                  string  `db:"player_id" json:"playerId"`
	StrokeHole                int     `json:"strokeHole"`
	PlayerName                string  `db:"player_name" json:"playerName"`
	TeamId                    string  `db:"team_id" json:"teamId"`
	Tee                       string  `db:"tee" json:"tee"`
	TournamentId              string  `db:"tournament_id" json:"tournamentId"`
	PlayerHandicap            float64 `db:"player_handicap" json:"playerHandicap"`
	AwardedTournamentHandicap float64 `db:"awarded_handicap" json:"awardedTournamentHandicap"`
}

func GetHoles(db dbx.Builder) (*[]HoleWithMetadata, error) {
	var hole []HoleWithMetadata

	err := db.
		NewQuery("SELECT * FROM holes").
		All(&hole)

	if err != nil {
		return nil, err
	}

	return &hole, nil
}

func GetTournamentHoles(db dbx.Builder, tournamentId string, teamIds []string) (*[]HoleWithMetadata, error) {
	var holes []HoleWithMetadata

	if len(teamIds) == 0 {
		return &holes, nil
	}

	// Build placeholders for IN clause
	placeholders := make([]string, len(teamIds))
	params := dbx.Params{"tournament_id": tournamentId}

	for i, teamId := range teamIds {
		placeholder := fmt.Sprintf("team_id_%d", i)
		placeholders[i] = fmt.Sprintf("{:%s}", placeholder)
		params[placeholder] = teamId
	}

	query := fmt.Sprintf(`
		SELECT 
			holes.*, 
			players.name AS player_name, 
			players.handicap AS player_handicap, 
			tournaments.awarded_handicap as awarded_handicap,
			_team_players.team_id as team_id,
			_team_players.tee as tee
		FROM holes 
		JOIN players ON holes.player_id = players.id 
		JOIN tournaments ON holes.tournament_id = tournaments.id 
		JOIN _team_players ON _team_players.player_id = players.id 
			AND _team_players.tournament_id = holes.tournament_id 
		WHERE holes.tournament_id = {:tournament_id} 
		AND _team_players.team_id IN (%s) 
		ORDER BY holes.player_id, holes.number 
	`, strings.Join(placeholders, ", "))

	err := db.
		NewQuery(query).
		Bind(params).
		All(&holes)

	if err != nil {
		return nil, err
	}

	return &holes, nil
}

func GetPlayerHoles(db dbx.Builder, playerId string) (*[]HoleWithMetadata, error) {
	var holes []HoleWithMetadata

	err := db.
		NewQuery(`
			SELECT 
				holes.*,
				_team_players.team_id AS team_id,
				_team_players.tee AS tee,
				players.name AS player_name,
				players.handicap AS player_handicap,
				players.id AS player_id,
				tournaments.awarded_handicap as awarded_handicap
			FROM holes
			JOIN players ON holes.player_id = players.id
			JOIN _team_players ON _team_players.player_id = players.id
			JOIN teams ON _team_players.team_id = teams.id
			JOIN tournaments ON tournaments.id = teams.tournament_id
			WHERE holes.player_id = {:player_id}
			GROUP BY holes.player_id, holes.number
			ORDER BY holes.number
		`).
		Bind(dbx.Params{
			"player_id": playerId,
		}).
		All(&holes)

	if err != nil {
		return nil, err
	}

	return &holes, nil
}

func GetTeamHoles(db dbx.Builder, teamId string) (*[]HoleWithMetadata, error) {
	var holes []HoleWithMetadata

	err := db.
		NewQuery(`
			SELECT 
				holes.*,
				_team_players.team_id AS team_id,
				_team_players.tee AS tee,
				players.name AS player_name,
				players.handicap AS player_handicap,
				players.id AS player_id,
				tournaments.awarded_handicap AS awarded_handicap
			FROM holes
			JOIN players ON holes.player_id = players.id
			JOIN _team_players ON _team_players.player_id = players.id
			JOIN teams ON _team_players.team_id = teams.id
			JOIN tournaments ON tournaments.id = teams.tournament_id
			WHERE _team_players.team_id = {:team_id}
			ORDER BY holes.number
		`).
		Bind(dbx.Params{
			"team_id": teamId,
		}).
		All(&holes)

	if err != nil {
		return nil, err
	}

	return &holes, nil
}

// func GetHolesForLeaderboard(db dbx.Builder, tournamentId string) (*[]HoleWithMetadata, error) {
// 	var holes []HoleWithMetadata

// 	err := db.
// 		NewQuery(`
// 			SELECT
// 				holes.*,
// 				players.name AS player_name,
// 				players.handicap AS player_handicap,
// 				tournaments.awarded_handicap as awarded_handicap
// 			FROM holes
// 			JOIN players ON holes.player_id = players.id
//       JOIN tournaments ON holes.tournament_id = tournaments.id
// 			WHERE holes.tournament_id = {:tournament_id} AND teams.id = {:team_id}
// 			ORDER BY holes.player_id, holes.number
// 		`).
// 		Bind(dbx.Params{
// 			"tournament_id": tournamentId,
// 			"team_id":       teamId,
// 		}).
// 		All(&holes)

// 	if err != nil {
// 		return nil, err
// 	}

// 	return &holes, nil
// }

func CreateHoleForPlayer(db dbx.Builder, playerId string, tournamentId string, courseHole CourseHoleData) (*Hole, error) {
	var hole Hole

	err := db.
		NewQuery(`
		INSERT INTO holes (tournament_id, player_id, number, created, updated)
		VALUES ({:tournament_id}, {:player_id}, {:number}, {:created}, {:updated})
		RETURNING *
	`).
		Bind(dbx.Params{
			"tournament_id": tournamentId,
			"player_id":     playerId,
			"number":        courseHole.Number,
			"created":       time.Now().Format(time.RFC3339),
			"updated":       time.Now().Format(time.RFC3339),
		}).
		One(&hole)

	if err != nil {
		return nil, err
	}

	return &hole, nil
}

func CreateAllHolesForPlayer(db dbx.Builder, playerId, tournamentId string, courseData []CourseHoleData) (*[]Hole, error) {
	var holes []Hole
	for _, courseHole := range courseData {
		hole, err := CreateHoleForPlayer(db, playerId, tournamentId, courseHole)
		if err != nil {
			return nil, err
		}
		holes = append(holes, *hole)
	}

	return &holes, nil
}

type HoleUpdate struct {
	Id           *string  `json:"id,omitempty"`
	Score        *string  `json:"score,omitempty"`
	Par          *float64 `json:"par,omitempty"`
	Handicap     *float64 `json:"handicap,omitempty"`
	Number       *float64 `json:"number,omitempty"`
	PlayerId     *string  `json:"playerId,omitempty"`
	TournamentId *string  `json:"tournamentId,omitempty"`
}

func UpdateHoleForPlayer(db dbx.Builder, holeId string, updates HoleUpdate) (*HoleUpdate, error) {
	var setParts []string
	params := dbx.Params{"holeId": holeId}

	if updates.Score != nil {
		setParts = append(setParts, "score = {:score}")
		params["score"] = *updates.Score
	}
	if updates.Par != nil {
		setParts = append(setParts, "par = {:par}")
		params["par"] = *updates.Par
	}
	if updates.Handicap != nil {
		setParts = append(setParts, "handicap = {:handicap}")
		params["handicap"] = *updates.Handicap
	}
	if updates.Number != nil {
		setParts = append(setParts, "number = {:number}")
		params["number"] = *updates.Number
	}
	if updates.PlayerId != nil {
		setParts = append(setParts, "player_id = {:playerId}")
		params["playerId"] = *updates.PlayerId
	}
	if updates.TournamentId != nil {
		setParts = append(setParts, "tournament_id = {:tournamentId}")
		params["tournamentId"] = *updates.TournamentId
	}

	if len(setParts) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	// Always update the 'updated' timestamp
	setParts = append(setParts, "updated = {:updated}")
	params["updated"] = time.Now().Format(time.RFC3339)

	query := fmt.Sprintf(`
		UPDATE holes 
		SET %s 
		WHERE id = {:holeId}
	`, strings.Join(setParts, ", "))

	_, err := db.NewQuery(query).Bind(params).Execute()
	if err != nil {
		return nil, err
	}

	return &updates, nil
}

func DeleteHolesForTeam(db dbx.Builder, tournamentId string) (bool, error) {
	_, err := db.
		NewQuery(`
			DELETE FROM holes 
			WHERE tournament_id = {:tournament_id}
		`).
		Bind(dbx.Params{
			"tournament_id": tournamentId,
		}).
		Execute()

	if err != nil {
		return false, err
	}

	return true, nil
}
