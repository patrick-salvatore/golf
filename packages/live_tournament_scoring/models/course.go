package models

import (
	"encoding/json"
	"maps"
	"sort"
	"strconv"

	"github.com/pocketbase/dbx"
)

type CourseHoleData struct {
	Number   int `json:"number"`
	Par      int `json:"par"`
	Handicap int `json:"handicap"`
}
type Course struct {
	Id         string `db:"id" json:"id,omitempty"`
	Name       string `db:"name" json:"name,omitempty"`
	Tees       string `db:"tees" json:"tees,omitempty"`
	HoleLayout string `db:"hole_layout" json:"holes,omitempty"`
}

type CourseTee struct {
	Gender        string  `json:"gender"`
	Par           int     `json:"par"`
	CourseRating  float64 `json:"course_rating"`
	BogeyRating   float64 `json:"bogey_rating"`
	SlopeRating   int     `json:"slope_rating"`
	RatingF9      float64 `json:"rating_f9"`
	RatingB9      float64 `json:"rating_b9"`
	Front9        string  `json:"front_9"`
	Back9         string  `json:"back_9"`
	BogeyRatingF9 float64 `json:"bogey_rating_f9"`
	BogeyRatingB9 float64 `json:"bogey_rating_b9"`
	SlopeF9       int     `json:"slope_f9"`
	SlopeB9       int     `json:"slope_b9"`
	TeeID         int     `json:"tee_id"`
	Length        int     `json:"length"`
}

type CourseId struct {
	Name string `db:"name" json:"name"`
	Id   string `db:"id" json:"id"`
}

type CourseHoleDataMap map[int]CourseHoleData
type CourseTeeDataMap map[string]CourseTee

type CourseData struct {
	Holes []CourseHoleData `json:"holes"`
	Tees  CourseTeeDataMap `json:"tees"`
}

type CourseWithData struct {
	Course
	Meta CourseData `json:"meta"`
}

func GetCourses(db dbx.Builder) (*[]CourseWithData, error) {
	var results []Course

	err := db.
		NewQuery(`
			SELECT courses.* FROM courses
		`).
		All(&results)

	if err != nil {
		return nil, err
	}

	courses := []CourseWithData{}
	for _, course := range results {
		data, err := getCourseDataFromJson(&course)
		if err != nil {
			return nil, err
		}

		courses = append(courses, CourseWithData{
			Course: Course{
				Id:   course.Id,
				Name: course.Name,
			},
			Meta: CourseData{
				Holes: data.Holes,
				Tees:  data.Tees,
			},
		})
	}

	return &courses, nil
}

func GetCourseByTournamentId(db dbx.Builder, tournamentId string) (*CourseWithData, error) {
	var course Course

	err := db.
		NewQuery(`
			SELECT courses.*
			FROM tournaments
			JOIN courses ON courses.id = tournaments.course_id
			WHERE tournaments.id = {:tournament_id}
		`).
		Bind(dbx.Params{
			"tournament_id": tournamentId,
		}).
		One(&course)

	if err != nil {
		return nil, err
	}

	data, err := getCourseDataFromJson(&course)
	if err != nil {
		return nil, err
	}

	return &CourseWithData{
		Course: course,
		Meta:   data,
	}, nil
}

func getCourseDataFromJson(course *Course) (CourseData, error) {
	var courseHoles map[string]CourseHoleData
	err := json.Unmarshal([]byte(course.HoleLayout), &courseHoles)
	if err != nil {
		return CourseData{}, err
	}

	var holes []CourseHoleData
	for holeNumber, hole := range courseHoles {
		number, err := strconv.Atoi(holeNumber)
		if err != nil {
			return CourseData{}, err
		}

		hole.Number = number + 1
		holes = append(holes, hole)
	}
	sort.Slice(holes, func(i, j int) bool {
		return holes[i].Number < holes[j].Number
	})

	var courseTees map[string]CourseTee
	err = json.Unmarshal([]byte(course.Tees), &courseTees)
	if err != nil {
		return CourseData{}, err
	}

	var tees = make(CourseTeeDataMap)
	maps.Copy(tees, courseTees)

	sort.Slice(holes, func(i, j int) bool {
		return holes[i].Number < holes[j].Number
	})

	return CourseData{
		Holes: holes,
		Tees:  tees,
	}, nil
}
