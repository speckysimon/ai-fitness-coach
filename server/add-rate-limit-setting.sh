#!/bin/bash
# ============================================================================
# Add Rate Limit Setting to Admin Database
# Adds max_ai_chats_per_day setting to global_settings table
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Add Rate Limit Setting                  ║${NC}"
echo -e "${BLUE}║   $(date '+%Y-%m-%d %H:%M:%S')                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_PATH="$SCRIPT_DIR/database.sqlite"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Error: database.sqlite not found${NC}"
    echo -e "${YELLOW}Expected location: $DB_PATH${NC}"
    exit 1
fi

# Check if SQL file exists
if [ ! -f "$SCRIPT_DIR/add-rate-limit-setting.sql" ]; then
    echo -e "${RED}❌ Error: add-rate-limit-setting.sql not found${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Current limits settings:${NC}"
sqlite3 "$DB_PATH" "SELECT setting_key, setting_value FROM global_settings WHERE category='limits';" 2>/dev/null || echo "No limits settings found yet"

echo -e "\n${YELLOW}⚠️  This will add 'max_ai_chats_per_day' setting (default: 10)${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Operation cancelled${NC}"
    exit 0
fi

echo -e "\n${BLUE}📥 Adding rate limit setting...${NC}"
sqlite3 "$DB_PATH" < "$SCRIPT_DIR/add-rate-limit-setting.sql"

echo -e "\n${GREEN}✅ Setting added successfully!${NC}\n"

echo -e "${BLUE}📊 Updated limits settings:${NC}"
sqlite3 "$DB_PATH" << 'EOF'
.mode column
.headers on
SELECT 
  setting_key as "Setting Key",
  setting_value as "Value",
  description as "Description"
FROM global_settings 
WHERE category='limits'
ORDER BY setting_key;
EOF

echo -e "\n${GREEN}✅ Rate limit setting is now available in Admin > Global Settings!${NC}"
echo -e "${BLUE}ℹ️  Access it at: http://localhost:3000/admin/settings${NC}"
