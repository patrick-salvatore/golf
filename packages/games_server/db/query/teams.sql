-- name: CreateTeam :one
INSERT INTO teams (name, tournament_id, started, finished, created_at) 
VALUES (?, ?, 0, 0, ?)
RETURNING id;

-- name: AddPlayerToTeam :exec
INSERT INTO team_players (team_id, player_id) VALUES (?, ?);

-- name: GetTeamsByTournament :many
SELECT id, name, tournament_id, started, finished FROM teams WHERE tournament_id = ?;

-- name: GetTeam :one
SELECT id, name, tournament_id, started, finished FROM teams WHERE id = ?;

-- name: GetTeamPlayers :many
SELECT p.id, p.name, p.handicap, p.is_admin, p.created_at, tp.tee
FROM players p
JOIN team_players tp ON tp.player_id = p.id
WHERE tp.team_id = ?;

-- name: CheckTeamExists :one
SELECT EXISTS(SELECT 1 FROM teams WHERE id = ? AND tournament_id = ?);

-- name: StartTeam :exec
UPDATE teams SET started = 1 WHERE id = ?;
