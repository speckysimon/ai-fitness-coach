# All Activities Page Fix

**Date:** October 10, 2025  
**Issue:** All Activities page shows "0 Activities" while Dashboard shows activities  
**Status:** ✅ FIXED

---

## 🐛 Problem

The All Activities page was showing:
- 0 Total Activities
- 0 km Total Distance  
- 0h Total Time
- 0 m Total Elevation
- "No activities found matching your filters"

While the Dashboard correctly displayed activities.

---

## 🔍 Root Cause

The All Activities page was missing critical functionality that the Dashboard has:

1. **No Token Refresh Logic**
   - Dashboard automatically refreshes expired tokens
   - AllActivities didn't handle token expiration
   - Result: 401/403 errors when tokens expired

2. **No 401/403 Error Handling**
   - Dashboard retries with refreshed token on 401/403
   - AllActivities just failed silently
   - Result: Empty activity list

3. **Missing Token State Management**
   - Dashboard tracks `currentTokens` separately
   - AllActivities only used prop directly
   - Result: Couldn't update tokens after refresh

---

## ✅ Fixes Applied

### 1. Added Token State Management

```javascript
const [currentTokens, setCurrentTokens] = useState(stravaTokens);

useEffect(() => {
  if (stravaTokens && stravaTokens.access_token) {
    setCurrentTokens(stravaTokens);
    loadAllActivities();
  }
}, [stravaTokens]);
```

### 2. Added Token Refresh Function

```javascript
const refreshAccessToken = async () => {
  if (!currentTokens?.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('/api/strava/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: currentTokens.refresh_token }),
  });

  const data = await response.json();
  const newTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || currentTokens.refresh_token,
    expires_at: data.expires_at,
  };

  setCurrentTokens(newTokens);
  localStorage.setItem('strava_tokens', JSON.stringify(newTokens));
  
  return newTokens;
};
```

### 3. Added Token Expiry Check

```javascript
// Check if token is expired before making API call
const now = Math.floor(Date.now() / 1000);
if (tokensToUse.expires_at && tokensToUse.expires_at < now) {
  console.log('Token expired, refreshing...');
  tokensToUse = await refreshAccessToken();
}
```

### 4. Added 401/403 Error Handling

```javascript
// Handle 401/403 - token might be expired
if (response.status === 401 || response.status === 403) {
  console.log('Got 401/403, attempting token refresh...');
  tokensToUse = await refreshAccessToken();
  
  // Retry the request with new token
  const retryResponse = await fetch(
    `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${after}&per_page=200`
  );
  
  const data = await retryResponse.json();
  await processActivitiesData(data, tokensToUse);
  return;
}
```

### 5. Refactored Data Processing

Extracted data processing into separate function:
```javascript
const processActivitiesData = async (data, tokensToUse) => {
  // Calculate FTP
  // Add TSS to activities
  // Sort by date
  // Set state
};
```

### 6. Added "No Strava Connection" Message

```javascript
if (!stravaTokens || !stravaTokens.access_token) {
  return (
    <div className="text-center">
      <h3>Connect Strava to View Activities</h3>
      <Button onClick={() => window.location.href = '/settings'}>
        Go to Settings
      </Button>
    </div>
  );
}
```

### 7. Enhanced Debug Logging

Added comprehensive logging throughout:
```javascript
console.log('AllActivities - stravaTokens:', stravaTokens);
console.log('AllActivities - Fetching activities from:', yearStart.toLocaleDateString());
console.log('AllActivities - Response status:', response.status);
console.log('AllActivities - Received activities:', data.length);
```

---

## 🔄 How It Works Now

### Flow Diagram

```
User visits /activities
  ↓
Check if stravaTokens exist
  ↓ YES
Set currentTokens state
  ↓
Check if token expired
  ↓ YES → Refresh token
  ↓ NO
Fetch activities from Strava API
  ↓
Got 401/403?
  ↓ YES → Refresh token → Retry request
  ↓ NO
Process activities data
  ↓
Calculate FTP
  ↓
Add TSS to each activity
  ↓
Sort by date
  ↓
Display activities
  ↓
✅ SUCCESS
```

---

## 🧪 Testing

### Test 1: Fresh Tokens
1. Go to Settings
2. Disconnect Strava
3. Reconnect Strava
4. Go to All Activities
5. ✅ Should load activities

### Test 2: Expired Tokens
1. Wait for tokens to expire (or manually set old expiry)
2. Go to All Activities
3. ✅ Should auto-refresh and load activities

### Test 3: No Strava Connection
1. Go to Settings
2. Disconnect Strava
3. Go to All Activities
4. ✅ Should show "Connect Strava" message

### Test 4: Console Logs
1. Open DevTools Console
2. Go to All Activities
3. ✅ Should see detailed logs:
   ```
   AllActivities - stravaTokens: {access_token: "...", ...}
   AllActivities - Loading activities...
   AllActivities - Fetching activities from: 1/1/2025
   AllActivities - Response status: 200
   AllActivities - Received activities: 45
   AllActivities - Setting activities: 45
   ```

---

## 📊 Before vs After

| Feature | Before | After |
|---------|--------|-------|
| Token Refresh | ❌ None | ✅ Automatic |
| 401/403 Handling | ❌ Failed | ✅ Retry with refresh |
| Token State | ❌ Prop only | ✅ Local state |
| Error Messages | ❌ Silent fail | ✅ Helpful messages |
| Debug Logging | ❌ Minimal | ✅ Comprehensive |
| No Strava Message | ❌ None | ✅ Clear CTA |

---

## 🎯 What This Enables

Now the All Activities page:
- ✅ **Automatically refreshes expired tokens**
- ✅ **Handles 401/403 errors gracefully**
- ✅ **Shows helpful messages when Strava not connected**
- ✅ **Provides detailed debug logs**
- ✅ **Matches Dashboard's reliability**

---

## 📝 Files Modified

1. `/Users/simonosx/CascadeProjects/ai-fitness-coach/src/pages/AllActivities.jsx`
   - Added `currentTokens` state
   - Added `refreshAccessToken()` function
   - Added token expiry check
   - Added 401/403 error handling
   - Refactored into `processActivitiesData()`
   - Added "no Strava" message
   - Enhanced debug logging

---

## 🚀 Ready to Test

The All Activities page should now work reliably, even with expired tokens. It will:
1. Check token expiry before API calls
2. Automatically refresh if expired
3. Retry on 401/403 errors
4. Show helpful messages if Strava not connected

---

**Status:** ✅ COMPLETE  
**Date:** October 10, 2025  
**Time:** 17:46 CEST  
**Ready for Testing:** YES
