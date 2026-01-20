DROP TABLE IF EXISTS scores;

CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    player_id INTEGER,
    team_id INTEGER,
    course_hole_id INTEGER NOT NULL,
    strokes INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (course_hole_id) REFERENCES course_holes(id)
);

CREATE UNIQUE INDEX idx_scores_unique ON scores (tournament_id, IFNULL(player_id, -1), IFNULL(team_id, -1), course_hole_id);

-- Sync Scores Triggers (Updated)
DROP TRIGGER IF EXISTS scores_sync_ai;
DROP TRIGGER IF EXISTS scores_sync_au;
DROP TRIGGER IF EXISTS scores_sync_ad;

CREATE TRIGGER scores_sync_ai AFTER INSERT ON scores
BEGIN
    INSERT INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
    VALUES (
        CAST(NEW.tournament_id AS TEXT),
        'score',
        NEW.id,
        json_object(
            'id', NEW.id,
            'tournamentId', NEW.tournament_id,
            'playerId', NEW.player_id,
            'teamId', NEW.team_id,
            'courseHoleId', NEW.course_hole_id,
            'strokes', NEW.strokes,
            'createdAt', NEW.created_at
        ),
        strftime('%s', 'now') * 1000,
        'system'
    );
END;

CREATE TRIGGER scores_sync_au AFTER UPDATE ON scores
BEGIN
    UPDATE entities SET
        data = json_object(
            'id', NEW.id,
            'tournamentId', NEW.tournament_id,
            'playerId', NEW.player_id,
            'teamId', NEW.team_id,
            'courseHoleId', NEW.course_hole_id,
            'strokes', NEW.strokes,
            'createdAt', NEW.created_at
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = CAST(NEW.tournament_id AS TEXT) AND type = 'score' AND entity_id = NEW.id;
END;

CREATE TRIGGER scores_sync_ad AFTER DELETE ON scores
BEGIN
    DELETE FROM entities
    WHERE namespace = CAST(OLD.tournament_id AS TEXT) AND type = 'score' AND entity_id = OLD.id;
END;
