package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

func GetCourses(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		courses, err := db.GetAllCourses()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(courses)
	}
}

func GetCourseByTournamentRoundID(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "roundId")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		course, err := db.GetCourseByTournamentRoundID(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if course == nil {
			http.Error(w, "Course not found for this tournament", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(course)
	}
}

func CreateCourse(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.CreateCourseRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if req.Name == "" {
			http.Error(w, "Name is required", http.StatusBadRequest)
			return
		}
		if len(req.Holes) == 0 {
			http.Error(w, "At least one hole is required", http.StatusBadRequest)
			return
		}

		course, err := db.CreateCourseTx(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(course)
	}
}

func GetCourse(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid course ID", http.StatusBadRequest)
			return
		}

		course, err := db.GetCourseByID(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if course == nil {
			http.Error(w, "Course not found", http.StatusNotFound)
			return
		}

		json.NewEncoder(w).Encode(course)
	}
}

func UpdateCourse(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid course ID", http.StatusBadRequest)
			return
		}

		var req models.CreateCourseRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if req.Name == "" {
			http.Error(w, "Name is required", http.StatusBadRequest)
			return
		}
		if len(req.Holes) == 0 {
			http.Error(w, "At least one hole is required", http.StatusBadRequest)
			return
		}

		course, err := db.UpdateCourseTx(id, req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(course)
	}
}

func DeleteCourse(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid course ID", http.StatusBadRequest)
			return
		}

		// Check if course is used in any rounds first
		exists, err := db.CourseExistsInRounds(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if exists {
			http.Error(w, "Cannot delete course that is used in tournaments", http.StatusBadRequest)
			return
		}

		if err := db.DeleteCourse(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func GetCourseTees(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid course ID", http.StatusBadRequest)
			return
		}

		tees, err := db.GetCourseTees(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Convert to response format with proper JSON field names
		var response []map[string]interface{}
		for _, t := range tees {
			response = append(response, map[string]interface{}{
				"id":       t.ID,
				"courseId": t.CourseID,
				"name":     t.Name,
				"rating":   t.Rating,
				"slope":    t.Slope,
			})
		}

		json.NewEncoder(w).Encode(response)
	}
}
