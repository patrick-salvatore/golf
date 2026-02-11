-- name: GetAdminConfig :one
SELECT value FROM admin_config WHERE key = ? LIMIT 1;
