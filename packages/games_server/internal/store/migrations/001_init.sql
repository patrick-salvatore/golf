CREATE TABLE IF NOT EXISTS tournament_formats (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	is_admin BOOLEAN DEFAULT 0,
	handicap REAL DEFAULT 0.0,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	data JSON,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournaments (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	course_id TEXT,
	format_id TEXT,
	team_count INTEGER DEFAULT 0,
	awarded_handicap REAL DEFAULT 1.0,
	is_match_play BOOLEAN DEFAULT 0,
	complete BOOLEAN DEFAULT 0,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	start_time DATETIME,
	FOREIGN KEY(course_id) REFERENCES courses(id),
	FOREIGN KEY(format_id) REFERENCES tournament_formats(id)
);

CREATE TABLE IF NOT EXISTS teams (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	tournament_id TEXT,
	started BOOLEAN DEFAULT 0,
	finished BOOLEAN DEFAULT 0,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(tournament_id) REFERENCES tournaments(id)
);

CREATE TABLE IF NOT EXISTS team_players (
	team_id TEXT,
	player_id TEXT,
	tee TEXT,
	PRIMARY KEY (team_id, player_id),
	FOREIGN KEY(team_id) REFERENCES teams(id),
	FOREIGN KEY(player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS invites (
	token TEXT PRIMARY KEY,
	tournament_id TEXT NOT NULL,
	team_id TEXT,
	expires_at DATETIME,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(tournament_id) REFERENCES tournaments(id)
);

-- Sync Engine Tables
CREATE TABLE IF NOT EXISTS meta (
	key TEXT PRIMARY KEY,
	value INTEGER NOT NULL
);
INSERT OR IGNORE INTO meta (key, value) VALUES ('version', 0);

CREATE TABLE IF NOT EXISTS entities (
	namespace TEXT NOT NULL,
	type TEXT NOT NULL,
	id TEXT NOT NULL,
	data JSON NOT NULL,
	updated_at INTEGER NOT NULL,
	updated_by TEXT NOT NULL,
	PRIMARY KEY (namespace, type, id)
);

CREATE TABLE IF NOT EXISTS changelog (
	namespace TEXT NOT NULL,
	version INTEGER NOT NULL,
	client_id TEXT NOT NULL,
	entity_type TEXT NOT NULL,
	entity_id TEXT NOT NULL,
	op TEXT NOT NULL, -- 'upsert' | 'delete'
	data JSON,
	PRIMARY KEY (namespace, version, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_changelog_ns_version ON changelog(namespace, version);

CREATE TABLE IF NOT EXISTS _tx_context (
	client_id TEXT
);
