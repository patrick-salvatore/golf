CREATE TABLE team_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tournament_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, tournament_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
);

CREATE TABLE team_group_members (
    team_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    PRIMARY KEY (team_id, group_id),
    FOREIGN KEY (team_id) REFERENCES teams (id),
    FOREIGN KEY (group_id) REFERENCES team_groups (id)
);

CREATE TABLE tournament_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    scope TEXT NOT NULL,        -- 'team' | 'group'
    metric TEXT NOT NULL,       -- 'total_score', 'round_wins', etc
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
);
