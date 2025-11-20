# Ideas Import to Production

This directory contains scripts to export and import ideas from the local development database to production.

## 📋 What's Included

- **`import-ideas-to-prod.sql`** - SQL script with all 18 ideas
- **`import-ideas.sh`** - Bash wrapper for easy execution

## 🚀 Quick Start

### On Production Server

```bash
# SSH into production
ssh riderlabs@riderlabs.io

# Navigate to app directory
cd /home/riderlabs/ai-fitness-coach

# Pull latest code (includes import scripts)
git pull origin main

# Run import script
./scripts/import-ideas.sh
```

The script will:
1. ✅ Check if database exists
2. ✅ Show current idea count
3. ✅ Ask for confirmation
4. ✅ Import all 18 ideas
5. ✅ Show summary statistics

## 📊 What Gets Imported

**Total Ideas:** 18

**By Priority:**
- Critical: 2 ideas
- High: 4 ideas
- Medium: 5 ideas
- Low: 7 ideas

**By Category:**
- Bug Fixes: 4 ideas
- Features: 8 ideas
- Enhancements: 3 ideas
- Integrations: 3 ideas

## 🔄 Update Strategy

The import uses `ON CONFLICT(id) DO UPDATE` which means:
- **New ideas** (IDs not in production) will be inserted
- **Existing ideas** (IDs already in production) will be updated
- **No data loss** - existing ideas are preserved and updated

## 📝 Ideas Included

### Critical Priority
1. **Forgot Password Feature** - Password reset flow with email
2. **Manual Activity Edit Not Saving** - Fix database save bug

### High Priority
3. **Complete Onboarding Modal Testing** - End-to-end testing
4. **Training Plan Generation Testing** - Production verification
5. **AI Coach - Post-Training Chat** - General purpose chat experience
6. **Activity Analysis Button** - One-time activity analysis

### Medium Priority
7. **Long-term Goal Field** - User settings enhancement
8. **Email Setup for riderlabs.io** - Transactional email service
9. **Rate Limiting for API Endpoints** - Security enhancement
10. **WCAG AA Contrast Compliance** - Accessibility improvements
11. **Email for Password Restore** - Duplicate of #1 (can be merged)

### Low Priority
12. **Help/FAQ Page** - User documentation
13. **Progressive Web App (PWA)** - Offline functionality
14. **Push Notifications** - Workout reminders
15. **Garmin Connect Integration** - Activity sync
16. **Zwift Workout Export** - Training session export
17. **Advanced Analytics Dashboard** - Predictive modeling
18. **Mobile App (React Native)** - Native iOS/Android app

## 🛠️ Manual Import (Alternative)

If you prefer to run the SQL directly:

```bash
# On production server
cd /home/riderlabs/ai-fitness-coach
sqlite3 server/database.sqlite < scripts/import-ideas-to-prod.sql
```

## ✅ Verification

After import, verify the ideas were imported:

```bash
# Count total ideas
sqlite3 server/database.sqlite "SELECT COUNT(*) FROM ideas;"

# Show all ideas
sqlite3 server/database.sqlite "SELECT id, title, priority, status FROM ideas ORDER BY priority, id;"

# Show by priority
sqlite3 server/database.sqlite "SELECT priority, COUNT(*) FROM ideas GROUP BY priority;"
```

## 🔄 Re-exporting Ideas

If you need to re-export ideas from local development:

```bash
# Export to SQL format
sqlite3 server/database.sqlite << 'EOF'
.mode insert ideas
SELECT * FROM ideas;
EOF
```

## 📌 Notes

- Ideas are stored in the **admin database** (`database.sqlite`)
- Not in the main app database (`fitness-coach.db`)
- Import is idempotent - safe to run multiple times
- Existing ideas will be updated, not duplicated

## 🆘 Troubleshooting

**Error: "table ideas does not exist"**
- The ideas table hasn't been created yet
- Run admin database migrations first
- Or create the table manually (see schema in import SQL)

**Error: "database is locked"**
- Stop PM2: `pm2 stop riderlabs`
- Run import
- Restart PM2: `pm2 start riderlabs`

**Ideas not showing in admin panel**
- Clear browser cache
- Check admin panel is pointing to correct database
- Verify ideas table exists: `sqlite3 server/database.sqlite ".tables"`

## 🎯 Next Steps

After importing:
1. Access admin panel: https://riderlabs.io/admin
2. Navigate to Ideas & Improvements
3. Verify all 18 ideas are visible
4. Update priorities/status as needed
5. Start working on critical items!

---

**Last Updated:** November 20, 2025  
**Ideas Count:** 18  
**Database:** `server/database.sqlite` (admin database)
