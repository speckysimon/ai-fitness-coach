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

# Step 6: Run database migrations (if migration system exists)
if [ -f "$APP_DIR/scripts/migrate.js" ]; then
    log "${BLUE}🗄️  Step 6: Running database migrations${NC}"
    node "$APP_DIR/scripts/migrate.js" | tee -a "$LOG_FILE"
    log "${GREEN}✅ Migrations complete${NC}\n"
else
    log "${YELLOW}⚠️  No migration system found, skipping${NC}\n"
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
    log "${RED}Deployment may have failed. Check logs: pm2 logs riderlabs${NC}"
    exit 1
fi

# Check if server responds
sleep 2  # Give server time to start
if curl -f http://localhost:5001/api/health &> /dev/null; then
    log "${GREEN}✅ Server is responding${NC}"
else
    log "${YELLOW}⚠️  Health check endpoint not responding (may not exist yet)${NC}"
fi

# Check for errors in PM2 logs
RECENT_ERRORS=$(pm2 logs riderlabs --lines 50 --nostream 2>/dev/null | grep -i "error" | head -5 || echo "")
if [ -n "$RECENT_ERRORS" ]; then
    log "${YELLOW}⚠️  Recent errors found in logs:${NC}"
    log "$RECENT_ERRORS"
    log "${YELLOW}Check full logs with: pm2 logs riderlabs${NC}"
fi

log "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
log "${GREEN}║   ✅ Deployment Complete!                  ║${NC}"
log "${GREEN}╚════════════════════════════════════════════╝${NC}\n"

log "${BLUE}📝 Deployment log saved to: $LOG_FILE${NC}"
log "${BLUE}🔍 Check logs: pm2 logs riderlabs${NC}"
log "${BLUE}📊 Check status: pm2 status riderlabs${NC}"
log "${BLUE}🔄 Restart if needed: pm2 restart riderlabs${NC}\n"

# Rollback instructions
log "${YELLOW}📌 If deployment failed, rollback with:${NC}"
log "${YELLOW}   git reset --hard $CURRENT_COMMIT${NC}"
log "${YELLOW}   npm install${NC}"
log "${YELLOW}   npm run build${NC}"
log "${YELLOW}   pm2 restart riderlabs${NC}\n"
