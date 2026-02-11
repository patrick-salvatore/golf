-- name: GetPlayer :one
SELECT id, name, handicap, active, refreshTokenVersion, tournament_id, team_id, created_at FROM players WHERE id = ?;

-- name: GetAllPlayers :many
SELECT id, name, handicap, active, refreshTokenVersion, tournament_id, team_id, created_at FROM players ORDER BY name;

-- name: CreatePlayer :one
INSERT INTO players (name, handicap, created_at, tournament_id, team_id, course_tees_id) 
VALUES (?, ?, ?, ?, ?, ?) 
RETURNING id, name, handicap, created_at;
