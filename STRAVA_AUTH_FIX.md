# Strava Authentication Loop Fix

**Date:** October 3, 2025  
**Issue:** Strava authentication was looping from Settings page → Strava authorize → Settings page unauthenticated

---

## Root Cause Analysis

### Primary Issue: Missing State Parameter
The Settings page was attempting to add `&state=settings` directly to the Strava OAuth URL, but the backend `/api/strava/auth` endpoint wasn't accepting or forwarding this state parameter to Strava's OAuth flow. This caused:

1. Settings page redirects to Strava with state parameter
2. Strava redirects back to backend callback
3. Backend couldn't determine where user came from (settings vs setup)
4. Always redirected to `/setup` instead of `/settings`
5. User sees "unauthenticated" because they're on wrong page

### Secondary Issue: Potential Double-Processing
The `useEffect` hooks in both Settings.jsx and Setup.jsx had `searchParams` object in dependency arrays, which could cause the OAuth callback to be processed multiple times due to React's re-rendering behavior.

---

## Changes Made

### 1. Backend: `/server/routes/strava.js`

**File:** `server/routes/strava.js`  
**Lines:** 8-11

**Before:**
```javascript
router.get('/auth', (req, res) => {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&approval_prompt=force&scope=activity:read_all`;
  res.json({ authUrl });
});
```

**After:**
```javascript
router.get('/auth', (req, res) => {
  const state = req.query.state || 'setup';
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&approval_prompt=force&scope=activity:read_all&state=${state}`;
  res.json({ authUrl });
});
```

**What Changed:**
- Accept `state` query parameter from frontend
- Default to 'setup' if not provided (maintains backward compatibility)
- Include state in Strava OAuth URL
- Strava will return this state parameter in the callback

---

### 2. Frontend: `/src/pages/Settings.jsx`

#### Change 1: Import useRef
**Line:** 1

**Before:**
```javascript
import React, { useState, useEffect } from 'react';
```

**After:**
```javascript
import React, { useState, useEffect, useRef } from 'react';
```

#### Change 2: Add Processing Tracker
**Lines:** 11

**Added:**
```javascript
const processedRef = useRef(new Set());
```

**Purpose:** Track which OAuth callbacks have been processed to prevent double-processing

#### Change 3: Prevent Double-Processing
**Lines:** 18-19, 35-36

**Before:**
```javascript
if (stravaData) {
  (async () => {
```

**After:**
```javascript
if (stravaData && !processedRef.current.has(stravaData)) {
  processedRef.current.add(stravaData);
  (async () => {
```

**Purpose:** Only process each unique OAuth callback once

#### Change 4: Fix State Parameter Passing
**Lines:** 57-67

**Before:**
```javascript
const connectStrava = async () => {
  setConnecting(true);
  try {
    const response = await fetch('/api/strava/auth');
    const data = await response.json();
    // Add state parameter to track where user came from
    window.location.href = data.authUrl + '&state=settings';
  } catch (err) {
    alert('Failed to initiate Strava authentication');
    setConnecting(false);
  }
};
```

**After:**
```javascript
const connectStrava = async () => {
  setConnecting(true);
  try {
    const response = await fetch('/api/strava/auth?state=settings');
    const data = await response.json();
    window.location.href = data.authUrl;
  } catch (err) {
    alert('Failed to initiate Strava authentication');
    setConnecting(false);
  }
};
```

**What Changed:**
- Pass `state=settings` as query parameter to backend
- Backend includes it in OAuth URL
- Remove manual URL concatenation (cleaner and more reliable)

---

### 3. Frontend: `/src/pages/Setup.jsx`

#### Change 1: Import useRef
**Line:** 1

**Before:**
```javascript
import React, { useState, useEffect } from 'react';
```

**After:**
```javascript
import React, { useState, useEffect, useRef } from 'react';
```

#### Change 2: Add Processing Tracker
**Line:** 13

**Added:**
```javascript
const processedRef = useRef(new Set());
```

#### Change 3: Prevent Double-Processing
**Lines:** 27-28, 50-51

**Before:**
```javascript
if (stravaData) {
  setProcessingOAuth(true);
```

**After:**
```javascript
if (stravaData && !processedRef.current.has(stravaData)) {
  processedRef.current.add(stravaData);
  setProcessingOAuth(true);
```

#### Change 4: Fix useEffect Dependencies
**Line:** 68

**Before:**
```javascript
}, [searchParams.get('strava_data'), searchParams.get('google_data'), searchParams.get('error')]);
```

**After:**
```javascript
}, [searchParams, setSearchParams, onStravaAuth, onGoogleAuth]);
```

**Purpose:** Proper dependency array that doesn't call functions during render

---

## How It Works Now

### Settings Page Flow
```
1. User clicks "Connect" on Settings page
   ↓
2. Frontend: fetch('/api/strava/auth?state=settings')
   ↓
3. Backend: Generates OAuth URL with &state=settings
   ↓
4. User redirects to Strava OAuth page
   ↓
5. User authorizes app
   ↓
6. Strava redirects to: /api/strava/callback?code=XXX&state=settings
   ↓
7. Backend: Exchanges code for tokens
   ↓
8. Backend: Checks state === 'settings'
   ↓
9. Backend: Redirects to /settings?strava_data={tokens}
   ↓
10. Frontend: Settings.jsx detects strava_data param
    ↓
11. Frontend: Calls onStravaAuth(tokens)
    ↓
12. Frontend: App.jsx updates stravaTokens state
    ↓
13. Frontend: Settings re-renders with stravaTokens prop
    ↓
14. Frontend: Shows "Connected" ✅
```

### Setup Page Flow
```
1. User clicks "Connect Strava" on Setup page
   ↓
2. Frontend: fetch('/api/strava/auth') [no state param]
   ↓
3. Backend: Defaults to state='setup'
   ↓
4. [Same OAuth flow as above]
   ↓
5. Backend: Redirects to /setup?strava_data={tokens}
   ↓
6. Frontend: Setup.jsx processes and shows "Connected" ✅
```

---

## Testing Checklist

### Settings Page
- [ ] Click "Connect" on Settings page
- [ ] Authorize on Strava
- [ ] Should redirect back to Settings page
- [ ] Should show "Connected" status immediately
- [ ] Should NOT loop back to unauthenticated state

### Setup Page
- [ ] New user flow: Login → Profile Setup → Setup
- [ ] Click "Connect Strava" on Setup page
- [ ] Authorize on Strava
- [ ] Should redirect back to Setup page
- [ ] Should show "Connected" status
- [ ] Should be able to continue to Dashboard

### Edge Cases
- [ ] Refresh page after connecting - should maintain connection
- [ ] Connect from Settings, then visit Setup - should show connected
- [ ] Logout and login - should maintain Strava connection
- [ ] Multiple rapid clicks on Connect button - should not cause issues

---

## Technical Details

### Why useRef for Processing Tracker?
- `useRef` persists across re-renders without causing re-renders
- Using a Set allows us to track multiple unique callback data strings
- Prevents the same OAuth callback from being processed twice if React re-renders

### Why Pass State to Backend?
- OAuth state parameter must be included in the initial authorization URL
- Strava returns the exact state value in the callback
- Backend uses this to determine correct redirect destination
- More reliable than trying to append state after URL generation

### Why Async/Await in useEffect?
- `onStravaAuth` and `onGoogleAuth` are async functions
- Need to wait for localStorage and backend saves to complete
- Ensures state is properly updated before navigation

---

## Related Files

- `/server/routes/strava.js` - Backend OAuth routes
- `/src/pages/Settings.jsx` - Settings page with Strava connection
- `/src/pages/Setup.jsx` - Initial setup page with Strava connection
- `/src/App.jsx` - Main app with authentication state management
- `/server/routes/auth.js` - User authentication and token storage

---

## Notes

- This fix maintains backward compatibility with Setup page flow
- No changes needed to App.jsx or auth.js
- State parameter is standard OAuth 2.0 practice for security and routing
- The processedRef approach is React best practice for preventing duplicate effects

---

**Status:** ✅ Fixed  
**Tested:** Pending user verification
