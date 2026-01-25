-- name: GetAvailablePlayers :many
SELECT p.id as player_id, p.name, p.handicap, t.id as team_id, t.tournament_id as tournament_id
FROM players p
JOIN team_players tp ON tp.player_id = p.id
JOIN teams t ON t.id = tp.team_id
WHERE t.tournament_id = ?
AND p.id NOT IN (
    SELECT atp.player_id FROM active_tournament_players atp WHERE atp.tournament_id = ?
)
ORDER BY p.name;

-- name: GetAvailablePlayerById :one
SELECT p.id as player_id, p.name, p.handicap, t.id as team_id, t.tournament_id as tournament_id
FROM players p
JOIN team_players tp ON tp.player_id = p.id
JOIN teams t ON t.id = tp.team_id
WHERE t.tournament_id = ? AND player_id = ?;

-- name: SelectPlayer :exec
INSERT INTO active_tournament_players (tournament_id, player_id) VALUES (?, ?);

-- name: RemoveActivePlayer :exec
DELETE FROM active_tournament_players WHERE tournament_id = ? AND player_id = ?;
