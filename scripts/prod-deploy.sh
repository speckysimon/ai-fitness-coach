#!/bin/bash
# ============================================================================
# Production Deployment Script
# Automated, safe deployment with backup and rollback capability
# ============================================================================

set -e  # Exit on error

# Configuration
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$APP_DIR/deploy_$TIMESTAMP.log"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Rollback function
rollback() {
    log "${RED}❌ Deployment failed! Initiating automatic rollback...${NC}"
    
    # Restore code
    log "${BLUE}🔄 Restoring code to commit: $CURRENT_COMMIT${NC}"
    git reset --hard $CURRENT_COMMIT
    npm install --production 2>&1 | tee -a "$LOG_FILE"
    npm run build 2>&1 | tee -a "$LOG_FILE"
    
    # Restore databases from backup
    LATEST_MAIN_BACKUP=$(ls -t backups/fitness-coach_*.db 2>/dev/null | head -1)
    LATEST_ADMIN_BACKUP=$(ls -t backups/database_*.db 2>/dev/null | head -1)
    
    if [ -n "$LATEST_MAIN_BACKUP" ]; then
        cp "$LATEST_MAIN_BACKUP" server/fitness-coach.db
        log "${GREEN}✅ Main database restored${NC}"
    fi
    
    if [ -n "$LATEST_ADMIN_BACKUP" ]; then
        cp "$LATEST_ADMIN_BACKUP" server/database.sqlite
        log "${GREEN}✅ Admin database restored${NC}"
    fi
    
    # Restart PM2
    pm2 restart riderlabs 2>&1 | tee -a "$LOG_FILE"
    
    log "${RED}╔════════════════════════════════════════════╗${NC}"
    log "${RED}║   ❌ Rollback Complete                     ║${NC}"
    log "${RED}╚════════════════════════════════════════════╝${NC}\n"
    log "${YELLOW}Check logs: pm2 logs riderlabs${NC}"
    log "${YELLOW}Deployment log: $LOG_FILE${NC}\n"
    exit 1
}

# Set trap to rollback on error
trap rollback ERR

log "${BLUE}╔════════════════════════════════════════════╗${NC}"
log "${BLUE}║   RiderLabs Production Deployment         ║${NC}"
log "${BLUE}║   $(date)                  ║${NC}"
log "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

# Change to app directory
cd "$APP_DIR"

# Step 1: Pre-deployment checks
log "${BLUE}📋 Step 1: Pre-deployment checks${NC}"

if ! command -v pm2 &> /dev/null; then
    log "${RED}❌ PM2 not found. Please install PM2 first.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    log "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

if ! command -v sqlite3 &> /dev/null; then
    log "${RED}❌ SQLite3 not found. Please install sqlite3 first.${NC}"
    exit 1
fi

log "${GREEN}✅ All prerequisites met${NC}\n"

# Step 1.5: Check database integrity before deployment
log "${BLUE}🔍 Step 1.5: Checking database integrity${NC}"
MAIN_INTEGRITY=$(sqlite3 server/fitness-coach.db "PRAGMA integrity_check;" 2>/dev/null || echo "error")
ADMIN_INTEGRITY=$(sqlite3 server/database.sqlite "PRAGMA integrity_check;" 2>/dev/null || echo "error")

if [ "$MAIN_INTEGRITY" != "ok" ]; then
    log "${RED}❌ Main database integrity check failed: $MAIN_INTEGRITY${NC}"
    log "${YELLOW}Fix database issues before deploying${NC}"
    exit 1
fi

if [ "$ADMIN_INTEGRITY" != "ok" ]; then
    log "${RED}❌ Admin database integrity check failed: $ADMIN_INTEGRITY${NC}"
    log "${YELLOW}Fix database issues before deploying${NC}"
    exit 1
fi

log "${GREEN}✅ Database integrity verified${NC}\n"

# Step 2: Backup databases
log "${BLUE}📦 Step 2: Backing up databases${NC}"
bash "$APP_DIR/scripts/backup-db.sh" | tee -a "$LOG_FILE"
log "${GREEN}✅ Backup complete${NC}\n"

# Step 3: Pull latest code
log "${BLUE}🔄 Step 3: Pulling latest code${NC}"
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
log "Current commit: $CURRENT_COMMIT"

git reset --hard origin/main
NEW_COMMIT=$(git rev-parse HEAD)
log "New commit: $NEW_COMMIT"

if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    log "${YELLOW}⚠️  No new commits, but continuing deployment${NC}"
fi
log "${GREEN}✅ Code updated${NC}\n"

# Step 4: Install dependencies
log "${BLUE}📦 Step 4: Installing dependencies${NC}"
npm install --production | tee -a "$LOG_FILE"
log "${GREEN}✅ Dependencies installed${NC}\n"

# Step 5: Build frontend
log "${BLUE}🏗️  Step 5: Building frontend${NC}"
npm run build | tee -a "$LOG_FILE"
log "${GREEN}✅ Frontend built${NC}\n"

# Step 6: Run database migrations
log "${BLUE}🗄️  Step 6: Running database migrations${NC}"

# Run main app database migrations
if [ -f "$APP_DIR/scripts/migrate.js" ]; then
    log "${BLUE}📊 Running main database migrations...${NC}"
    node "$APP_DIR/scripts/migrate.js" | tee -a "$LOG_FILE"
    log "${GREEN}✅ Main database migrations complete${NC}"
else
    log "${YELLOW}⚠️  No main migration system found, skipping${NC}"
fi

# Run admin database migrations
if [ -f "$APP_DIR/scripts/migrate-admin.js" ]; then
    log "${BLUE}🔐 Running admin database migrations...${NC}"
    node "$APP_DIR/scripts/migrate-admin.js" | tee -a "$LOG_FILE"
    log "${GREEN}✅ Admin database migrations complete${NC}\n"
else
    log "${YELLOW}⚠️  No admin migration system found, skipping${NC}\n"
fi

# Step 7: Restart PM2
log "${BLUE}🔄 Step 7: Restarting PM2${NC}"
pm2 restart riderlabs | tee -a "$LOG_FILE"
sleep 3  # Give PM2 time to restart
log "${GREEN}✅ PM2 restarted${NC}\n"

# Step 8: Verify deployment
log "${BLUE}✅ Step 8: Verifying deployment${NC}"

# Check PM2 status
PM2_STATUS=$(pm2 list | grep riderlabs | grep online || echo "")
if [ -z "$PM2_STATUS" ]; then
    log "${RED}❌ PM2 process not running!${NC}"
    rollback
fi
log "${GREEN}✅ PM2 process running${NC}"

# Give server time to start
sleep 3

# Check if server responds
HEALTH_CHECK_ATTEMPTS=0
HEALTH_CHECK_MAX=5
while [ $HEALTH_CHECK_ATTEMPTS -lt $HEALTH_CHECK_MAX ]; do
    if curl -f http://localhost:5001/api/health &> /dev/null; then
        log "${GREEN}✅ Server is responding${NC}"
        break
    fi
    HEALTH_CHECK_ATTEMPTS=$((HEALTH_CHECK_ATTEMPTS + 1))
    if [ $HEALTH_CHECK_ATTEMPTS -lt $HEALTH_CHECK_MAX ]; then
        log "${YELLOW}⏳ Waiting for server... (attempt $HEALTH_CHECK_ATTEMPTS/$HEALTH_CHECK_MAX)${NC}"
        sleep 2
    else
        log "${RED}❌ Health check failed after $HEALTH_CHECK_MAX attempts${NC}"
        rollback
    fi
done

# Verify database integrity after deployment
log "${BLUE}🔍 Verifying database integrity post-deployment${NC}"
MAIN_INTEGRITY_POST=$(sqlite3 server/fitness-coach.db "PRAGMA integrity_check;" 2>/dev/null || echo "error")
if [ "$MAIN_INTEGRITY_POST" != "ok" ]; then
    log "${RED}❌ Database integrity check failed after deployment!${NC}"
    rollback
fi
log "${GREEN}✅ Database integrity verified${NC}"

# Check for critical errors in PM2 logs
RECENT_ERRORS=$(pm2 logs riderlabs --lines 50 --nostream 2>/dev/null | grep -iE "(SQLITE_ERROR|SQLITE_CORRUPT|Cannot read properties of undefined)" | head -5 || echo "")
if [ -n "$RECENT_ERRORS" ]; then
    log "${RED}❌ Critical errors found in logs:${NC}"
    log "$RECENT_ERRORS"
    rollback
fi

log "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
log "${GREEN}║   ✅ Deployment Complete!                  ║${NC}"
log "${GREEN}╚════════════════════════════════════════════╝${NC}\n"

log "${BLUE}📝 Deployment log saved to: $LOG_FILE${NC}"
log "${BLUE}🔍 Check logs: pm2 logs riderlabs${NC}"
log "${BLUE}📊 Check status: pm2 status riderlabs${NC}"
log "${BLUE}🌐 Check app: https://riderlabs.io${NC}"
log "${BLUE}🔧 Check admin: https://riderlabs.io/admin${NC}\n"

# Manual rollback instructions (if needed later)
log "${YELLOW}📌 Manual rollback (if needed):${NC}"
log "${YELLOW}   ./scripts/rollback.sh${NC}\n"

# Disable error trap now that deployment succeeded
trap - ERR
