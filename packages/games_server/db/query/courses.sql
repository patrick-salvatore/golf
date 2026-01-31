-- name: GetAllCourses :many
SELECT id, name FROM courses;

-- name: GetCourseByTournamentRoundID :one
SELECT c.id, c.name, tr.awarded_handicap
FROM courses c
JOIN tournament_rounds tr ON tr.course_id = c.id
WHERE tr.id = ?;

-- name: GetCourseHoles :many
SELECT id, hole_number, par, handicap, yardage 
FROM course_holes 
WHERE course_id = ?
ORDER BY hole_number ASC;
