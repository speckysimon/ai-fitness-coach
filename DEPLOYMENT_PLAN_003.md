# Deployment Plan #003: Demo Mode Implementation

**Objective:** Deploy the "Demo Mode" feature, allowing users to test the application with mock Strava data without needing a real Strava account.

## 1. Changes Summary
- **Database:** Added `is_demo` column to `users` table (Migration #003).
- **Backend:**
    - New `mockStravaData.js` service.
    - Updated `strava.js` to serve mock data.
    - Updated `auth.js` and `db.js` to handle demo users.
    - New `demo.js` route for creating demo users.
- **Frontend:**
    - Updated `Settings.jsx` and `Layout.jsx` with demo indicators.
    - Added `DemoUserCreator` to Login page (via `?demo=true`).

## 2. Deployment Steps

### Step 1: Commit Changes
```bash
git add .
git commit -m "feat: Implement Demo Mode with mock data and UI indicators"
```

### Step 2: Apply Database Migration
(Already applied locally, but ensure it's run if deploying to a fresh DB)
```bash
sqlite3 server/fitness-coach.db < migrations/003_add_demo_mode.sql
```

### Step 3: Restart Server
```bash
pm2 restart riderlabs
```

### Step 4: Verify
1.  Go to `https://riderlabs.ai/login?demo=true`
2.  Click "Generate Demo User".
3.  Login with the generated credentials.
4.  Verify:
    -   "DEMO" badge in sidebar.
    -   "Demo Mode" badge in Settings > Strava.
    -   Dashboard shows populated charts (mock data).
    -   Activities page shows list of mock rides.

## 3. Rollback Plan
If issues arise:
1.  Revert code: `git revert HEAD`
2.  Restart server: `pm2 restart riderlabs`
3.  (Optional) Remove column: `ALTER TABLE users DROP COLUMN is_demo;` (SQLite doesn't support DROP COLUMN easily, so just ignore it).
