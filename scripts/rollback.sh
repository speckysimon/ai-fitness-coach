#!/bin/bash
# ============================================================================
# Emergency Rollback Script
# Restores previous deployment state
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   ⚠️  Emergency Rollback                   ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════╝${NC}\n"

# Confirm rollback
read -p "Are you sure you want to rollback? (yes/NO) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Rollback cancelled${NC}"
    exit 0
fi

# Step 1: Stop PM2
echo -e "${BLUE}🛑 Step 1: Stopping PM2${NC}"
pm2 stop riderlabs
echo -e "${GREEN}✅ PM2 stopped${NC}\n"

# Step 2: Find latest backup
echo -e "${BLUE}📦 Step 2: Finding latest backup${NC}"
LATEST_MAIN_BACKUP=$(ls -t backups/fitness-coach_*.db 2>/dev/null | head -1)
LATEST_ADMIN_BACKUP=$(ls -t backups/database_*.db 2>/dev/null | head -1)

if [ -z "$LATEST_MAIN_BACKUP" ]; then
    echo -e "${RED}❌ No main database backup found!${NC}"
    echo -e "${YELLOW}Cannot rollback database. Code rollback only.${NC}\n"
else
    echo -e "${GREEN}Found main DB backup: $LATEST_MAIN_BACKUP${NC}"
fi

if [ -z "$LATEST_ADMIN_BACKUP" ]; then
    echo -e "${YELLOW}⚠️  No admin database backup found${NC}\n"
else
    echo -e "${GREEN}Found admin DB backup: $LATEST_ADMIN_BACKUP${NC}\n"
fi

# Step 3: Restore databases
if [ -n "$LATEST_MAIN_BACKUP" ]; then
    echo -e "${BLUE}🔄 Step 3: Restoring databases${NC}"
    
    # Backup current (failed) state
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    cp server/fitness-coach.db "server/fitness-coach.db.failed_$TIMESTAMP" 2>/dev/null || true
    
    # Restore from backup
    cp "$LATEST_MAIN_BACKUP" server/fitness-coach.db
    echo -e "${GREEN}✅ Main database restored${NC}"
    
    if [ -n "$LATEST_ADMIN_BACKUP" ]; then
        cp server/database.sqlite "server/database.sqlite.failed_$TIMESTAMP" 2>/dev/null || true
        cp "$LATEST_ADMIN_BACKUP" server/database.sqlite
        echo -e "${GREEN}✅ Admin database restored${NC}\n"
    fi
fi

# Step 4: Rollback code (optional)
echo -e "${BLUE}🔄 Step 4: Code rollback${NC}"
read -p "Rollback code to previous commit? (y/N) " -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    CURRENT_COMMIT=$(git rev-parse HEAD)
    PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
    
    echo -e "${YELLOW}Current: $CURRENT_COMMIT${NC}"
    echo -e "${YELLOW}Rolling back to: $PREVIOUS_COMMIT${NC}"
    
    git reset --hard HEAD~1
    npm install
    npm run build
    
    echo -e "${GREEN}✅ Code rolled back${NC}\n"
else
    echo -e "${YELLOW}Skipping code rollback${NC}\n"
fi

# Step 5: Restart PM2
echo -e "${BLUE}🔄 Step 5: Restarting PM2${NC}"
pm2 start riderlabs
sleep 3
echo -e "${GREEN}✅ PM2 restarted${NC}\n"

# Step 6: Verify
echo -e "${BLUE}🔍 Step 6: Verifying rollback${NC}"
PM2_STATUS=$(pm2 list | grep riderlabs | grep online || echo "")
if [ -z "$PM2_STATUS" ]; then
    echo -e "${RED}❌ PM2 process not running!${NC}"
    echo -e "${RED}Check logs: pm2 logs riderlabs${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PM2 process running${NC}"

# Check health endpoint
sleep 2
if curl -f http://localhost:5001/api/health &> /dev/null; then
    echo -e "${GREEN}✅ Server responding${NC}\n"
else
    echo -e "${YELLOW}⚠️  Server not responding yet (may need more time)${NC}\n"
fi

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Rollback Complete!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "${BLUE}   • Check logs: pm2 logs riderlabs${NC}"
echo -e "${BLUE}   • Check status: pm2 status${NC}"
echo -e "${BLUE}   • Test app: https://riderlabs.io${NC}"
echo -e "${BLUE}   • Failed state saved with timestamp: $TIMESTAMP${NC}\n"
