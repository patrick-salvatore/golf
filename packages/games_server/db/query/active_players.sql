-- name: GetAvailablePlayers :many
SELECT 
    p.id,
    p.name,
    p.handicap,
    p.active,
    p.course_tees_id,
    p.tournament_id,
    p.team_id,
    p.refreshtokenversion,
    p.created_at,
    ct.rating as tee_rating,
    ct.slope as tee_slope
FROM players p
LEFT JOIN course_tees ct ON p.course_tees_id = ct.id
WHERE
    p.tournament_id = sqlc.arg(tournament_id)
    AND p.active = 0
ORDER BY p.name;

-- name: GetAvailablePlayerById :one
SELECT * FROM players WHERE id = ? AND active = 1 LIMIT 1;

-- name: UnclaimPlayer :exec
UPDATE players SET active = 0 WHERE id = ? AND active = 1;

-- name: ClaimPlayer :exec
UPDATE players SET active = 1 WHERE id = ? AND active = 0;