-- name: GetTournamentRounds :many
SELECT *
FROM tournament_rounds
WHERE
    tournament_id = ?
ORDER BY round_number;

-- name: GetTournamentRound :one
SELECT tr.*, c.name AS course_name
FROM
    tournament_rounds tr
    JOIN courses c ON c.id = tr.course_id
WHERE
    tr.id = ?;

-- name: GetActiveTournamentRound :one
SELECT tr.*, c.name AS course_name
FROM
    tournament_rounds tr
    JOIN courses c ON c.id = tr.course_id
WHERE
    tr.tournament_id = ? AND tr.status = 'active';

-- name: GetTournamentRoundByNumber :one
SELECT tr.*, c.name AS course_name
FROM
    tournament_rounds tr
    JOIN courses c ON c.id = tr.course_id
WHERE
    tr.tournament_id = ?
    AND tr.round_number = ?;

-- name: CreateTournamentRound :one
INSERT INTO
    tournament_rounds (
        tournament_id,
        round_number,
        course_id,
        format_id,
        date,
        name,
        status
    )
VALUES (?, ?, ?, ?, ?, ?, ?)
RETURNING
    id,
    tournament_id,
    round_number,
    course_id,
    format_id,
    date,
    name,
    status,
    created_at;

-- name: UpdateTournamentRound :exec
UPDATE tournament_rounds
SET
    course_id = ?,
    name = ?,
    status = ?
WHERE
    id = ?;

-- name: UpdateTournamentRoundStatus :exec
UPDATE tournament_rounds SET status = ? WHERE id = ?;

-- name: DeleteTournamentRound :exec
DELETE FROM tournament_rounds WHERE id = ?;

-- name: GetActiveRounds :many
SELECT
    tr.*,
    c.name AS course_name,
    t.name AS tournament_name
FROM
    tournament_rounds tr
    JOIN courses c ON c.id = tr.course_id
    JOIN tournaments t ON t.id = tr.tournament_id
WHERE
    tr.status = 'active'
ORDER BY tr.round_date, tr.round_number;