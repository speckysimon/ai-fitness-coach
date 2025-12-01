# Demo Mode Frontend Fix

## Issue
Demo users were stuck on "Loading training data..." because the frontend was trying to fetch from Strava instead of using the demo endpoints.

## Changes Made

### 1. App.jsx
- Added `is_demo` field to `userProfile` state (line 117)
- This ensures demo status is available throughout the app

### 2. Dashboard.jsx  
- Added demo user check at the start of `loadDashboardData()` (line 336-365)
- If `userProfile.is_demo` is true:
  - Skips Strava token checks
  - Fetches from `/api/strava/activities?user_id=${userId}` (no access_token)
  - Backend serves mock data for demo users
  - Processes data normally (same analytics pipeline)

### 3. Settings.jsx
- Added `userProfile` to component props (line 14)
- Demo mode indicators already in place from previous changes

## How It Works

**For Demo Users:**
1. Login with demo account
2. Dashboard detects `userProfile.is_demo === true`
3. Fetches activities from `/api/strava/activities?user_id=X` (no token)
4. Backend (`server/routes/strava.js`) checks `is_demo` flag in DB
5. Returns mock data from `mockStravaData.js` service
6. Dashboard processes mock data like real Strava data

**For Regular Users:**
- No changes to existing flow
- Still uses Strava tokens and real API

## Testing
1. Create demo user at `/login?demo=true`
2. Login with demo credentials
3. Dashboard should load with 90 days of mock cycling data
4. Settings page should show "Demo Mode" badge
5. All analytics should work (FTP, TSS, trends, etc.)

## Files Changed
- `src/App.jsx` - Added is_demo to userProfile
- `src/pages/Dashboard.jsx` - Added demo user check
- `src/pages/Settings.jsx` - Added userProfile prop
