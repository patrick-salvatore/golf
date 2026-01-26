-- Trigger to sync Tournaments to Entities
CREATE TRIGGER IF NOT EXISTS tournaments_sync_ai AFTER INSERT ON tournaments
BEGIN
    INSERT INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
    VALUES (
        CAST(NEW.id AS TEXT), 
        'tournament', 
        NEW.id, 
        json_object(
            'id', NEW.id, 
            'name', NEW.name, 
            'courseId', NEW.course_id, 
            'formatId', NEW.format_id, 
            'teamCount', NEW.team_count, 
            'awardedHandicap', NEW.awarded_handicap, 
            'isMatchPlay', NEW.is_match_play, 
            'complete', NEW.complete, 
            'startTime', NEW.start_time,
            'created', NEW.created_at
        ), 
        strftime('%s', 'now') * 1000, 
        'system'
    );
    -- Sync Course into Tournament Namespace
    INSERT INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
    SELECT 
        CAST(NEW.id AS TEXT),
        'course',
        c.id,
        json_object('id', c.id, 'name', c.name, 'meta', json(c.data)),
        strftime('%s', 'now') * 1000,
        'system'
    FROM courses c WHERE c.id = NEW.course_id;
END;

CREATE TRIGGER IF NOT EXISTS tournaments_sync_au AFTER UPDATE ON tournaments
BEGIN
    UPDATE entities SET 
        data = json_object(
            'id', NEW.id, 
            'name', NEW.name, 
            'courseId', NEW.course_id, 
            'formatId', NEW.format_id, 
            'teamCount', NEW.team_count, 
            'awardedHandicap', NEW.awarded_handicap, 
            'isMatchPlay', NEW.is_match_play, 
            'complete', NEW.complete, 
            'startTime', NEW.start_time,
            'created', NEW.created_at
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = CAST(NEW.id AS TEXT) AND type = 'tournament' AND entity_id = NEW.id;
END;

-- Trigger to sync Teams to Entities
CREATE TRIGGER IF NOT EXISTS teams_sync_ai AFTER INSERT ON teams
BEGIN
    INSERT INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
    VALUES (
        CAST(NEW.tournament_id AS TEXT), 
        'team', 
        NEW.id, 
        json_object(
            'id', NEW.id, 
            'name', NEW.name, 
            'tournamentId', NEW.tournament_id
        ), 
        strftime('%s', 'now') * 1000, 
        'system'
    );
END;

CREATE TRIGGER IF NOT EXISTS teams_sync_au AFTER UPDATE ON teams
BEGIN
    UPDATE entities SET 
        data = json_object(
            'id', NEW.id, 
            'name', NEW.name, 
            'tournamentId', NEW.tournament_id
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = CAST(NEW.tournament_id AS TEXT) AND type = 'team' AND entity_id = NEW.id;
END;

-- Sync Invites
CREATE TRIGGER IF NOT EXISTS invites_sync_ai AFTER INSERT ON invites
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
            'createdAt', NEW.created_at
        ),
        strftime('%s', 'now') * 1000,
        'system'
    );
END;
CREATE TRIGGER IF NOT EXISTS invites_sync_ad AFTER DELETE ON invites
BEGIN
    DELETE FROM entities
    WHERE namespace = CAST(OLD.tournament_id AS TEXT) AND type = 'invite' AND entity_id = OLD.id;
END;

DROP TRIGGER IF EXISTS tournament_rounds_sync_ai;
CREATE TRIGGER tournament_rounds_sync_ai AFTER INSERT ON tournament_rounds
BEGIN
    INSERT INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
    VALUES (
        CAST(NEW.tournament_id AS TEXT),
        'tournament_round',
        NEW.id,
        json_object(
            'id', NEW.id,
            'tournamentId', NEW.tournament_id,
            'roundNumber', NEW.round_number,
            'roundDate', NEW.round_date,
            'courseId', NEW.course_id,
            'teeSet', NEW.tee_set,
            'name', NEW.name,
            'status', NEW.status,
            'createdAt', NEW.created_at
        ),
        strftime('%s', 'now') * 1000,
        'system'
    );
END;

DROP TRIGGER IF EXISTS tournament_rounds_sync_au;
CREATE TRIGGER tournament_rounds_sync_au AFTER UPDATE ON tournament_rounds
BEGIN
    UPDATE entities SET
        data = json_object(
            'id', NEW.id,
            'tournamentId', NEW.tournament_id,
            'roundNumber', NEW.round_number,
            'roundDate', NEW.round_date,
            'courseId', NEW.course_id,
            'teeSet', NEW.tee_set,
            'name', NEW.name,
            'status', NEW.status,
            'createdAt', NEW.created_at
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = CAST(NEW.tournament_id AS TEXT) AND type = 'tournament_round' AND entity_id = NEW.id;
END;

DROP TRIGGER IF EXISTS tournament_rounds_sync_ad;
CREATE TRIGGER tournament_rounds_sync_ad AFTER DELETE ON tournament_rounds
BEGIN
    DELETE FROM entities
    WHERE namespace = CAST(OLD.tournament_id AS TEXT) AND type = 'tournament_round' AND entity_id = OLD.id;
END;


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