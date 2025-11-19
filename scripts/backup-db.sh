#!/bin/bash
# ============================================================================
# Database Backup Script
# Safely backs up both SQLite databases including WAL files
# ============================================================================

set -e  # Exit on error

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Starting database backup...${NC}"
echo -e "${BLUE}Timestamp: ${TIMESTAMP}${NC}"

# Create backup directory
mkdir -p "$APP_DIR/$BACKUP_DIR"

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list | grep riderlabs || echo "not running")
    if [[ "$PM2_STATUS" != "not running" ]]; then
        echo -e "${YELLOW}⚠️  PM2 is running. Stopping for clean backup...${NC}"
        pm2 stop riderlabs || true
        RESTART_PM2=true
    fi
fi

# Backup fitness-coach.db (main app database)
if [ -f "$APP_DIR/server/fitness-coach.db" ]; then
    echo -e "${BLUE}📦 Backing up fitness-coach.db...${NC}"
    sqlite3 "$APP_DIR/server/fitness-coach.db" ".backup '$APP_DIR/$BACKUP_DIR/fitness-coach_$TIMESTAMP.db'"
    echo -e "${GREEN}✅ fitness-coach.db backed up${NC}"
else
    echo -e "${YELLOW}⚠️  fitness-coach.db not found, skipping${NC}"
fi

# Backup database.sqlite (admin database)
if [ -f "$APP_DIR/server/database.sqlite" ]; then
    echo -e "${BLUE}📦 Backing up database.sqlite...${NC}"
    sqlite3 "$APP_DIR/server/database.sqlite" ".backup '$APP_DIR/$BACKUP_DIR/database_$TIMESTAMP.sqlite'"
    echo -e "${GREEN}✅ database.sqlite backed up${NC}"
else
    echo -e "${YELLOW}⚠️  database.sqlite not found, skipping${NC}"
fi

# Restart PM2 if it was running
if [ "$RESTART_PM2" = true ]; then
    echo -e "${BLUE}🔄 Restarting PM2...${NC}"
    pm2 start riderlabs || true
fi

# List backup files
echo -e "\n${GREEN}✅ Backup complete!${NC}"
echo -e "${BLUE}Backup files:${NC}"
ls -lh "$APP_DIR/$BACKUP_DIR/"*_$TIMESTAMP.* 2>/dev/null || echo "No backups created"

# Keep only last 10 backups
echo -e "\n${BLUE}🧹 Cleaning old backups (keeping last 10)...${NC}"
cd "$APP_DIR/$BACKUP_DIR"
ls -t fitness-coach_*.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
ls -t database_*.sqlite 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

echo -e "${GREEN}✅ Cleanup complete${NC}"
