-- name: GetAvailablePlayers :many
SELECT *
FROM players
WHERE tournament_id = ?
  AND active = 0
ORDER BY name;

-- name: GetAvailablePlayerById :one
SELECT *
FROM players
WHERE id = ?;

-- name: UnclaimPlayer :exec
UPDATE players
SET active = 0
WHERE id = ?
  AND active = 1;


-- name: ClaimPlayer :exec
UPDATE players
SET active = 1
WHERE id = ?
  AND active = 0;