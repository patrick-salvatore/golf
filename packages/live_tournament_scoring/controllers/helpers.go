package controllers

import (
	"math"
	"sort"
	"strings"

	"github.com/patrick-salvatore/tournament-live-scoring/models"
)

func getStrokeHole(playerHandicap, slopeRating, courseRating, par, awardedHandicap float64, holeHandicapIndex int) int {
	sr113 := slopeRating / 113.0
	crPar := courseRating - par
	index := playerHandicap * awardedHandicap

	courseHandicap := int(math.Round(index*sr113 + crPar))

	if courseHandicap <= 0 || holeHandicapIndex < 1 || holeHandicapIndex > 18 {
		return 0
	}

	strokes := 0
	if courseHandicap >= holeHandicapIndex {
		strokes = 1
	}
	if courseHandicap > 18 && holeHandicapIndex <= (courseHandicap-18) {
		strokes++
	}

	return strokes
}

func joinNames(names []string) string {
	sort.Strings(names)
	return strings.Join(names, ", ")
}

func getHoleDataMap(course *models.CourseWithData) models.CourseHoleDataMap {
	courseHoleMap := make(models.CourseHoleDataMap)
	for _, hole := range course.Meta.Holes {
		courseHoleMap[hole.Number] = hole
	}

	return courseHoleMap
}
