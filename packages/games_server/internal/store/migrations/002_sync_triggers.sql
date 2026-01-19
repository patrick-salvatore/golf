CREATE TRIGGER IF NOT EXISTS entities_ai AFTER INSERT ON entities
BEGIN
	UPDATE meta SET value = value + 1 WHERE key = 'version';
	INSERT INTO changelog (namespace, version, client_id, entity_type, entity_id, op, data)
	SELECT 
		NEW.namespace,
		(SELECT value FROM meta WHERE key = 'version'),
		COALESCE((SELECT client_id FROM _tx_context LIMIT 1), 'server'),
		NEW.type,
		NEW.entity_id,
		'upsert',
		NEW.data;
END;

CREATE TRIGGER IF NOT EXISTS entities_au AFTER UPDATE ON entities
BEGIN
	UPDATE meta SET value = value + 1 WHERE key = 'version';
	INSERT INTO changelog (namespace, version, client_id, entity_type, entity_id, op, data)
	SELECT 
		NEW.namespace,
		(SELECT value FROM meta WHERE key = 'version'),
		COALESCE((SELECT client_id FROM _tx_context LIMIT 1), 'server'),
		NEW.type,
		NEW.entity_id,
		'upsert',
		NEW.data;
END;

CREATE TRIGGER IF NOT EXISTS entities_ad AFTER DELETE ON entities
BEGIN
	UPDATE meta SET value = value + 1 WHERE key = 'version';
	INSERT INTO changelog (namespace, version, client_id, entity_type, entity_id, op, data)
	SELECT 
		OLD.namespace,
		(SELECT value FROM meta WHERE key = 'version'),
		COALESCE((SELECT client_id FROM _tx_context LIMIT 1), 'server'),
		OLD.type,
		OLD.entity_id,
		'delete',
		NULL;
END;
