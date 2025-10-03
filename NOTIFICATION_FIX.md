# Notification Banner Fix - October 3, 2025

## Issue
Dashboard notification banner not showing for users without Strava connected.

## Root Cause
In `App.jsx`, the `fetchUserData` function only set tokens if they existed from the backend, but didn't explicitly set them to `null` if they didn't exist. This meant:

1. User connects Strava → `stravaTokens` set to object
2. User disconnects Strava → Backend deletes tokens
3. User refreshes page → `fetchUserData` runs
4. Backend returns `stravaTokens: null`
5. App.jsx checks `if (data.user.stravaTokens)` → false
6. **BUG:** Doesn't execute anything, so `stravaTokens` state still has old value
7. Dashboard checks `if (stravaTokens)` → true (old value still there)
8. Notification doesn't show

## Fix

### 1. App.jsx - Explicitly Set Null
```javascript
// Before
if (data.user.stravaTokens) {
  setStravaTokens(data.user.stravaTokens);
  localStorage.setItem('strava_tokens', JSON.stringify(data.user.stravaTokens));
}

// After
if (data.user.stravaTokens) {
  setStravaTokens(data.user.stravaTokens);
  localStorage.setItem('strava_tokens', JSON.stringify(data.user.stravaTokens));
} else {
  setStravaTokens(null);  // ← Explicitly set to null
  localStorage.removeItem('strava_tokens');
}
```

### 2. Dashboard.jsx - Better Token Check
```javascript
// Before
if (stravaTokens) {
  // Has tokens
}

// After
if (stravaTokens && stravaTokens.access_token) {
  // Has valid tokens
}
```

### 3. Dashboard.jsx - Better Render Condition
```javascript
// Before
{showStravaNotification && !stravaTokens && (

// After
{showStravaNotification && (!stravaTokens || !stravaTokens.access_token) && (
```

## Testing

### Test 1: Fresh User (No Strava)
1. Create new account
2. Login
3. Navigate to Dashboard
4. **Expected:** Orange notification banner visible ✅

### Test 2: After Disconnect
1. Connect Strava
2. Go to Settings
3. Click "Disconnect"
4. Navigate to Dashboard
5. **Expected:** Orange notification banner visible ✅

### Test 3: After Reconnect
1. Click "Connect Strava" in notification
2. Complete OAuth
3. Return to Dashboard
4. **Expected:** Notification hidden, activities load ✅

### Test 4: Dismiss and Refresh
1. Click "Dismiss" on notification
2. Refresh page
3. **Expected:** Notification stays hidden (sessionStorage) ✅

### Test 5: New Session
1. Dismiss notification
2. Close browser
3. Reopen and login
4. **Expected:** Notification appears again ✅

## Debug Console Logs

Added console logs to help debug:

### App.jsx
```javascript
console.log('App - Setting Strava tokens:', data.user.stravaTokens);
// or
console.log('App - No Strava tokens, setting to null');
```

### Dashboard.jsx
```javascript
console.log('Dashboard - stravaTokens:', stravaTokens);
console.log('Dashboard - notification dismissed:', dismissed);
console.log('Dashboard - showing notification');
```

## Files Modified

1. **src/App.jsx**
   - Added else clause to explicitly set tokens to null
   - Added console logs for debugging

2. **src/pages/Dashboard.jsx**
   - Improved token check: `stravaTokens && stravaTokens.access_token`
   - Improved render condition
   - Added console logs for debugging

## How to Verify

### Check Browser Console
```
App - No Strava tokens, setting to null
Dashboard - stravaTokens: null
Dashboard - notification dismissed: null
Dashboard - showing notification
```

### Check State
Open React DevTools:
- Find Dashboard component
- Check `showStravaNotification` → should be `true`
- Check `stravaTokens` → should be `null`

### Check DOM
- Notification banner should be visible
- Orange gradient background
- "Connect Strava" button present

## Clean Up (Optional)

Once verified working, can remove console.log statements:
- Remove from `App.jsx` line 69, 73
- Remove from `Dashboard.jsx` lines 107, 116, 118

---

**Status:** ✅ Fixed  
**Date:** October 3, 2025  
**Time:** 08:59 CEST
