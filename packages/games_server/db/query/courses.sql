-- name: GetAllCourses :many
SELECT id, name, created_at FROM courses ORDER BY name ASC;

-- name: GetCourse :one
SELECT id, name, CAST(data AS BLOB) AS data, created_at
FROM courses
WHERE
    id = ?
LIMIT 1;

-- name: GetCourseByTournamentRoundID :one
SELECT c.id, c.name, tr.awarded_handicap
FROM
    courses c
    JOIN tournament_rounds tr ON tr.course_id = c.id
WHERE
    tr.id = ?
LIMIT 1;

-- name: GetCourseHolesByTee :many
SELECT
    id,
    hole_number,
    par,
    handicap,
    yardage,
    tee_set
FROM course_holes
WHERE
    course_id = ?
    AND tee_set = ?
ORDER BY hole_number ASC;

-- name: GetCourseHoles :many
SELECT
    id,
    course_id,
    hole_number,
    par,
    handicap,
    yardage,
    tee_set
FROM course_holes
WHERE
    course_id = ?
ORDER BY tee_set ASC, hole_number ASC;

-- name: CreateCourse :one
INSERT INTO
    courses (name, data)
VALUES (?, ?) RETURNING id,
    name,
    CAST(data AS BLOB) AS data,
    created_at;

-- name: UpdateCourse :one
UPDATE courses
SET
    name = ?,
    data = ?
WHERE
    id = ? RETURNING id,
    name,
    CAST(data AS BLOB) AS data,
    created_at;

-- name: CreateCourseTee :one
INSERT INTO course_tees (course_id, name, rating, slope) VALUES (?, ?, ?, ?) RETURNING *;

-- name: CreateCourseHole :exec
INSERT INTO
    course_holes (
        course_id,
        tee_set,
        hole_number,
        par,
        handicap,
        yardage
    )
VALUES (?, ?, ?, ?, ?, ?);

-- name: UpdateCourseHole :one
INSERT INTO
    course_holes (
        course_id,
        tee_set,
        hole_number,
        par,
        handicap,
        yardage
    )
VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (
        course_id,
        tee_set,
        hole_number
    ) DO
UPDATE
SET
    par = excluded.par,
    handicap = excluded.handicap,
    yardage = excluded.yardage RETURNING *;

-- name: DeleteCourseHolesForTee :exec
DELETE FROM course_holes WHERE course_id = ? AND tee_set = ?;

-- name: DeleteCourseHoles :exec
DELETE FROM course_holes WHERE course_id = ?;

-- name: DeleteCourseTees :exec
DELETE FROM course_tees WHERE course_id = ?;

-- name: DeleteCourse :exec
DELETE FROM courses WHERE id = ?;

-- name: CountCourseUsageInRounds :one
SELECT COUNT(*) FROM tournament_rounds WHERE course_id = ?;

-- name: GetCourseTees :many
SELECT id, course_id, name, rating, slope, created_at
FROM course_tees
WHERE course_id = ?
ORDER BY name ASC;