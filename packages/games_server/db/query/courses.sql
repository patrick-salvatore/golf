-- name: GetAllCourses :many
SELECT id, name FROM courses;

-- name: GetCourseByTournamentID :one
SELECT c.id, c.name
FROM courses c
JOIN tournaments t ON t.course_id = c.id
WHERE t.id = ?;

-- name: GetCourseHoles :many
SELECT id, hole_number, par, handicap, hole_index, yardage 
FROM course_holes 
WHERE course_id = ? AND tee_set = 'Mens' 
ORDER BY hole_number ASC;
