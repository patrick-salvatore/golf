DROP TABLE IF EXISTS scores;

CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    team_id INTEGER,
    tournament_round_id INTEGER NOT NULL,
    course_hole_id INTEGER NOT NULL,
    strokes INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_round_id) REFERENCES tournament_rounds(id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (course_hole_id) REFERENCES course_holes(id)
);

CREATE UNIQUE INDEX idx_scores_unique ON scores (tournament_round_id, IFNULL(player_id, -1), IFNULL(team_id, -1), course_hole_id);

CREATE TRIGGER scores_sync_ai AFTER INSERT ON scores
BEGIN
    INSERT INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
    VALUES (
        (SELECT CAST(tournament_id AS TEXT) FROM tournament_rounds WHERE id = NEW.tournament_round_id),
        'score',
        NEW.id,
        json_object(
            'id', NEW.id,
            'tournamentRoundId', NEW.tournament_round_id,
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
            'tournamentRoundId', NEW.tournament_round_id,
            'playerId', NEW.player_id,
            'teamId', NEW.team_id,
            'courseHoleId', NEW.course_hole_id,
            'strokes', NEW.strokes,
            'createdAt', NEW.created_at
        ),
        updated_at = strftime('%s', 'now') * 1000
    WHERE namespace = (SELECT CAST(tournament_id AS TEXT) FROM tournament_rounds WHERE id = NEW.tournament_round_id) 
      AND type = 'score' AND entity_id = NEW.id;
END;

CREATE TRIGGER scores_sync_ad AFTER DELETE ON scores
BEGIN
    DELETE FROM entities
    WHERE namespace = (SELECT CAST(tournament_id AS TEXT) FROM tournament_rounds WHERE id = OLD.tournament_round_id) 
      AND type = 'score' AND entity_id = OLD.id;
END;
