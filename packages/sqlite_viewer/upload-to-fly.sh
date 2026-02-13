#!/bin/bash

# SQLite Viewer - Upload Database to Fly.io
# Usage: ./upload-to-fly.sh [local-db-path] [app-name]

set -e

LOCAL_DB="${1:-../games_server/golf.db}"
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

# Create backup in local backups directory
echo -e "${BLUE}💾 Creating local backup...${NC}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/golf-backup-$TIMESTAMP.db"

echo -e "${BLUE}Attempting to download current remote database...${NC}"
BACKUP_SUCCESS=false
for i in {1..3}; do
    if fly ssh sftp get "$REMOTE_PATH" "$BACKUP_FILE" -a "$APP_NAME" 2>/dev/null; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✅ Backup saved: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
        BACKUP_SUCCESS=true
        break
    else
        if [ $i -lt 3 ]; then
            echo -e "${YELLOW}⚠️  Backup attempt $i failed, retrying...${NC}"
            sleep 2
        fi
    fi
done

if [ "$BACKUP_SUCCESS" = false ]; then
    echo -e "${RED}❌ Backup failed after 3 attempts!${NC}"
    read -p "$(echo -e ${YELLOW}Continue without backup? [y/N]:${NC} )" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Upload cancelled${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🔄 Renaming remote database with timestamp...${NC}"

# Rename the remote database file with timestamp
REMOTE_BACKUP_PATH="/data/golf-$TIMESTAMP.db"
RENAME_SUCCESS=false

for i in {1..3}; do
    if fly ssh console -a "$APP_NAME" -C "mv $REMOTE_PATH $REMOTE_BACKUP_PATH" 2>/dev/null; then
        echo -e "${GREEN}✅ Remote database renamed to: golf-$TIMESTAMP.db${NC}"
        RENAME_SUCCESS=true
        break
    else
        if [ $i -lt 3 ]; then
            echo -e "${YELLOW}⚠️  Rename attempt $i failed, retrying...${NC}"
            sleep 2
        fi
    fi
done

if [ "$RENAME_SUCCESS" = false ]; then
    echo -e "${RED}❌ Failed to rename remote database after 3 attempts!${NC}"
    read -p "$(echo -e ${YELLOW}Continue with upload anyway (will overwrite)? [y/N]:${NC} )" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Upload cancelled${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}⚠️  This will REPLACE the production database!${NC}"
read -p "$(echo -e ${RED}Continue with upload? [y/N]:${NC} )" -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}📤 Uploading database to Fly.io...${NC}"
    
    UPLOAD_SUCCESS=false
    for i in {1..3}; do
        echo -e "${BLUE}Upload attempt $i of 3...${NC}"
        if fly ssh sftp put "$LOCAL_DB" "$REMOTE_PATH" -a "$APP_NAME" 2>&1; then
            UPLOAD_SUCCESS=true
            break
        else
            if [ $i -lt 3 ]; then
                echo -e "${YELLOW}⚠️  Upload attempt $i failed, retrying in 3 seconds...${NC}"
                sleep 3
            fi
        fi
    done
    
    if [ "$UPLOAD_SUCCESS" = true ]; then
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
        if [ -f "$BACKUP_FILE" ]; then
            echo -e "${BLUE}💾 Local backup: $BACKUP_FILE${NC}"
        fi
        if [ "$RENAME_SUCCESS" = true ]; then
            echo -e "${BLUE}🗄️  Remote backup: $REMOTE_BACKUP_PATH${NC}"
        fi
    else
        echo -e "${RED}❌ Upload failed after 3 attempts!${NC}"
        if [ "$RENAME_SUCCESS" = true ]; then
            echo -e "${YELLOW}⚠️  Attempting to restore remote database...${NC}"
            fly ssh console -a "$APP_NAME" -C "mv $REMOTE_BACKUP_PATH $REMOTE_PATH" 2>/dev/null && \
                echo -e "${GREEN}✅ Remote database restored${NC}" || \
                echo -e "${RED}❌ Failed to restore. Manual intervention required!${NC}"
        fi
        exit 1
    fi
else
    echo -e "${RED}❌ Upload cancelled${NC}"
    if [ "$RENAME_SUCCESS" = true ]; then
        echo -e "${YELLOW}⚠️  Remote database was renamed. Restoring original name...${NC}"
        fly ssh console -a "$APP_NAME" -C "mv $REMOTE_BACKUP_PATH $REMOTE_PATH" 2>/dev/null && \
            echo -e "${GREEN}✅ Remote database restored${NC}" || \
            echo -e "${RED}❌ Failed to restore. Manual intervention required!${NC}"
    fi
    exit 1
fi
