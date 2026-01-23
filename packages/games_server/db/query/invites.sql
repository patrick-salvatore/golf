-- name: CreateInvite :one
INSERT INTO invites (token, tournament_id, team_id, expires_at, created_at, active)
VALUES (?, ?, ?, ?, ?, 1)
RETURNING token, tournament_id, team_id, expires_at, created_at, active;

-- name: GetInvite :one
SELECT token, tournament_id, team_id, expires_at, created_at, active FROM invites WHERE token = ?;
