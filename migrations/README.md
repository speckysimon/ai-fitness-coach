# Database Migrations

This directory contains SQL migration files that are applied to the database in order.

## How It Works

1. Migration files are named with a timestamp prefix: `YYYYMMDD_HHMMSS_description.sql`
2. Files are applied in alphabetical order (timestamp ensures correct order)
3. Applied migrations are tracked in the `migrations` table
4. Each migration runs in a transaction (all-or-nothing)

## Creating a New Migration

1. Create a new file with timestamp prefix:
   ```bash
   touch migrations/$(date +%Y%m%d_%H%M%S)_add_new_feature.sql
   ```

2. Write your SQL:
   ```sql
   -- migrations/20251119_070000_add_new_feature.sql
   
   -- Add new column to users table
   ALTER TABLE users ADD COLUMN new_field TEXT;
   
   -- Create new table
   CREATE TABLE IF NOT EXISTS new_table (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Create index
   CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
   ```

3. Test locally:
   ```bash
   node scripts/migrate.js
   ```

4. Commit and deploy:
   ```bash
   git add migrations/
   git commit -m "Add migration for new feature"
   git push origin main
   ```

## Running Migrations

### Locally
```bash
node scripts/migrate.js
```

### Production (via deployment script)
```bash
./scripts/prod-deploy.sh
```

Migrations run automatically during deployment.

## Migration Best Practices

### ✅ DO:
- Use `IF NOT EXISTS` for CREATE statements
- Use `IF EXISTS` for DROP statements
- Make migrations idempotent (safe to run multiple times)
- Test migrations on a copy of production data
- Keep migrations small and focused
- Add comments explaining complex changes

### ❌ DON'T:
- Modify existing migration files (create new ones instead)
- Delete migration files (they're part of history)
- Mix schema changes with data changes (separate migrations)
- Use database-specific syntax (stick to SQLite standard)

## Example Migrations

### Adding a Column
```sql
-- Add optional column
ALTER TABLE users ADD COLUMN phone TEXT;

-- Add column with default
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
```

### Creating a Table
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
```

### Modifying Data
```sql
-- Update existing records
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Migrate data to new structure
INSERT INTO new_table (name, value)
SELECT old_name, old_value FROM old_table;
```

## Rollback Strategy

SQLite doesn't support `ALTER TABLE DROP COLUMN`, so rollbacks are tricky.

**Options:**
1. **Backup before migration** (automatic in deployment script)
2. **Create reverse migration** (manual)
3. **Restore from backup** (last resort)

### Creating a Reverse Migration
```sql
-- Original: 20251119_070000_add_status_column.sql
ALTER TABLE users ADD COLUMN status TEXT;

-- Reverse: 20251119_070100_remove_status_column.sql
-- SQLite doesn't support DROP COLUMN, so we recreate the table
CREATE TABLE users_new AS SELECT id, email, password, name FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
```

## Troubleshooting

### Migration Failed
1. Check error message in console
2. Fix the SQL in the migration file
3. Delete the failed migration from `migrations` table:
   ```sql
   DELETE FROM migrations WHERE name = 'failed_migration.sql';
   ```
4. Run migrations again

### Migration Applied But Wrong
1. Create a reverse migration
2. Or restore from backup:
   ```bash
   cp backups/fitness-coach_TIMESTAMP.db server/fitness-coach.db
   ```

### Check Applied Migrations
```bash
sqlite3 server/fitness-coach.db "SELECT * FROM migrations ORDER BY id;"
```

## Migration Naming Convention

Format: `YYYYMMDD_HHMMSS_description.sql`

Examples:
- `20251119_070000_add_user_preferences.sql`
- `20251119_080000_create_notifications_table.sql`
- `20251119_090000_add_indexes_for_performance.sql`

## Current Schema

The base schema is in `server/schema.sql`. Migrations are for **changes** to that schema.

To see current schema:
```bash
sqlite3 server/fitness-coach.db ".schema"
```
