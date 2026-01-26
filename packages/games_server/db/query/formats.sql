-- name: GetAllFormats :many
SELECT id, name, description, is_team_scoring FROM tournament_formats ORDER BY name;
