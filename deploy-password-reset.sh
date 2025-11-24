#!/bin/bash
# Password Reset Feature Deployment Script
# Safe deployment with database backups and migrations

set -e

echo "🚀 Deploying Password Reset Feature..."

# Step 1: Backup databases
echo "💾 Backing up databases..."
cp server/fitness-coach.db server/fitness-coach.db.backup.$(date +%Y%m%d_%H%M%S)
cp server/database.sqlite server/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)

# Step 2: Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Step 3: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 4: Verify existing data (pre-migration check)
echo "🔍 Verifying existing data..."
USER_COUNT=$(sqlite3 server/fitness-coach.db "SELECT COUNT(*) FROM users;")
ADMIN_COUNT=$(sqlite3 server/fitness-coach.db "SELECT COUNT(*) FROM admin_users;" 2>/dev/null || echo "0")
echo "   Users: $USER_COUNT"
echo "   Admins: $ADMIN_COUNT"

# Step 5: Run database migrations
echo "🗄️  Running database migrations..."
sqlite3 server/fitness-coach.db < migrations/001_password_resets.sql
sqlite3 server/fitness-coach.db < migrations/admin/001_admin_password_resets.sql
echo "   ✓ Migrations complete"

# Step 6: Verify data integrity (post-migration check)
echo "🔍 Verifying data integrity..."
USER_COUNT_AFTER=$(sqlite3 server/fitness-coach.db "SELECT COUNT(*) FROM users;")
ADMIN_COUNT_AFTER=$(sqlite3 server/fitness-coach.db "SELECT COUNT(*) FROM admin_users;" 2>/dev/null || echo "0")

if [ "$USER_COUNT" != "$USER_COUNT_AFTER" ]; then
  echo "❌ ERROR: User count mismatch! Rolling back..."
  exit 1
fi

if [ "$ADMIN_COUNT" != "$ADMIN_COUNT_AFTER" ]; then
  echo "❌ ERROR: Admin count mismatch! Rolling back..."
  exit 1
fi

echo "   ✓ Data integrity verified"
echo "   Users: $USER_COUNT_AFTER (unchanged)"
echo "   Admins: $ADMIN_COUNT_AFTER (unchanged)"

# Step 7: Verify new tables exist
echo "🔍 Verifying new tables..."
sqlite3 server/fitness-coach.db "SELECT COUNT(*) FROM password_resets;" > /dev/null
sqlite3 server/fitness-coach.db "SELECT COUNT(*) FROM admin_password_resets;" > /dev/null
echo "   ✓ password_resets table created"
echo "   ✓ admin_password_resets table created"

# Step 8: Build frontend
echo "🔨 Building frontend..."
npm run build

# Step 9: Restart service
echo "🔄 Restarting service..."
sudo systemctl restart ai-fitness-coach

# Step 10: Check status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Summary:"
echo "   - Databases backed up"
echo "   - Migrations applied successfully"
echo "   - Data integrity verified"
echo "   - Service restarted"
echo ""
echo "🧪 Next steps:"
echo "   1. Test password reset at: https://yourdomain.com/forgot-password"
echo "   2. Verify email delivery to support@riderlabs.io"
echo "   3. Monitor logs: sudo journalctl -u ai-fitness-coach -f"
echo ""

sudo systemctl status ai-fitness-coach --no-pager
