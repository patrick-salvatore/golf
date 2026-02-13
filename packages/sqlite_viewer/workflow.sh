#!/bin/bash

# SQLite Viewer - Complete Database Management Workflow
# Usage: ./workflow.sh [command]

set -e

APP_NAME="golf-games-server"
REMOTE_PATH="/data/golf.db"
LOCAL_PATH="../games_server/golf-remote.db"
LOCAL_DB_PATH="../games_server/golf.db"
BACKUP_DIR="../games_server/backups"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_help() {
    echo "SQLite Viewer - Database Management"
    echo ""
    echo "Usage: ./workflow.sh [command]"
    echo ""
    echo "Commands:"
    echo "  download    Download database from Fly.io"
    echo "  view        Download and open in SQLite viewer"
    echo "  upload      Upload local golf.db to Fly.io (replaces remote DB)"
    echo "  backup      Create backup of remote database"
    echo "  list        List all local backups"
    echo "  restore     Restore from a backup"
    echo ""
    echo "Examples:"
    echo "  ./workflow.sh download"
    echo "  ./workflow.sh view"
    echo "  ./workflow.sh upload"
    echo ""
    echo "Note: 'upload' uses ../games_server/golf.db as source"
}

download_db() {
    echo -e "${BLUE}📥 Downloading database from Fly.io...${NC}"
    fly ssh sftp get "$REMOTE_PATH" "$LOCAL_PATH" -a "$APP_NAME"
    echo -e "${GREEN}✅ Database downloaded to: $LOCAL_PATH${NC}"
}

view_db() {
    if [ ! -f "$LOCAL_PATH" ]; then
        echo -e "${YELLOW}⚠️  Local database not found, downloading first...${NC}"
        download_db
    fi
    
    echo -e "${BLUE}🚀 Starting SQLite Viewer on http://localhost:8081${NC}"
    go run ./main.go "$LOCAL_PATH"
}

upload_db() {
    echo -e "${BLUE}📤 Uploading local database to Fly.io...${NC}"
    echo -e "${YELLOW}Source: $LOCAL_DB_PATH${NC}"
    echo ""
    ./upload-to-fly.sh "$LOCAL_DB_PATH" "$APP_NAME"
}

backup_db() {
    echo -e "${BLUE}💾 Creating backup...${NC}"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/golf-backup-$(date +%Y%m%d-%H%M%S).db"
    fly ssh sftp get "$REMOTE_PATH" "$BACKUP_FILE" -a "$APP_NAME"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup saved: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
}

list_backups() {
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backups found."
        return
    fi
    
    echo -e "${BLUE}📦 Available backups:${NC}"
    echo ""
    ls -lh "$BACKUP_DIR"/*.db 2>/dev/null | awk '{print $9, "("$5")"}'
}

restore_backup() {
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backups found."
        exit 1
    fi
    
    echo -e "${BLUE}📦 Available backups:${NC}"
    select backup in "$BACKUP_DIR"/*.db; do
        if [ -n "$backup" ]; then
            echo ""
            echo -e "${YELLOW}Restoring from: $backup${NC}"
            cp "$backup" "$LOCAL_PATH"
            echo -e "${GREEN}✅ Restored to: $LOCAL_PATH${NC}"
            echo ""
            read -p "$(echo -e ${YELLOW}Upload to Fly.io? [y/N]:${NC} )" -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                upload_db
            fi
            break
        fi
    done
}

# Main command handler
case "${1:-}" in
    download)
        download_db
        ;;
    view)
        view_db
        ;;
    upload)
        upload_db
        ;;
    backup)
        backup_db
        ;;
    list)
        list_backups
        ;;
    restore)
        restore_backup
        ;;
    *)
        show_help
        ;;
esac
