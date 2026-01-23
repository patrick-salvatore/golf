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
            'tournamentId', NEW.tournament_id, 
            'started', NEW.started, 
            'finished', NEW.finished
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
            'tournamentId', NEW.tournament_id, 
            'started', NEW.started, 
            'finished', NEW.finished
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
            'teamId', NEW.team_id,
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

-- Sync Players (Enhanced with Team Info)
CREATE TRIGGER IF NOT EXISTS active_players_sync_ai AFTER INSERT ON active_tournament_players
BEGIN
    INSERT OR REPLACE INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
    SELECT
        CAST(NEW.tournament_id AS TEXT),
        'player',
        p.id,
        json_object(
            'id', p.id,
            'name', p.name,
            'handicap', p.handicap,
            'isAdmin', p.is_admin,
            'createdAt', p.created_at,
            'teamId', (
                SELECT tp.team_id 
                FROM team_players tp 
                JOIN teams t ON tp.team_id = t.id 
                WHERE tp.player_id = p.id AND t.tournament_id = NEW.tournament_id
            ),
            'tee', (
                SELECT tp.tee 
                FROM team_players tp 
                JOIN teams t ON tp.team_id = t.id 
                WHERE tp.player_id = p.id AND t.tournament_id = NEW.tournament_id
            )
        ),
        strftime('%s', 'now') * 1000,
        'system'
    FROM players p WHERE p.id = NEW.player_id;
END;
-- Update Player Entity when Team Assignment Changes (Joined a Team)
CREATE TRIGGER IF NOT EXISTS team_players_sync_ai AFTER INSERT ON team_players
BEGIN
    UPDATE entities SET
        data = (
            SELECT json_object(
                'id', p.id,
                'name', p.name,
                'handicap', p.handicap,
                'isAdmin', p.is_admin,
                'createdAt', p.created_at,
                'teamId', NEW.team_id,
                'tee', NEW.tee
            )
            FROM players p WHERE p.id = NEW.player_id
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = (SELECT CAST(tournament_id AS TEXT) FROM teams WHERE id = NEW.team_id)
      AND type = 'player'
      AND entity_id = NEW.player_id;
END;
-- Update Player Entity when Team Assignment Updates (e.g. Tee Change)
CREATE TRIGGER IF NOT EXISTS team_players_sync_au AFTER UPDATE ON team_players
BEGIN
    UPDATE entities SET
        data = (
            SELECT json_object(
                'id', p.id,
                'name', p.name,
                'handicap', p.handicap,
                'isAdmin', p.is_admin,
                'createdAt', p.created_at,
                'teamId', NEW.team_id,
                'tee', NEW.tee
            )
            FROM players p WHERE p.id = NEW.player_id
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = (SELECT CAST(tournament_id AS TEXT) FROM teams WHERE id = NEW.team_id)
      AND type = 'player'
      AND entity_id = NEW.player_id;
END;
-- Update Player Entity when Removed from Team
CREATE TRIGGER IF NOT EXISTS team_players_sync_ad AFTER DELETE ON team_players
BEGIN
    UPDATE entities SET
        data = (
            SELECT json_object(
                'id', p.id,
                'name', p.name,
                'handicap', p.handicap,
                'isAdmin', p.is_admin,
                'createdAt', p.created_at
                -- teamId and tee are omitted (null)
            )
            FROM players p WHERE p.id = OLD.player_id
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = (SELECT CAST(tournament_id AS TEXT) FROM teams WHERE id = OLD.team_id)
      AND type = 'player'
      AND entity_id = OLD.player_id;
END;
