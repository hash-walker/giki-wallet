-- name: ListSystemAuditLogs :many
SELECT 
    l.id, l.action, l.ip_address, l.user_agent, l.status, l.created_at, l.details,
    l.actor_id, u.name as actor_name, u.email as actor_email,
    l.target_id, t.name as target_name, t.email as target_email
FROM giki_wallet.system_audit_logs l
LEFT JOIN giki_wallet.users u ON l.actor_id = u.id
LEFT JOIN giki_wallet.users t ON l.target_id = t.id
ORDER BY l.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountSystemAuditLogs :one
SELECT COUNT(*) FROM giki_wallet.system_audit_logs;
