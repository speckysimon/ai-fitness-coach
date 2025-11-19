# Admin Database Migrations

This directory contains SQL migrations for the **admin database** (`server/database.sqlite`).

## Important: Two Separate Databases

The application uses **TWO databases**:

1. **Main App Database** (`server/fitness-coach.db`)
   - User data, training plans, activities, etc.
   - Migrations in: `migrations/` (root level)
   - Runner: `scripts/migrate.js`

2. **Admin Database** (`server/database.sqlite`)
   - Admin users, API keys, AI configs, theme configs
   - Migrations in: `migrations/admin/` (this directory)
   - Runner: `scripts/migrate-admin.js`

## Running Admin Migrations

```bash
# Run admin database migrations
node scripts/migrate-admin.js
```

This is automatically run during deployment by `scripts/prod-deploy.sh`.

## Creating New Admin Migrations

1. **Name your file with a number prefix:**
   ```
   001_initial_schema.sql
   002_add_theme_configs.sql
   003_add_api_key_encryption.sql
   ```

2. **Write idempotent SQL when possible:**
   ```sql
   -- Good: Won't fail if column exists
   ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS new_column TEXT;
   
   -- Bad: Will fail if column exists
   ALTER TABLE api_keys ADD COLUMN new_column TEXT;
   ```

3. **Test locally first:**
   ```bash
   # Backup your local admin DB
   cp server/database.sqlite server/database.sqlite.backup
   
   # Run migration
   node scripts/migrate-admin.js
   
   # If it fails, restore backup
   cp server/database.sqlite.backup server/database.sqlite
   ```

## Admin Database Schema

Current tables in `database.sqlite`:

- `admin_users` - Admin accounts
- `admin_sessions` - Admin login sessions
- `api_keys` - API keys for AI services (OpenAI, Anthropic, etc.)
- `ai_configs` - AI model configurations
- `theme_configs` - Custom theme configurations
- `admin_migrations` - Migration tracking

## Best Practices

1. **Never modify main app migrations** - They're in `migrations/` (root)
2. **Always backup before migration** - Use `scripts/backup-db.sh`
3. **Test migrations locally first** - Don't test in production
4. **One migration per feature** - Keep migrations focused
5. **Use transactions** - The runner wraps each migration in a transaction
6. **Document breaking changes** - Add comments in the SQL file

## Rollback

If a migration fails:

1. **Restore from backup:**
   ```bash
   # List backups
   ls -lh backups/
   
   # Restore admin database
   cp backups/database_TIMESTAMP.sqlite server/database.sqlite
   ```

2. **Remove failed migration from tracking:**
   ```bash
   sqlite3 server/database.sqlite "DELETE FROM admin_migrations WHERE name = 'XXX_failed_migration.sql';"
   ```

3. **Fix the migration file and re-run**

## Common Issues

### Issue: "table already exists"
**Solution:** Use `CREATE TABLE IF NOT EXISTS` or `DROP TABLE IF EXISTS`

### Issue: "no such column"
**Solution:** Check if you're modifying the right database (admin vs main)

### Issue: "UNIQUE constraint failed"
**Solution:** Migration was partially applied. Restore from backup.

## Migration History

- `001_fix_api_keys_schema.sql` - Fixed api_keys table to use encrypted_key (2025-11-19)
