.PHONY: all build run seed deps clean sync-remote view-remote upload-remote backup-remote help

# Default target
all: build

# Build the server binary
build:
	go build -o bin/server ./main.go

# Run the server (development)
run:
	go run ./main.go $(DB)

# Sync remote database from Fly.io
sync-remote:
	@echo "📥 Downloading database from Fly.io..."
	@fly ssh sftp get /data/golf.db ../games_server/golf-remote.db -a golf-games-server

# View remote database (downloads and opens in viewer)
view-remote: sync-remote
	@echo "✅ Database synced! Starting viewer..."
	@go run ./main.go ../games_server/golf-remote.db

# Create backup before upload
backup-remote:
	@echo "💾 Creating backup of remote database..."
	@mkdir -p ../games_server/backups
	@fly ssh sftp get /data/golf.db ../games_server/backups/golf-backup-$$(date +%Y%m%d-%H%M%S).db -a golf-games-server
	@echo "✅ Backup saved to: ../games_server/backups/golf-backup-$$(date +%Y%m%d-%H%M%S).db"

# Upload local database to Fly.io (with backup and confirmation)
upload-remote:
	@echo "⚠️  WARNING: This will replace the production database!"
	@echo "📍 Source: ../games_server/golf-remote.db"
	@echo "🎯 Target: golf-games-server:/data/golf.db"
	@echo ""
	@read -p "Create backup before upload? [Y/n] " -n 1 -r; \
	echo; \
	if [[ ! $$REPLY =~ ^[Nn]$$ ]]; then \
		echo "💾 Creating backup..."; \
		mkdir -p ../games_server/backups; \
		fly ssh sftp get /data/golf.db ../games_server/backups/golf-backup-$$(date +%Y%m%d-%H%M%S).db -a golf-games-server; \
		echo "✅ Backup created!"; \
	fi
	@echo ""
	@read -p "Continue with upload? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "📤 Uploading database to Fly.io..."; \
		fly ssh sftp put ../games_server/golf-remote.db /data/golf.db -a golf-games-server; \
		echo "✅ Database uploaded successfully!"; \
		echo "🔄 Restarting application..."; \
		fly apps restart golf-games-server; \
		echo "✅ Application restarted!"; \
	else \
		echo "❌ Upload cancelled"; \
		exit 1; \
	fi

# Install dependencies
deps:
	go get modernc.org/sqlite
	go get github.com/go-chi/chi/v5
	go get github.com/go-chi/cors
	go mod tidy

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f golf.db
	rm -f ../games_server/golf-remote.db

# Show help
help:
	@echo "SQLite Viewer - Makefile Commands"
	@echo ""
	@echo "Development:"
	@echo "  make build          - Build the server binary"
	@echo "  make run DB=<path>  - Run viewer with local database"
	@echo ""
	@echo "Remote Database Management:"
	@echo "  make sync-remote    - Download database from Fly.io"
	@echo "  make view-remote    - Download and open in viewer"
	@echo "  make upload-remote  - Upload changes to Fly.io (with backup)"
	@echo "  make backup-remote  - Create backup of remote database"
	@echo ""
	@echo "Workflow Script (recommended):"
	@echo "  ./workflow.sh download  - Download database"
	@echo "  ./workflow.sh view      - Download and view"
	@echo "  ./workflow.sh upload    - Upload with safety checks"
	@echo "  ./workflow.sh backup    - Create backup"
	@echo "  ./workflow.sh list      - List all backups"
	@echo "  ./workflow.sh restore   - Restore from backup"
	@echo ""
	@echo "Other:"
	@echo "  make deps           - Install Go dependencies"
	@echo "  make clean          - Clean build artifacts"
