#!/bin/bash

# SQLite Viewer - Upload Database to Fly.io
# Usage: ./upload-to-fly.sh [local-db-path] [app-name]

set -e

LOCAL_DB="${1:-../games_server/golf-remote.db}"
APP_NAME="${2:-golf-games-server}"
REMOTE_PATH="/data/golf.db"
BACKUP_DIR="../games_server/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  WARNING: Database Upload to Production${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📍 Source:${NC} $LOCAL_DB"
echo -e "${BLUE}🎯 Target:${NC} $APP_NAME:$REMOTE_PATH"
echo ""

# Check if local database exists
if [ ! -f "$LOCAL_DB" ]; then
    echo -e "${RED}❌ Error: Local database not found at $LOCAL_DB${NC}"
    exit 1
fi

# Get file size
DB_SIZE=$(du -h "$LOCAL_DB" | cut -f1)
echo -e "${BLUE}📦 Database size:${NC} $DB_SIZE"
echo ""

# Ask about backup
read -p "$(echo -e ${YELLOW}Create backup before upload? [Y/n]:${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}💾 Creating backup...${NC}"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/golf-backup-$(date +%Y%m%d-%H%M%S).db"
    
    if fly ssh sftp get "$REMOTE_PATH" "$BACKUP_FILE" -a "$APP_NAME"; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✅ Backup saved: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
    else
        echo -e "${RED}❌ Backup failed!${NC}"
        read -p "$(echo -e ${YELLOW}Continue without backup? [y/N]:${NC} )" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}❌ Upload cancelled${NC}"
            exit 1
        fi
    fi
fi

echo ""
echo -e "${YELLOW}⚠️  This will REPLACE the production database!${NC}"
read -p "$(echo -e ${RED}Continue with upload? [y/N]:${NC} )" -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}📤 Uploading database to Fly.io...${NC}"
    
    if fly ssh sftp put "$LOCAL_DB" "$REMOTE_PATH" -a "$APP_NAME"; then
        echo -e "${GREEN}✅ Database uploaded successfully!${NC}"
        echo ""
        
        read -p "$(echo -e ${YELLOW}Restart application? [Y/n]:${NC} )" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            echo -e "${BLUE}🔄 Restarting application...${NC}"
            fly apps restart "$APP_NAME"
            echo -e "${GREEN}✅ Application restarted!${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✅ Upload complete!${NC}"
        
        if [ -n "$BACKUP_FILE" ]; then
            echo -e "${BLUE}💾 Backup stored at: $BACKUP_FILE${NC}"
        fi
    else
        echo -e "${RED}❌ Upload failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Upload cancelled${NC}"
    exit 1
fi
