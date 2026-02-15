-- name: GetPlayer :one
SELECT id, name, handicap, active, refreshTokenVersion, tournament_id, team_id, created_at FROM players WHERE id = ?;

-- name: GetAllPlayers :many
SELECT id, name, handicap, active, refreshTokenVersion, tournament_id, team_id, created_at FROM players ORDER BY name;

-- name: CreatePlayer :one
INSERT INTO players (name, handicap, created_at, tournament_id, team_id, course_tees_id) 
VALUES (?, ?, ?, ?, ?, ?) 
RETURNING id, name, handicap, created_at;

-- name: UpdatePlayer :exec
UPDATE players 
SET name = ?, handicap = ?, active = ?, team_id = ?
WHERE id = ?;

-- name: GetPlayersByTournament :many
SELECT p.id, p.name, p.handicap, p.active, p.refreshTokenVersion, p.tournament_id, p.team_id, p.created_at, t.name as team_name
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
WHERE p.tournament_id = ?
ORDER BY p.team_id, p.name;
