-- name: GetTournamentScores :many
SELECT s.id, s.tournament_round_id, s.player_id, s.team_id, s.course_hole_id, s.strokes, s.created_at, ch.hole_number
FROM scores s
JOIN course_holes ch ON s.course_hole_id = ch.id
JOIN tournament_rounds tr ON s.tournament_round_id = tr.id
WHERE tr.tournament_id = ?
  AND (sqlc.narg('player_id') IS NULL OR s.player_id = sqlc.narg('player_id'))
  AND (sqlc.narg('team_id') IS NULL OR s.team_id = sqlc.narg('team_id'));

-- name: GetRoundScores :many
SELECT s.id, s.tournament_round_id, s.player_id, s.team_id, s.course_hole_id, s.strokes, s.created_at, ch.hole_number
FROM scores s
JOIN course_holes ch ON s.course_hole_id = ch.id
WHERE s.tournament_round_id = ?
  AND (sqlc.narg('player_id') IS NULL OR s.player_id = sqlc.narg('player_id'))
  AND (sqlc.narg('team_id') IS NULL OR s.team_id = sqlc.narg('team_id'));

-- name: GetScoreByUniqueKey :one
SELECT id FROM scores 
WHERE tournament_round_id = sqlc.arg('tournament_round_id')
  AND IFNULL(player_id, -1) = IFNULL(sqlc.arg('player_id'), -1)
  AND IFNULL(team_id, -1) = IFNULL(sqlc.arg('team_id'), -1)
  AND course_hole_id = sqlc.arg('course_hole_id');


-- name: InsertScore :one
INSERT INTO scores (tournament_round_id, player_id, team_id, course_hole_id, strokes, created_at)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING id;

-- name: UpdateScore :exec
UPDATE scores SET strokes = ? WHERE id = ?;
