# Fixes - October 3, 2025 (Part 2)

## Issues Fixed

### 1. ✅ Strava Authentication Not Persisting on Logout/Browser Switch
**Problem:** Tokens were stored in database but not loaded from database on login  
**Root Cause:** App.jsx was loading tokens from localStorage instead of fetching from backend  
**Solution:** Modified App.jsx to fetch user data (including tokens) from `/api/auth/me` on mount

### 2. ✅ Notification Banner Not Showing on Login
**Problem:** Dashboard notification didn't appear when logging in without Strava  
**Root Cause:** Tokens were not being set in state, so notification logic thought Strava was connected  
**Solution:** Fixed token loading from backend, now notification shows correctly when no tokens

### 3. ✅ Missing Disconnect Button
**Problem:** No way to disconnect Strava or Google Calendar once connected  
**Solution:** Added disconnect buttons and API endpoints

---

## Changes Made

### Backend Changes

#### `server/routes/auth.js`
Added two new DELETE endpoints:

```javascript
// Disconnect Strava
DELETE /api/auth/strava-tokens
- Validates session token
- Deletes Strava tokens from database
- Returns success response

// Disconnect Google Calendar
DELETE /api/auth/google-tokens
- Validates session token
- Deletes Google tokens from database
- Returns success response
```

### Frontend Changes

#### `src/App.jsx`
**Major refactor of token loading:**

1. **Changed useEffect on mount:**
   ```javascript
   // Before: Load from localStorage
   const storedStravaTokens = localStorage.getItem('strava_tokens');
   
   // After: Fetch from backend
   const sessionToken = localStorage.getItem('session_token');
   if (sessionToken) {
     fetchUserData(sessionToken);
   }
   ```

2. **Added `fetchUserData` function:**
   - Calls `/api/auth/me` with session token
   - Loads user profile from backend
   - Loads Strava tokens from backend
   - Loads Google tokens from backend
   - Updates state and localStorage
   - Clears everything if session invalid

3. **Updated `handleLogin`:**
   - Now accepts tokens parameter
   - Sets tokens in state when provided

4. **Updated `handleStravaAuth` and `handleGoogleAuth`:**
   - Handle null tokens (for disconnect)
   - Remove from localStorage when null

#### `src/pages/Login.jsx`
**Updated to pass tokens:**
```javascript
// Before
onLogin(userProfile);

// After
const tokens = {
  stravaTokens: data.user.stravaTokens,
  googleTokens: data.user.googleTokens
};
onLogin(userProfile, tokens);
```

#### `src/pages/Settings.jsx`
**Added disconnect functionality:**

1. **New functions:**
   - `disconnectStrava()` - Calls DELETE endpoint, clears state, reloads page
   - `disconnectGoogle()` - Calls DELETE endpoint, clears state, reloads page

2. **Updated UI:**
   - When connected: Shows "Connected" badge + "Disconnect" button
   - Disconnect button styled in red
   - Confirmation dialog before disconnect
   - Success/error alerts

---

## How It Works Now

### Token Loading Flow
```
1. App mounts
2. Check for session_token in localStorage
3. If found, call /api/auth/me
4. Backend validates session
5. Backend returns user + tokens from database
6. Frontend sets state and localStorage
7. Dashboard shows/hides notification based on tokens
```

### Login Flow
```
1. User enters credentials
2. POST /api/auth/login
3. Backend validates, returns user + tokens
4. Frontend receives tokens from backend
5. Frontend sets state and localStorage
6. Navigate to Dashboard
7. Notification shows if no Strava tokens
```

### Disconnect Flow
```
1. User clicks "Disconnect" in Settings
2. Confirmation dialog
3. DELETE /api/auth/strava-tokens (or google-tokens)
4. Backend deletes from database
5. Frontend clears state and localStorage
6. Page reloads
7. Shows "Connect" button again
```

### Cross-Browser Flow
```
Browser 1:
1. Login → Tokens loaded from database
2. Connect Strava → Saved to database

Browser 2:
1. Login with same account
2. Tokens loaded from database
3. Strava already connected
4. No notification shown
```

---

## Testing Checklist

### Test 1: Token Persistence
- [x] Login with Strava connected
- [x] Logout
- [x] Login again
- [x] Strava still connected ✅

### Test 2: Cross-Browser
- [x] Login in Chrome, connect Strava
- [x] Login in Safari with same account
- [x] Strava already connected ✅

### Test 3: Notification Banner
- [x] Login without Strava
- [x] Notification appears ✅
- [x] Connect Strava
- [x] Notification disappears ✅

### Test 4: Disconnect
- [x] Connect Strava
- [x] Click "Disconnect" in Settings
- [x] Confirm dialog
- [x] Strava disconnected ✅
- [x] Shows "Connect" button ✅
- [x] Database entry deleted ✅

### Test 5: Server Restart
- [x] Login, connect Strava
- [x] Restart server
- [x] Refresh browser
- [x] Still logged in ✅
- [x] Strava still connected ✅

---

## Database Verification

### Check if tokens are stored:
```bash
sqlite3 server/fitness-coach.db
SELECT user_id, athlete_id FROM strava_tokens;
```

### Check if tokens deleted on disconnect:
```bash
# Before disconnect
SELECT COUNT(*) FROM strava_tokens WHERE user_id = 1;
# Returns: 1

# After disconnect
SELECT COUNT(*) FROM strava_tokens WHERE user_id = 1;
# Returns: 0
```

---

## API Changes Summary

### New Endpoints
- `DELETE /api/auth/strava-tokens` - Disconnect Strava
- `DELETE /api/auth/google-tokens` - Disconnect Google Calendar

### Modified Behavior
- `GET /api/auth/me` - Now called on app mount to load tokens
- Login flow now properly returns and sets tokens

---

## Files Modified

1. **server/routes/auth.js**
   - Added DELETE endpoints for disconnect

2. **src/App.jsx**
   - Refactored token loading to use backend
   - Added fetchUserData function
   - Updated handleLogin to accept tokens
   - Updated auth handlers to handle null

3. **src/pages/Login.jsx**
   - Pass tokens to handleLogin

4. **src/pages/Settings.jsx**
   - Added disconnect functions
   - Added disconnect buttons
   - Added confirmation dialogs

---

## Benefits

### ✅ True Persistence
- Tokens survive logout/login
- Tokens survive browser switches
- Tokens survive server restarts

### ✅ Better UX
- Notification shows correctly
- Clear disconnect option
- Confirmation before disconnect
- Success/error feedback

### ✅ Data Integrity
- Single source of truth (database)
- localStorage synced with backend
- No stale data issues

---

## Known Limitations

### Page Reload on Disconnect
- Settings page reloads after disconnect
- Could be improved with state management
- Works correctly but not ideal UX

### Confirmation Dialogs
- Using native `confirm()` dialogs
- Could be replaced with custom modals
- Functional but not as polished

---

## Next Steps (Optional)

- [ ] Replace page reload with state update
- [ ] Replace confirm() with custom modal
- [ ] Add loading states during disconnect
- [ ] Add toast notifications instead of alerts
- [ ] Add disconnect from Dashboard

---

**Status:** ✅ Complete  
**Date:** October 3, 2025  
**Time:** 08:52 CEST  
**All Issues Resolved:** Yes
