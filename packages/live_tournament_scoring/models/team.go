package models

import (
	"fmt"
	"strings"
	"time"

	"github.com/patrick-salvatore/tournament-live-scoring/internal/security"
	"github.com/pocketbase/dbx"
)

type Team struct {
	Id           string `db:"id" json:"id"`
	Name         string `db:"name" json:"name"`
	TournamentId string `db:"tournament_id" json:"tournamentId"`
	Finished     bool   `db:"finished" json:"finished"`
	Started      bool   `db:"started" json:"started"`
}

func GetTeamById(db dbx.Builder, teamId string) (*Team, error) {
	team := Team{}
	err := db.
		NewQuery(`
			SELECT 
				teams.*
			FROM teams
			JOIN tournaments ON teams.tournament_id = tournaments.id
			WHERE teams.id = {:team_id} AND tournaments.complete = 0
		`).
		Bind(dbx.Params{
			"team_id": teamId,
		}).
		One(&team)
	if err != nil {
		return nil, err
	}

	return &team, nil
}

func GetTeams(db dbx.Builder) (*[]Team, error) {
	team := []Team{}
	err := db.
		NewQuery(`
			SELECT 
				teams.*
			FROM teams
		`).
		All(&team)

	if err != nil {
		return nil, err
	}

	return &team, nil
}

func GetTeamsByTournamentId(db dbx.Builder, tournamentId string) (*[]Team, error) {
	teams := []Team{}
	err := db.
		NewQuery(`
			SELECT 
				teams.*
			FROM teams
			WHERE teams.tournament_id = {:tournament_id}
		`).
		Bind(dbx.Params{
			"tournament_id": tournamentId,
		}).
		All(&teams)

	if err != nil {
		return nil, err
	}

	return &teams, nil
}

type TeamWithPlayer struct {
	Team
	Players []Player `json:"players"`
}
type TeamUpdate struct {
	Name     *string `json:"name,omitempty"`
	Finished *bool   `json:"finished,omitempty"`
	Started  *bool   `json:"started,omitempty"`
}

func UpdateTeam(db dbx.Builder, teamId string, updates TeamUpdate) (*TeamUpdate, error) {
	var setParts []string
	params := dbx.Params{"teamId": teamId}

	if updates.Name != nil {
		params["name"] = *updates.Name
		setParts = append(setParts, "name = {:name}")
	}
	if updates.Finished != nil {
		params["finished"] = *updates.Finished
		setParts = append(setParts, "finished = {:finished}")
	}
	if updates.Started != nil {
		params["started"] = *updates.Started
		setParts = append(setParts, "started = {:started}")
	}

	if len(setParts) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	// Always update the 'updated' timestamp
	setParts = append(setParts, "updated = {:updated}")
	params["updated"] = time.Now().Format(time.RFC3339)

	query := fmt.Sprintf(`
		UPDATE teams 
		SET %s 
		WHERE id = {:teamId}
	`, strings.Join(setParts, ", "))

	_, err := db.NewQuery(query).Bind(params).Execute()
	if err != nil {
		return nil, err
	}

	return &updates, nil
}

type TeamCreate struct {
	Id           string `json:"name"`
	Name         string `db:"name" json:"name"`
	TournamentId string `db:"tournament_id" json:"tournamentId"`
	Finished     bool   `db:"finished" json:"finished"`
	Started      bool   `db:"started" json:"started"`
}

type TeamWithPlayerCreate struct {
	Team    TeamCreate `json:"team"`
	Players []Player   `json:"players"`
}

func CreateTeam(db dbx.Builder, tournamentId string, name string) (*Team, error) {
	var team Team

	err := db.
		NewQuery(`
		INSERT INTO teams (id, name, tournament_id, started, finished, created, updated)
		VALUES ({:id}, {:name}, {:tournament_id}, {:started}, {:finished}, {:created}, {:updated})
		RETURNING *
	`).
		Bind(dbx.Params{
			"id":            strings.ToLower(security.RandomString(6)),
			"name":          name,
			"tournament_id": tournamentId,
			"started":       false,
			"finished":      false,
			"created":       time.Now().Format(time.RFC3339),
			"updated":       time.Now().Format(time.RFC3339),
		}).
		One(&team)

	if err != nil {
		return nil, err
	}

	return &team, nil
}

func CreateTeamPlayerLookup(db dbx.Builder, teamId string, playerId string, tee string, tournamentId string) (bool, error) {
	_, err := db.
		NewQuery(`
			INSERT INTO _team_players (team_id, player_id, tee, tournament_id, created, updated)
			VALUES ({:team_id}, {:player_id}, {:tee}, {:tournament_id}, {:created}, {:updated})
			RETURNING *
		`).
		Bind(dbx.Params{
			"team_id":       teamId,
			"player_id":     playerId,
			"tee":           tee,
			"tournament_id": tournamentId,
			"created":       time.Now().Format(time.RFC3339),
			"updated":       time.Now().Format(time.RFC3339),
		}).
		Execute()

	if err != nil {
		return false, err
	}

	return true, nil
}

func DeleteTournamentTeams(db dbx.Builder, tournamentId string) (bool, error) {
	_, err := db.
		NewQuery(`
			DELETE FROM _team_players 
			WHERE team_id IN (
				SELECT id FROM teams WHERE tournament_id = {:tournament_id}
			)
		`).
		Bind(dbx.Params{
			"tournament_id": tournamentId,
		}).
		Execute()

	if err != nil {
		return false, err
	}

	_, err = db.
		NewQuery(`
			DELETE FROM teams 
				WHERE teams.tournament_id = {:tournament_id}
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
