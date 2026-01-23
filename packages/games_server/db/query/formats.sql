-- name: GetAllFormats :many
SELECT id, name, description FROM tournament_formats ORDER BY name;
