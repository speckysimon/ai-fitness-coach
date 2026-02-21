#!/bin/bash

# Script to rename admin database from database.sqlite to fitness-coach-admin.db
# and update all file references

set -e  # Exit on error

echo "🔄 Starting admin database rename process..."

# 1. Rename the physical database file
echo "📁 Renaming database file..."
if [ -f "server/database.sqlite" ]; then
    mv server/database.sqlite server/fitness-coach-admin.db
    echo "✅ Renamed server/database.sqlite → server/fitness-coach-admin.db"
else
    echo "⚠️  server/database.sqlite not found, skipping rename"
fi

# 2. Update all file references
echo "📝 Updating file references..."

# Update adminDb.cjs
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/adminDb.cjs
echo "✅ Updated server/adminDb.cjs"

# Update services
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/services/adminService.cjs
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/services/ideasService.cjs
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/services/apiKeyLoader.cjs
echo "✅ Updated services (3 files)"

# Update routes
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/routes/health.js
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/routes/themeConfigs.cjs
echo "✅ Updated routes (2 files)"

# Update migrations
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/migrations/011_add_season_races_fields.cjs
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/migrations/012_move_season_races_to_main_db.cjs
echo "✅ Updated migrations (2 files)"

# Update seed scripts
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/scripts/seedCustomThemes.cjs
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/scripts/seedDefaultThemes.cjs
sed -i '' 's/database\.sqlite/fitness-coach-admin.db/g' server/seedIdeas.cjs
echo "✅ Updated seed scripts (3 files)"

# 3. Verify changes
echo ""
echo "🔍 Verification:"
echo "Files updated: 13"
echo ""
echo "Checking for remaining references to 'database.sqlite'..."
remaining=$(grep -r "database\.sqlite" server/ --include="*.js" --include="*.cjs" 2>/dev/null | grep -v node_modules | wc -l)

if [ "$remaining" -eq 0 ]; then
    echo "✅ All references updated successfully!"
else
    echo "⚠️  Found $remaining remaining references:"
    grep -r "database\.sqlite" server/ --include="*.js" --include="*.cjs" 2>/dev/null | grep -v node_modules
fi

echo ""
echo "✅ Admin database rename complete!"
echo ""
echo "Next steps:"
echo "1. Run migration: node server/migrations/012_move_season_races_to_main_db.cjs"
echo "2. Verify tables: sqlite3 server/fitness-coach.db '.tables'"
echo "3. Restart server: npm run dev"
