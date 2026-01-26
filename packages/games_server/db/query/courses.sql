-- name: GetAllCourses :many
SELECT id, name FROM courses;

-- name: GetCourseByTournamentID :one
SELECT c.id, c.name
FROM courses c
JOIN tournaments t ON t.course_id = c.id
WHERE t.id = ?;

-- name: GetCourseHoles :many
SELECT id, hole_number, par, handicap, yardage 
FROM course_holes 
WHERE course_id = ?
ORDER BY hole_number ASC;
