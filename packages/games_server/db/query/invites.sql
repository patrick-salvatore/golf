-- name: CreateInvite :one
INSERT INTO invites (token, tournament_id, expires_at, created_at, active)
VALUES (?, ?, ?, ?, 1)
RETURNING token, tournament_id, expires_at, created_at, active;

-- name: GetInvite :one
SELECT token, tournament_id, expires_at, created_at, active FROM invites WHERE token = ?;

-- name: GetInviteByTournamentID :one
SELECT token, tournament_id, expires_at, created_at, active FROM invites WHERE tournament_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1
