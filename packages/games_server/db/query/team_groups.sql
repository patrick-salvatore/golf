-- name: CreateTeamGroup :one
INSERT INTO team_groups (name, tournament_id)
VALUES (?, ?)
RETURNING *;

-- name: AddTeamToGroup :exec
INSERT INTO team_group_members (team_id, group_id)
VALUES (?, ?);

-- name: GetTournamentGroups :many
SELECT * FROM team_groups
WHERE tournament_id = ?;

-- name: GetTournamentGroupMembers :many
SELECT tgm.team_id, tgm.group_id, tg.name as group_name
FROM team_group_members tgm
JOIN team_groups tg ON tgm.group_id = tg.id
WHERE tg.tournament_id = ?;

-- name: CreateTournamentReward :one
INSERT INTO tournament_rewards (tournament_id, scope, metric, description)
VALUES (?, ?, ?, ?)
RETURNING *;

-- name: GetTournamentRewards :many
SELECT * FROM tournament_rewards
WHERE tournament_id = ?;
