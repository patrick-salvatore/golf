-- name: GetAllTournaments :many
SELECT
    id,
    name,
    team_count,
    complete,
    start_date,
    end_date,
    created_at
FROM tournaments
ORDER BY created_at DESC;

-- name: GetTournament :one
SELECT
    t.*,
    tf.name AS format_name,
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
        team_count,
        start_date,
        end_date,
        created_at
    )
VALUES (?, ?, ?, ?, ?)
RETURNING
    id,
    name,
    team_count,
    complete,
    start_date,
    end_date,
    created_at;