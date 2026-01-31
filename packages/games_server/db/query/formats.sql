-- name: GetAllFormats :many
SELECT id, name, description, is_team_scoring FROM tournament_formats ORDER BY name;

-- name: GetTournamentFormats :many
SELECT *
FROM
    tournament_formats tf
    JOIN tournament_rounds tr ON tf.id = tr.format_id
WHERE
    tr.id = ?
ORDER BY tr.date;