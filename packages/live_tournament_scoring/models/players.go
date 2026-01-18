package models

import (
	"fmt"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
)

type Player struct {
	Id       string  `db:"id" json:"id"`
	Name     string  `db:"name" json:"name"`
	Handicap float64 `db:"handicap" json:"handicap"`
	TeamId   string  `db:"team_id" json:"teamId,omitempty"`
	Tee      string  `db:"tee" json:"tee,omitempty"`
}

func GetAllPlayers(db dbx.Builder) (*[]Player, error) {
	players := []Player{}

	err := db.
		NewQuery("SELECT * FROM players").
		All(&players)

	if err != nil {
		return nil, err
	}

	return &players, nil
}

func GetPlayersFromTeamId(db dbx.Builder, teamId string) (*[]Player, error) {
	players := []Player{}

	err := db.
		NewQuery(`
			SELECT 
				players.*,
				_team_players.tee AS tee
			FROM players
			JOIN _team_players ON _team_players.player_id = players.id
			WHERE _team_players.team_id = {:team_id}
		`).
		Bind(dbx.Params{
			"team_id": teamId,
		}).
		All(&players)

	if err != nil {
		return nil, err
	}

	return &players, nil
}

func GetPlayersByTournament(db dbx.Builder, tournamentId string) (*[]Player, error) {
	players := []Player{}

	err := db.
		NewQuery(`
			SELECT 
				players.*, 
				_team_players.tee AS tee 
			FROM players
			JOIN _team_players ON _team_players.player_id = players.id
			JOIN teams ON _team_players.team_id = teams.id
			JOIN tournaments ON teams.tournament_id = tournaments.id
			WHERE tournaments.id = {:tournament_id}
		`).
		Bind(dbx.Params{
			"tournament_id": tournamentId,
		}).
		All(&players)

	if err != nil {
		return nil, err
	}

	return &players, nil
}

type PlayerUpdate struct {
	Name   *string `db:"name"`
	TeamId *string `db:"team_id"`
}

func UpdatePlayer(db dbx.Builder, playerId string, updates PlayerUpdate) (*PlayerUpdate, error) {
	var setParts []string
	params := dbx.Params{"id": playerId}

	if updates.Name != nil {
		params["name"] = *updates.Name
		setParts = append(setParts, "name = {:name}")
	}
	if updates.TeamId != nil {
		params["team_id"] = *updates.TeamId
		setParts = append(setParts, "team_id = {:team_id}")
	}

	if len(setParts) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	// Always update the 'updated' timestamp
	setParts = append(setParts, "updated = {:updated}")
	params["updated"] = time.Now().Format(time.RFC3339)

	query := fmt.Sprintf(`
		UPDATE players 
		SET %s 
		WHERE id = {:id}
	`, strings.Join(setParts, ", "))

	_, err := db.NewQuery(query).Bind(params).Execute()
	if err != nil {
		return nil, err
	}

	return &updates, nil
}
