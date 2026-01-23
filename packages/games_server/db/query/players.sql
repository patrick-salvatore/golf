-- name: GetPlayer :one
SELECT id, name, handicap, is_admin, created_at FROM players WHERE id = ?;

-- name: GetAllPlayers :many
SELECT id, name, handicap, is_admin, created_at FROM players ORDER BY name;

-- name: CreatePlayer :one
INSERT INTO players (name, handicap, is_admin, created_at) 
VALUES (?, ?, ?, ?) 
RETURNING id, name, handicap, is_admin, created_at;
