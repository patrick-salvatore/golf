package store

import (
	"database/sql"
	"fmt"
	"log"
	"sort"
	"strings"

	"github.com/patrick-salvatore/games-server/db/migrations"
	_ "modernc.org/sqlite"
)

func New(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func InitSchema(db *sql.DB) error {
	// 1. Ensure migrations table exists
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// 2. Read migration files
	entries, err := migrations.FS.ReadDir(".")
	if err != nil {
		return fmt.Errorf("failed to read migrations: %w", err)
	}

	// 3. Sort files by name (001, 002, ...)
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	// 4. Apply new migrations
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		version := entry.Name()

		// Check if applied
		var exists int
		err := db.QueryRow("SELECT 1 FROM schema_migrations WHERE version = ?", version).Scan(&exists)
		if err == nil {
			continue // Already applied
		} else if err != sql.ErrNoRows {
			return fmt.Errorf("failed to check migration status: %w", err)
		}

		log.Printf("Applying migration: %s", version)

		content, err := migrations.FS.ReadFile(version)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", version, err)
		}

		// Execute
		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", version, err)
		}

		// Record
		if _, err := db.Exec("INSERT INTO schema_migrations (version) VALUES (?)", version); err != nil {
			return fmt.Errorf("failed to record migration %s: %w", version, err)
		}
	}

	return nil
}
