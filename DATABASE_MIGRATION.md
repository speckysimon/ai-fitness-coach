# Database Migration - Persistent Storage Implementation

## Overview
Migrated from in-memory storage (Map objects) to SQLite database for persistent user data and OAuth tokens across server restarts.

## Problems Solved

### 1. ✅ Data Loss on Server Restart
**Before:** User accounts and OAuth tokens stored in memory were lost when server restarted.
**After:** All data persists in SQLite database (`server/fitness-coach.db`).

### 2. ✅ Cross-Browser Authentication
**Before:** localStorage stored tokens only in one browser, requiring re-authentication on other devices.
**After:** Tokens stored server-side, accessible from any browser after login.

### 3. ✅ Strava OAuth Loopback Issue
**Before:** OAuth callback passed tokens via URL parameters, creating security and reliability issues.
**After:** Server stores tokens directly in database, frontend fetches them via authenticated API call.

## Changes Made

### Backend Changes

#### 1. New Database Module (`server/db.js`)
- **SQLite database** with better-sqlite3
- **Tables:**
  - `users` - User accounts with profile data
  - `sessions` - Session tokens (30-day expiry)
  - `strava_tokens` - Strava OAuth tokens per user
  - `google_tokens` - Google Calendar OAuth tokens per user
- **Helper functions:**
  - `userDb` - User CRUD operations
  - `sessionDb` - Session management
  - `stravaTokenDb` - Strava token storage
  - `googleTokenDb` - Google token storage

#### 2. Updated Auth Routes (`server/routes/auth.js`)
- Replaced in-memory `Map()` with database calls
- All endpoints now use database:
  - `/api/auth/register` - Create user in DB
  - `/api/auth/login` - Verify credentials, create session
  - `/api/auth/logout` - Delete session from DB
  - `/api/auth/me` - Get user data with tokens
  - `/api/auth/profile` - Update user profile
  - `/api/auth/strava-tokens` - Save Strava tokens
  - `/api/auth/google-tokens` - Save Google tokens

#### 3. Updated Strava Routes (`server/routes/strava.js`)
- **OAuth flow improvements:**
  - `/api/strava/auth` now requires `session_token` parameter
  - Generates secure state token to prevent CSRF
  - Validates session before initiating OAuth
- **Callback improvements:**
  - `/api/strava/callback` verifies state token
  - Saves tokens directly to database
  - Redirects with success flag instead of passing tokens in URL

### Frontend Changes

#### 1. Setup Page (`src/pages/Setup.jsx`)
- Updated `connectStrava()` to pass session token
- Changed callback handler to fetch tokens from backend via `/api/auth/me`
- Looks for `strava_success=true` instead of `strava_data` in URL

#### 2. Settings Page (`src/pages/Settings.jsx`)
- Same OAuth flow improvements as Setup page
- Validates session before initiating OAuth

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- SHA-256 hashed
  name TEXT NOT NULL,
  age INTEGER,
  height REAL,
  weight REAL,
  gender TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sessions table (30-day expiry)
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Strava tokens table
CREATE TABLE strava_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  athlete_id TEXT,
  athlete_data TEXT,  -- JSON
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Google tokens table
CREATE TABLE google_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Security Improvements

### Before
- ❌ Tokens passed in URL (visible in browser history)
- ❌ No CSRF protection on OAuth flow
- ❌ Data lost on server restart

### After
- ✅ Tokens never exposed in URLs
- ✅ State token validates OAuth requests
- ✅ Session validation before OAuth
- ✅ Persistent storage with foreign key constraints
- ✅ Automatic cleanup of expired sessions

## Migration Steps (For Users)

### If You Have Existing Accounts

**Old accounts in localStorage will NOT automatically migrate.** You'll need to:

1. **Export your training data** (if any) from localStorage
2. **Create a new account** via the registration flow
3. **Reconnect Strava** - tokens will be saved to database
4. **Import training data** (if needed)

### First Time Setup

1. Start the server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Create an account (stored in database)
4. Complete profile setup
5. Connect Strava (tokens saved to database)
6. Server restart will preserve your account and tokens

## Testing Checklist

- [x] New user registration creates database entry
- [x] Login retrieves user and tokens from database
- [x] Strava OAuth saves tokens to database
- [x] Server restart preserves all data
- [x] Cross-browser login works (same account, different browser)
- [x] Session expiry (30 days) handled correctly
- [x] Logout removes session from database

## Database Location

- **Development:** `server/fitness-coach.db`
- **Gitignored:** Yes (already in `.gitignore`)
- **Backup:** Recommended to backup `.db` file periodically

## API Changes

### New Required Parameters

#### `/api/strava/auth`
```javascript
// Before
GET /api/strava/auth?state=setup

// After
GET /api/strava/auth?session_token=<token>&state=setup
```

### Changed Callback Flow

#### Before
```
1. User clicks "Connect Strava"
2. OAuth redirect to Strava
3. Strava redirects to /api/strava/callback
4. Server redirects to /setup?strava_data=<encoded_tokens>
5. Frontend extracts tokens from URL
6. Frontend saves to localStorage and backend
```

#### After
```
1. User clicks "Connect Strava"
2. Frontend sends session_token to /api/strava/auth
3. Server validates session, generates state token
4. OAuth redirect to Strava
5. Strava redirects to /api/strava/callback?state=<token>
6. Server validates state, saves tokens to database
7. Server redirects to /setup?strava_success=true
8. Frontend fetches tokens from /api/auth/me
```

## Rollback Plan

If issues arise, you can rollback by:

1. Restore `server/routes/auth.js` from git history (before migration)
2. Restore `server/routes/strava.js` from git history
3. Remove `server/db.js`
4. Uninstall `better-sqlite3`: `npm uninstall better-sqlite3`

## Future Improvements

- [ ] Add database migrations system
- [ ] Implement bcrypt for password hashing (currently SHA-256)
- [ ] Add database backups
- [ ] Implement token refresh logic
- [ ] Add user data export functionality
- [ ] Add database connection pooling for production
- [ ] Implement rate limiting on authentication endpoints

## Notes

- **Password Security:** Currently using SHA-256. For production, migrate to bcrypt.
- **Session Management:** Sessions expire after 30 days. Expired sessions cleaned hourly.
- **Database File:** Automatically created on first server start.
- **Foreign Keys:** Enabled - deleting a user cascades to sessions and tokens.

---

**Migration Date:** October 3, 2025  
**Version:** 2.0.0  
**Status:** ✅ Complete
