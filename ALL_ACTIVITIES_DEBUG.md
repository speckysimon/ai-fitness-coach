# All Activities Page Debug

**Date:** October 10, 2025  
**Issue:** All Activities page shows "0 Activities" while Dashboard shows activities  
**Status:** 🔍 DEBUGGING

---

## 🐛 Problem

The "All Activities" page displays:
- 0 Total Activities
- 0 km Total Distance
- 0h Total Time
- 0 m Total Elevation
- "No activities found matching your filters"

But the Dashboard shows activities correctly.

---

## 🔍 Investigation

### Possible Causes

1. **Strava Tokens Not Passed**
   - Component receives `stravaTokens` prop from App.jsx
   - ✅ Verified: Tokens are being passed correctly (line 283 in App.jsx)

2. **API Call Failing**
   - Fetches from `/api/strava/activities` with `after` parameter
   - Uses year start (Jan 1, 2025) as cutoff
   - Possible issue: API returning empty array

3. **Different API Endpoints**
   - Dashboard might use different endpoint or parameters
   - Need to compare Dashboard vs AllActivities fetch logic

4. **Token Refresh Issue**
   - Tokens might be expired
   - No automatic refresh in AllActivities component

---

## ✅ Fixes Applied

### 1. Added Debug Logging

Added comprehensive console logging to track:
- When component receives tokens
- API request details (URL, timestamp)
- Response status and data
- Number of activities received

```javascript
console.log('AllActivities - stravaTokens:', stravaTokens);
console.log('AllActivities - Fetching activities from:', yearStart.toLocaleDateString());
console.log('AllActivities - Response status:', response.status);
console.log('AllActivities - Received activities:', data.length);
```

### 2. Added "No Strava Connection" Message

If tokens are missing, shows helpful message:
```javascript
if (!stravaTokens || !stravaTokens.access_token) {
  return (
    <div>
      <h3>Connect Strava to View Activities</h3>
      <Button onClick={() => window.location.href = '/settings'}>
        Go to Settings
      </Button>
    </div>
  );
}
```

### 3. Better Error Handling

Added error text logging when API fails:
```javascript
if (!response.ok) {
  const errorText = await response.text();
  console.error('AllActivities - API error:', errorText);
  throw new Error(`HTTP error! status: ${response.status}`);
}
```

---

## 🧪 How to Debug

### Step 1: Open Browser Console

1. Go to http://localhost:3000/activities
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab

### Step 2: Check Logs

Look for these log messages:

**If tokens are missing:**
```
AllActivities - stravaTokens: null
AllActivities - No valid Strava tokens
```
→ **Solution:** Go to Settings and connect Strava

**If tokens are present:**
```
AllActivities - stravaTokens: {access_token: "...", ...}
AllActivities - Loading activities...
AllActivities - Fetching activities from: 1/1/2025
AllActivities - After timestamp: 1735689600
AllActivities - Access token present: true
```

**Check API response:**
```
AllActivities - Response status: 200
AllActivities - Response ok: true
AllActivities - Received activities: 0
```

### Step 3: Compare with Dashboard

1. Go to Dashboard (http://localhost:3000/dashboard)
2. Open Console
3. Look for Dashboard activity logs
4. Compare the API calls

---

## 🔧 Potential Solutions

### Solution 1: Token Expired

If you see 401 error:
```
AllActivities - Response status: 401
AllActivities - API error: Unauthorized
```

**Fix:** Add token refresh logic like Dashboard has:
```javascript
const refreshAccessToken = async () => {
  if (!stravaTokens?.refresh_token) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch('/api/strava/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: stravaTokens.refresh_token }),
  });
  
  const data = await response.json();
  return data.access_token;
};
```

### Solution 2: Different Time Range

Dashboard might fetch different time range. Check:
- Dashboard: Last 30 days
- AllActivities: From Jan 1, 2025

**Fix:** Try fetching all activities without `after` parameter:
```javascript
const response = await fetch(
  `/api/strava/activities?access_token=${stravaTokens.access_token}&per_page=200`
);
```

### Solution 3: API Rate Limit

Strava API has rate limits. Check response headers:
```javascript
console.log('Rate limit:', response.headers.get('X-RateLimit-Limit'));
console.log('Rate remaining:', response.headers.get('X-RateLimit-Usage'));
```

---

## 📊 Next Steps

1. **Check Console Logs**
   - Open All Activities page
   - Check what console logs show
   - Share the logs for further debugging

2. **Compare with Dashboard**
   - See how Dashboard fetches activities
   - Check if it uses different parameters
   - Verify both use same token

3. **Test API Directly**
   - Open Network tab in DevTools
   - Go to All Activities page
   - Check the actual API request/response

---

## 🎯 Expected Behavior

When working correctly, you should see:
```
AllActivities - stravaTokens: {access_token: "...", refresh_token: "...", expires_at: ...}
AllActivities - Loading activities...
AllActivities - Fetching activities from: 1/1/2025
AllActivities - Response status: 200
AllActivities - Received activities: 45  (or however many you have)
AllActivities - First activity: {id: "...", name: "Morning Ride", ...}
AllActivities - Setting activities: 45
AllActivities - Filtering activities. Total: 45
AllActivities - Filtered activities: 45
```

---

## 📝 Files Modified

1. `/Users/simonosx/CascadeProjects/ai-fitness-coach/src/pages/AllActivities.jsx`
   - Added debug logging
   - Added "no tokens" message
   - Better error handling

---

**Status:** Ready for debugging  
**Next:** Check browser console logs when visiting /activities page
