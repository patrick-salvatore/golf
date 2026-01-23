ALTER TABLE invites ADD COLUMN active BOOLEAN DEFAULT 1;

DROP TRIGGER IF EXISTS invites_sync_ai;

CREATE TRIGGER invites_sync_ai AFTER INSERT ON invites
BEGIN
    INSERT INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
    VALUES (
        CAST(NEW.tournament_id AS TEXT),
        'invite',
        NEW.id,
        json_object(
            'id', NEW.id,
            'token', NEW.token,
            'tournamentId', NEW.tournament_id,
            'expiresAt', NEW.expires_at,
            'createdAt', NEW.created_at,
            'active', NEW.active
        ),
        strftime('%s', 'now') * 1000,
        'system'
    );
END;

CREATE TRIGGER IF NOT EXISTS invites_sync_au AFTER UPDATE ON invites
BEGIN
    UPDATE entities SET
        data = json_object(
            'id', NEW.id,
            'token', NEW.token,
            'tournamentId', NEW.tournament_id,
            'expiresAt', NEW.expires_at,
            'createdAt', NEW.created_at,
            'active', NEW.active
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = CAST(NEW.tournament_id AS TEXT) AND type = 'invite' AND entity_id = NEW.id;
END;
