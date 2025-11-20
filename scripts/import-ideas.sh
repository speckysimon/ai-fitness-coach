#!/bin/bash
# ============================================================================
# Import Ideas to Production Database
# Imports all ideas from local development to production
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Import Ideas to Production              ║${NC}"
echo -e "${BLUE}║   $(date)                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if database exists
if [ ! -f "$APP_DIR/server/database.sqlite" ]; then
    echo -e "${RED}❌ Error: database.sqlite not found${NC}"
    echo -e "${YELLOW}Expected location: $APP_DIR/server/database.sqlite${NC}"
    exit 1
fi

# Check if import SQL file exists
if [ ! -f "$SCRIPT_DIR/import-ideas-to-prod.sql" ]; then
    echo -e "${RED}❌ Error: import-ideas-to-prod.sql not found${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Current ideas in database:${NC}"
sqlite3 "$APP_DIR/server/database.sqlite" "SELECT COUNT(*) FROM ideas;" 2>/dev/null || echo "0 (table may not exist yet)"

echo -e "\n${YELLOW}⚠️  This will import 18 ideas from local development${NC}"
echo -e "${YELLOW}   Existing ideas with same IDs will be updated${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Import cancelled${NC}"
    exit 0
fi

echo -e "\n${BLUE}📥 Importing ideas...${NC}"
sqlite3 "$APP_DIR/server/database.sqlite" < "$SCRIPT_DIR/import-ideas-to-prod.sql"

echo -e "\n${GREEN}✅ Import complete!${NC}\n"

echo -e "${BLUE}📊 Summary:${NC}"
sqlite3 "$APP_DIR/server/database.sqlite" << 'EOF'
.mode column
.headers on
SELECT 'Total Ideas:' as metric, COUNT(*) as value FROM ideas
UNION ALL
SELECT 'Critical Priority:', COUNT(*) FROM ideas WHERE priority='critical'
UNION ALL
SELECT 'High Priority:', COUNT(*) FROM ideas WHERE priority='high'
UNION ALL
SELECT 'Medium Priority:', COUNT(*) FROM ideas WHERE priority='medium'
UNION ALL
SELECT 'Low Priority:', COUNT(*) FROM ideas WHERE priority='low';
EOF

echo -e "\n${GREEN}✅ Ideas successfully imported to production!${NC}"
