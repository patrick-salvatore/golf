-- name: GetAllTournaments :many
SELECT
    id,
    name,
    course_id,
    format_id,
    team_count,
    awarded_handicap,
    is_match_play,
    complete,
    start_time,
    created_at
FROM tournaments
ORDER BY created_at DESC;

-- name: GetTournament :one
SELECT
    t.*,
    tf.name AS format_name,
    tf.is_team_scoring AS is_team_scoring,
    tf.description AS tournament_format_description
FROM
    tournaments t
    JOIN tournament_formats tf ON tf.id = t.format_id
WHERE
    t.id = ?;

-- name: CreateTournament :one
INSERT INTO
    tournaments (
        name,
        course_id,
        format_id,
        team_count,
        awarded_handicap,
        is_match_play,
        start_time,
        created_at
    )
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING
    id,
    name,
    course_id,
    format_id,
    team_count,
    awarded_handicap,
    is_match_play,
    complete,
    start_time,
    created_at;