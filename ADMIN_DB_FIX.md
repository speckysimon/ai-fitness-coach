# Admin Database Fix - Theme Configs Table

## Issue
The dashboard was showing a 500 error when trying to load theme configurations:
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
api/admin/theme-configs/all:1
```

## Root Cause
The `theme_configs` table was missing from the Admin database (`server/database.sqlite`), even though the schema definition existed in `server/schema.sql`.

## Fix Applied
1. **Created the missing table:**
   ```sql
   CREATE TABLE IF NOT EXISTS theme_configs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     theme_name TEXT UNIQUE NOT NULL,
     name TEXT,
     description TEXT,
     colors TEXT NOT NULL,
     config TEXT,
     is_active INTEGER DEFAULT 0,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
     updated_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Verified existing themes:**
   - Found 6 existing themes in the database
   - No need to reseed

## Verification
```bash
sqlite3 server/database.sqlite "SELECT COUNT(*) FROM theme_configs;"
# Output: 6
```

## Status
✅ **FIXED** - The dashboard should now load without errors.

## Next Steps
- Refresh your browser to clear the error
- The theme selector should now work properly
