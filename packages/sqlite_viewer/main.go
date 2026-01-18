package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/patrick-salvatore/sqlite-viewer/internal/database"
	"github.com/patrick-salvatore/sqlite-viewer/internal/server"
)

func main() {
	migrationsDir := flag.String("migrations-dir", "", "Path to output generated migration files")
	flag.Parse()
	args := flag.Args()

	if len(args) < 1 {
		fmt.Println("Usage: sqlite-viewer [-migrations-dir path] <db-file>")
		os.Exit(1)
	}

	dbPath := args[0]
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		log.Fatalf("Database file does not exist: %s", dbPath)
	}

	db, err := database.New(dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	if *migrationsDir != "" {
		db.MigrationsDir = *migrationsDir
		log.Printf("Migration logging enabled: %s", *migrationsDir)
	}

	// Serve static files (Frontend)

	// Try multiple locations to support running from package root or monorepo root
	possiblePaths := []string{
		"web/dist",                        // Run from packages/sqlite_viewer
		"packages/sqlite_viewer/web/dist", // Run from monorepo root
	}

	var staticDir string
	for _, p := range possiblePaths {
		if _, err := os.Stat(p); err == nil {
			staticDir = p
			break
		}
	}

	if staticDir == "" {
		log.Println("Warning: Could not find web/dist directory. Frontend will not be served.")
	} else {
		log.Printf("Serving frontend from: %s", staticDir)
	}

	srv := server.New(db, staticDir)

	log.Printf("Starting SQLite Viewer for %s on http://localhost:8081", dbPath)

	log.Fatal(http.ListenAndServe(":8081", srv))
}
