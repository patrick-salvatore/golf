-- name: CreateTeam :one
INSERT INTO teams (name, tournament_id)
VALUES (?, ?)
RETURNING *;

-- name: AddPlayerToTeam :exec
UPDATE players
SET team_id = ?
WHERE id = ?;

-- name: GetTeamsByTournament :many
SELECT *
FROM teams
WHERE tournament_id = ?
ORDER BY teams.name;

-- name: GetTeam :one
SELECT * FROM teams WHERE id = ?;

-- name: GetTeamPlayers :many
SELECT p.*, ct.name as tee_name
FROM players p
JOIN course_tees ct ON p.course_tees_id = ct.id
  WHERE team_id = ?
ORDER BY p.name;

-- name: CheckTeamExists :one
SELECT id
FROM teams
WHERE id = ?
LIMIT 1;
