CREATE TABLE IF NOT EXISTS active_tournament_players (
    tournament_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, player_id),
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY(player_id) REFERENCES players(id)
);
