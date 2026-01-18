package models

import (
	"fmt"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
)

type Tournament struct {
	Id              string  `db:"id" json:"id"`
	Name            string  `db:"name" json:"name"`
	CourseId        string  `db:"course_id" json:"courseId"`
	TeamCount       float64 `db:"team_count" json:"teamCount"`
	HoleCount       float64 `db:"hole_count" json:"holeCount"`
	AwardedHandicap float64 `db:"awarded_handicap" json:"awardedHandicap"`
	IsComplete      bool    `db:"complete" json:"complete"`
	IsMatchPlay     bool    `db:"is_match_play" json:"isMatchPlay"`
	FormatId        string  `db:"format_id" json:"formatId"`
}

type TournamentFormat struct {
	Id   string `db:"id" json:"id"`
	Name string `db:"name" json:"name"`
}

func GetTournaments(db dbx.Builder) (*[]Tournament, error) {
	var tournaments []Tournament

	err := db.
		NewQuery(`
			SELECT 
				tournaments.*,
				tournament_formats.id AS format_id
			FROM tournaments
			JOIN tournament_formats ON tournament_formats.id = tournaments.tournament_format_id
		`).
		All(&tournaments)

	if err != nil {
		return nil, err
	}

	return &tournaments, nil
}

func GetTournamentById(db dbx.Builder, id string) (*Tournament, error) {
	var tournament Tournament

	err := db.
		NewQuery("SELECT * FROM tournaments WHERE id = {:id} AND complete != 1").
		Bind(dbx.Params{
			"id": id,
		}).
		One(&tournament)

	if err != nil {
		return nil, err
	}

	return &tournament, nil
}

func GetAllTournamentFormats(db dbx.Builder) (*[]TournamentFormat, error) {
	var formats []TournamentFormat

	err := db.
		NewQuery("SELECT * FROM tournament_formats").
		All(&formats)

	if err != nil {
		return nil, err
	}

	return &formats, nil
}

type CreateTournamentData struct {
	Name            string   `json:"name,omitempty"`
	CourseId        string   `json:"courseId,omitempty"`
	FormatId        string   `json:"formatId,omitempty"`
	Players         []Player `json:"players,omitempty"`
	AwardedHandicap float64  `json:"awardedHandicap,omitempty"`
	TeamCount       int      `json:"teamCount,omitempty"`
	IsMatchPlay     bool     `json:"isMatchPlay,omitempty"`
}

func CreateTournament(db dbx.Builder, courseId string, formatId string, name string, teamCount int, awardedHandicap float64, isMatchPlay bool) (*Tournament, error) {
	var tournament Tournament

	err := db.
		NewQuery(`
		INSERT INTO tournaments (course_id, tournament_format_id, name, team_count, awarded_handicap, hole_count, complete, is_match_play, created, updated)
		VALUES ({:course_id}, {:tournament_format_id}, {:name}, {:team_count}, {:awarded_handicap}, {:hole_count}, {:complete}, {:is_match_play}, {:created}, {:updated})
		RETURNING *
	`).
		Bind(dbx.Params{
			"course_id":            courseId,
			"tournament_format_id": formatId,
			"name":                 name,
			"team_count":           teamCount,
			"awarded_handicap":     awardedHandicap,
			"hole_count":           18,
			"complete":             false,
			"is_match_play":        isMatchPlay,
			"created":              time.Now().Format(time.RFC3339),
			"updated":              time.Now().Format(time.RFC3339),
		}).
		One(&tournament)

	if err != nil {
		return nil, err
	}

	return &tournament, nil
}

type TournamentUpdate struct {
	Name            *string   `json:"name,omitempty"`
	CourseId        *string   `json:"courseId,omitempty"`
	FormatId        *string   `json:"formatId,omitempty"`
	Players         *[]Player `json:"players,omitempty"`
	AwardedHandicap *float64  `json:"awardedHandicap,omitempty"`
	TeamCount       *int      `json:"teamCount,omitempty"`
	IsMatchPlay     *bool     `json:"isMatchPlay,omitempty"`
}

func UpdateTournament(db dbx.Builder, tournamentId string, updates TournamentUpdate) (*TournamentUpdate, error) {
	var setParts []string
	params := dbx.Params{"id": tournamentId}

	if updates.CourseId != nil {
		params["course_id"] = *updates.CourseId
		setParts = append(setParts, "course_id = {:course_id}")
	}
	if updates.FormatId != nil {
		params["tournament_format_id"] = *updates.FormatId
		setParts = append(setParts, "tournament_format_id = {:tournament_format_id}")
	}
	if updates.Name != nil {
		params["name"] = *updates.Name
		setParts = append(setParts, "name = {:name}")
	}
	if updates.TeamCount != nil {
		params["team_count"] = *updates.TeamCount
		setParts = append(setParts, "team_count = {:team_count}")
	}
	if updates.AwardedHandicap != nil {
		params["awarded_handicap"] = *updates.AwardedHandicap
		setParts = append(setParts, "awarded_handicap = {:awarded_handicap}")
	}
	if updates.IsMatchPlay != nil {
		params["is_match_play"] = *updates.IsMatchPlay
		setParts = append(setParts, "is_match_play = {:is_match_play}")
	}

	if len(setParts) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	// Always update the 'updated' timestamp
	setParts = append(setParts, "updated = {:updated}")
	params["updated"] = time.Now().Format(time.RFC3339)

	query := fmt.Sprintf(`
		UPDATE tournaments
		SET %s 
		WHERE id = {:id}
	`, strings.Join(setParts, ", "))

	_, err := db.NewQuery(query).Bind(params).Execute()
	if err != nil {
		return nil, err
	}

	return &updates, nil
}
