package store

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/patrick-salvatore/games-server/internal/models"
	db "github.com/patrick-salvatore/games-server/models"
)

func (s *Store) CreateCourseTx(req models.CreateCourseRequest) (*models.Course, error) {
	var course *models.Course

	err := s.RunInTransaction(func(tx *sql.Tx) error {
		q := s.Queries.WithTx(tx)
		ctx := context.Background()

		// 1. Create Course
		c, err := q.CreateCourse(ctx, db.CreateCourseParams{
			Name: req.Name,
			Data: json.RawMessage("{}"),
		})
		if err != nil {
			return err
		}

		// 2. Create Tee Set
		teeName := req.Tees
		if teeName == "" {
			teeName = "Mens"
		}
		_, err = q.CreateCourseTee(ctx, db.CreateCourseTeeParams{
			CourseID: c.ID,
			Name:     sql.NullString{String: teeName, Valid: true},
		})
		if err != nil {
			return err
		}

		// 3. Create Holes
		holesData := []models.HoleData{}
		for _, h := range req.Holes {
			err := q.CreateCourseHole(ctx, db.CreateCourseHoleParams{
				CourseID:   c.ID,
				TeeSet:     teeName,
				HoleNumber: int64(h.Number),
				Par:        int64(h.Par),
				Handicap:   int64(h.Handicap),
				Yardage:    int64(h.Yardage),
			})
			if err != nil {
				return err
			}
			holesData = append(holesData, models.HoleData{
				Number:          h.Number,
				Par:             h.Par,
				Handicap:        h.Handicap,
				Yardage:         h.Yardage,
				RawHandicap:     h.Handicap,
				AllowedHandicap: 1.0,
			})
		}

		course = &models.Course{
			ID:   int(c.ID),
			Name: c.Name,
			Meta: models.CourseMeta{
				Holes: holesData,
				Tees:  []string{teeName},
			},
		}

		return nil
	})

	return course, err
}

func (s *Store) GetCourseByID(id int) (*models.Course, error) {
	ctx := context.Background()

	c, err := s.Queries.GetCourse(ctx, int64(id))
	if err != nil {
		return nil, err
	}

	hRows, err := s.Queries.GetCourseHoles(ctx, c.ID)
	if err != nil {
		return nil, err
	}

	var holes []models.HoleData
	for _, h := range hRows {
		holes = append(holes, models.HoleData{
			ID:       int(h.ID),
			Number:   int(h.HoleNumber),
			Par:      int(h.Par),
			Handicap: int(h.Handicap),
			Yardage:  int(h.Yardage),
		})
	}

	course := &models.Course{
		ID:   int(c.ID),
		Name: c.Name,
		Meta: models.CourseMeta{
			Holes: holes,
			Tees:  []string{"Mens"},
		},
	}

	return course, nil
}

func (s *Store) UpdateCourseTx(id int, req models.CreateCourseRequest) (*models.Course, error) {
	var course *models.Course
	teeName := req.Tees
	if teeName == "" {
		teeName = "Mens"
	}

	err := s.RunInTransaction(func(tx *sql.Tx) error {
		q := s.Queries.WithTx(tx)
		ctx := context.Background()

		// 1. Update course name
		_, err := q.UpdateCourse(ctx, db.UpdateCourseParams{
			ID:   int64(id),
			Name: req.Name,
			Data: json.RawMessage("{}"),
		})
		if err != nil {
			return err
		}

		// 2. Delete existing holes for this tee set
		if _, err := tx.ExecContext(ctx, "DELETE FROM course_holes WHERE course_id = ? AND tee_set = ?", int64(id), teeName); err != nil {
			return err
		}

		// 3. Create new holes with upsert
		holesData := []models.HoleData{}
		for _, hole := range req.Holes {
			_, err := q.UpdateCourseHole(ctx, db.UpdateCourseHoleParams{
				CourseID:   int64(id),
				TeeSet:     teeName,
				HoleNumber: int64(hole.Number),
				Par:        int64(hole.Par),
				Handicap:   int64(hole.Handicap),
				Yardage:    int64(hole.Yardage),
			})
			if err != nil {
				return err
			}
			holesData = append(holesData, models.HoleData{Number: hole.Number, Par: hole.Par, Handicap: hole.Handicap, Yardage: hole.Yardage})
		}

		course = &models.Course{
			ID:   id,
			Name: req.Name,
			Meta: models.CourseMeta{
				Holes: holesData,
				Tees:  []string{teeName},
			},
		}

		return nil
	})

	return course, err
}

func (s *Store) CourseExistsInRounds(courseID int) (bool, error) {
	ctx := context.Background()

	var exists int64
	err := s.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM tournament_rounds WHERE course_id = ?", int64(courseID)).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists > 0, nil
}

func (s *Store) DeleteCourse(courseID int) error {
	return s.RunInTransaction(func(tx *sql.Tx) error {
		ctx := context.Background()

		// Delete holes for each tee set
		if _, err := tx.ExecContext(ctx, "DELETE FROM course_holes WHERE course_id = ?", int64(courseID)); err != nil {
			return err
		}

		// Delete tees
		if _, err := tx.ExecContext(ctx, "DELETE FROM course_tees WHERE course_id = ?", int64(courseID)); err != nil {
			return err
		}

		// Delete course
		if _, err := tx.ExecContext(ctx, "DELETE FROM courses WHERE id = ?", int64(courseID)); err != nil {
			return err
		}

		return nil
	})
}
