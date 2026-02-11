#!/bin/bash

# SQLite Viewer - Sync and View Remote Database
# Usage: ./sync-and-view.sh [app-name]

set -e

APP_NAME="${1:-golf-games-server}"
REMOTE_PATH="/data/golf.db"
LOCAL_PATH="../games_server/golf-remote.db"

echo "📥 Downloading database from Fly.io..."
fly ssh sftp get "$REMOTE_PATH" "$LOCAL_PATH" -a "$APP_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Database downloaded successfully!"
    echo "🚀 Starting SQLite Viewer on http://localhost:8081"
    echo ""
    go run ./main.go "$LOCAL_PATH"
else
    echo "❌ Failed to download database"
    exit 1
fi
