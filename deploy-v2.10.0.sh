#!/bin/bash
# Quick Deployment Script for RiderLabs v2.10.0
# Run this on the LIVE SERVER after pushing code to git

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "${BLUE}╔════════════════════════════════════════╗${NC}"
echo "${BLUE}║  RiderLabs v2.10.0 Deployment Script  ║${NC}"
echo "${BLUE}║  Feedback Management System            ║${NC}"
echo "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Configuration
APP_DIR="/var/www/riderlabs.io"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Step 1: Backup
echo "${YELLOW}📦 Step 1: Creating backups...${NC}"
echo "  → Database backup..."
cp $APP_DIR/fitness-coach.db $BACKUP_DIR/fitness-coach_$TIMESTAMP.db
echo "  → Code backup..."
tar -czf $BACKUP_DIR/code_$TIMESTAMP.tar.gz \
  --exclude=node_modules \
  --exclude=backups \
  --exclude=.git \
  --exclude=dist \
  -C $APP_DIR .
echo "${GREEN}✓ Backups created${NC}"
echo "  - Database: backups/fitness-coach_$TIMESTAMP.db"
echo "  - Code: backups/code_$TIMESTAMP.tar.gz"
echo ""

# Step 2: Pull code
echo "${YELLOW}🔄 Step 2: Pulling latest code...${NC}"
cd $APP_DIR
git fetch origin
git pull origin main
COMMIT=$(git log -1 --oneline)
echo "${GREEN}✓ Code updated${NC}"
echo "  Latest commit: $COMMIT"
echo ""

# Step 3: Install dependencies
echo "${YELLOW}📚 Step 3: Installing dependencies...${NC}"
npm install
echo "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 4: Build frontend
echo "${YELLOW}🏗️  Step 4: Building frontend...${NC}"
npm run build
echo "${GREEN}✓ Frontend built${NC}"
echo ""

# Step 5: Restart service
echo "${YELLOW}🔄 Step 5: Restarting service...${NC}"
pm2 restart riderlabs
sleep 2
echo "${GREEN}✓ Service restarted${NC}"
echo ""

# Step 6: Verify
echo "${YELLOW}🔍 Step 6: Verifying deployment...${NC}"
echo "  → Checking service status..."
pm2 status riderlabs | grep -q "online" && echo "${GREEN}✓ Service is online${NC}" || echo "${RED}✗ Service is not running${NC}"

echo "  → Testing API health..."
HEALTH=$(curl -s https://riderlabs.io/api/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "${GREEN}✓ API is healthy${NC}"
else
  echo "${RED}✗ API health check failed${NC}"
fi
echo ""

# Success
echo "${GREEN}╔════════════════════════════════════════╗${NC}"
echo "${GREEN}║     ✅ Deployment Complete!            ║${NC}"
echo "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "${BLUE}📋 Next Steps:${NC}"
echo "  1. Test admin panel: https://riderlabs.io/admin"
echo "  2. Navigate to Feedback page"
echo "  3. Verify all features work"
echo "  4. Check logs: pm2 logs riderlabs"
echo ""
echo "${BLUE}📖 Full verification checklist:${NC}"
echo "  See DEPLOYMENT_GUIDE_v2.10.0.md"
echo ""
echo "${YELLOW}⚠️  Remember to:${NC}"
echo "  - Test feedback submission from main site"
echo "  - Test feedback management in admin panel"
echo "  - Invite test users to try the app"
echo ""
