package controllers

import (
	"net/http"

	"github.com/patrick-salvatore/tournament-live-scoring/models"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type CourseController struct {
	app core.App
	db  dbx.Builder
}

func NewCourseController(app core.App) *CourseController {
	return &CourseController{app: app, db: app.DB()}
}

func (cc *CourseController) HandleGetCourses(e *core.RequestEvent) error {
	courses, err := models.GetCourses(cc.db)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, courses)
}

func (cc *CourseController) HandleGetCourseByTournamentId(e *core.RequestEvent) error {
	tournamentId := e.Request.PathValue("tournamentId")
	players, err := models.GetCourseByTournamentId(cc.db, tournamentId)

	if err != nil {
		return e.Error(http.StatusInternalServerError, err.Error(), nil)
	}

	return e.JSON(http.StatusOK, players)
}
