-- name: GetAllTournaments :many
SELECT id, name, course_id, format_id, team_count, awarded_handicap, is_match_play, complete, start_time, created_at 
FROM tournaments ORDER BY created_at DESC;

-- name: GetTournament :one
SELECT id, name, course_id, format_id, team_count, awarded_handicap, is_match_play, complete, start_time, created_at 
FROM tournaments WHERE id = ?;

-- name: CreateTournament :one
INSERT INTO tournaments (name, course_id, format_id, team_count, awarded_handicap, is_match_play, start_time, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, name, course_id, format_id, team_count, awarded_handicap, is_match_play, complete, start_time, created_at;
