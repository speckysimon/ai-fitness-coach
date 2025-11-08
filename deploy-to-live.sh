#!/bin/bash
# Deployment Script for RiderLabs v2.9.0
# Run this script on the LIVE SERVER after pushing to git

set -e  # Exit on any error

echo "🚀 Starting deployment of RiderLabs v2.9.0..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/riderlabs.io"
BACKUP_DIR="$APP_DIR/backups"
DB_NAME="riderlabs_db"
DB_USER="your_db_user"  # UPDATE THIS

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "${YELLOW}Step 1: Creating backups...${NC}"
# Backup database
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "  - Backing up database to $BACKUP_DIR/riderlabs_$TIMESTAMP.sql"
mysqldump -u $DB_USER -p $DB_NAME > $BACKUP_DIR/riderlabs_$TIMESTAMP.sql

# Backup current code
echo "  - Backing up code to $BACKUP_DIR/code_$TIMESTAMP.tar.gz"
tar -czf $BACKUP_DIR/code_$TIMESTAMP.tar.gz --exclude=node_modules --exclude=backups --exclude=.git .

echo "${GREEN}✓ Backups created${NC}"
echo ""

echo "${YELLOW}Step 2: Pulling latest code from git...${NC}"
cd $APP_DIR
git fetch origin
git pull origin main
echo "${GREEN}✓ Code updated${NC}"
echo ""

echo "${YELLOW}Step 3: Installing dependencies...${NC}"
npm install
echo "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo "${YELLOW}Step 4: Running database migrations...${NC}"
node server/migrations/run-all-migrations.js
echo "${GREEN}✓ Migrations completed${NC}"
echo ""

echo "${YELLOW}Step 5: Building frontend...${NC}"
npm run build
echo "${GREEN}✓ Build completed${NC}"
echo ""

echo "${YELLOW}Step 6: Restarting services...${NC}"
# Uncomment the appropriate command for your setup:
# pm2 restart riderlabs
# sudo systemctl restart riderlabs
echo "  ${RED}⚠️  Please restart your Node.js service manually${NC}"
echo "  Run one of:"
echo "    - pm2 restart riderlabs"
echo "    - sudo systemctl restart riderlabs"
echo ""

echo "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📋 Post-deployment checklist:"
echo "  1. Check service status: pm2 status (or systemctl status riderlabs)"
echo "  2. Check logs: pm2 logs riderlabs"
echo "  3. Test dashboard: https://riderlabs.io"
echo "  4. Test admin panel: https://riderlabs.io/admin"
echo "  5. Test onboarding modal (new user)"
echo "  6. Test mobile responsiveness"
echo ""
echo "📖 See DEPLOYMENT_GUIDE_v2.9.0.md for full verification steps"
