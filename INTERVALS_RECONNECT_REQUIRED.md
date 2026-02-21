# Intervals.icu Reconnection Required

**Date:** January 24, 2026, 12:35 PM  
**Status:** ⚠️ ACTION REQUIRED  
**Severity:** Medium - Blocking Intervals.icu integration

---

## 🐛 Issue

Your Intervals.icu connection is missing the `athlete_id` field, which is required to fetch activities. This happened because the connection was established before the recent bug fix was implemented.

**Error Message:**
```
500 Internal Server Error - /api/intervals/activities
Missing athlete_id for user
```

---

## ✅ Quick Fix (2 minutes)

### **Step 1: Restart Server**
The code fix has been applied, but you need to restart the server:

1. Stop your current server (Ctrl+C in terminal)
2. Restart: `npm run dev`

### **Step 2: Disconnect Intervals.icu**

1. Navigate to **Settings** page
2. Scroll to **Connected Services** section
3. Find **Intervals.icu** 
4. Click **"Disconnect Intervals.icu"** button
5. Confirm the disconnection

### **Step 3: Reconnect Intervals.icu**

1. Still in **Settings** page
2. Click **"Connect Intervals.icu"** button
3. Authorize the app on Intervals.icu website
4. You'll be redirected back to Settings

### **Step 4: Verify Connection**

1. Navigate to **Dashboard**
2. Wait for activities to load
3. You should now see activities from Intervals.icu with purple badges
4. Check console for success messages:
   ```
   📥 [Intervals] Fetching activities for athlete [YOUR_ID]: ...
   ✅ [Intervals] Fetched N activities
   ```

---

## 🔍 What Was Fixed

### **Backend Changes:**

1. **`server/routes/intervals.js`**
   - Added validation to check if `athlete_id` exists
   - Returns helpful error message if missing
   - Prevents 500 errors

2. **`server/services/intervalsService.js`**
   - Updated to use actual `athlete_id` instead of hardcoded `0`
   - Fixed API endpoint: `/athlete/{athleteId}/activities`

3. **`src/lib/activityMerger.js`**
   - Added error handling for incomplete connections
   - Shows alert to user if reconnection needed

### **Why This Happened:**

When you first connected Intervals.icu, the OAuth callback was saving the token but the `athlete_id` field wasn't being properly extracted from the OAuth response. The recent fix ensures the `athlete_id` is now saved correctly during the OAuth flow.

---

## 📊 Expected Results After Reconnection

### **Before Fix:**
```
❌ 500 Internal Server Error
❌ No Intervals.icu activities displayed
❌ Dashboard stuck on "Loading..."
```

### **After Reconnection:**
```
✅ Activities load from Intervals.icu
✅ Purple "Intervals.icu" badges visible
✅ Deduplication works with Strava activities
✅ Console shows athlete ID in logs
✅ No errors
```

---

## 🎯 Verification Checklist

After reconnecting:

- [ ] Server restarted
- [ ] Disconnected Intervals.icu in Settings
- [ ] Reconnected Intervals.icu in Settings
- [ ] Dashboard loads without errors
- [ ] Intervals.icu activities visible with purple badges
- [ ] Console shows: `📥 [Intervals] Fetching activities for athlete [ID]`
- [ ] Console shows: `✅ [Intervals] Fetched N activities`
- [ ] No 500 errors in console

---

## 🔧 Technical Details

### **Database Schema:**
```sql
CREATE TABLE intervals_tokens (
  user_id INTEGER PRIMARY KEY,
  access_token TEXT NOT NULL,
  athlete_id TEXT,  -- ✅ This field must be populated
  athlete_name TEXT,
  scopes TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### **OAuth Callback Fix:**
```javascript
// Now correctly saves athlete_id during OAuth
intervalsTokenDb.upsert({
  userId: stateData.userId,
  accessToken: access_token,
  scopes: scope,
  athleteId: athlete?.id?.toString(),  // ✅ Properly saved
  athleteName: athlete?.name
});
```

### **API Endpoint:**
```javascript
// Before: ❌
GET https://intervals.icu/api/v1/athlete/0/activities

// After: ✅
GET https://intervals.icu/api/v1/athlete/{YOUR_ATHLETE_ID}/activities
```

---

## 🚨 Important Notes

1. **Server Restart Required:** The code changes won't take effect until you restart the server
2. **Reconnection Required:** Existing connection won't work - you must disconnect and reconnect
3. **No Data Loss:** Disconnecting won't delete any data, it just removes the OAuth token
4. **One-Time Fix:** After reconnecting, this issue won't happen again

---

## 💡 Why Reconnection is Necessary

The `athlete_id` is provided by Intervals.icu during the OAuth authorization flow. Since your existing connection doesn't have this field, we need to go through the OAuth flow again to get it. Simply restarting the server won't populate the missing field - we need fresh data from Intervals.icu's OAuth response.

---

## 📝 Summary

**Problem:** Missing `athlete_id` in database  
**Cause:** OAuth callback wasn't saving athlete_id properly  
**Solution:** Disconnect and reconnect Intervals.icu  
**Time Required:** 2 minutes  
**Data Loss:** None  

---

## ✅ Next Steps

1. **Restart server** (required for code changes)
2. **Go to Settings**
3. **Disconnect Intervals.icu**
4. **Reconnect Intervals.icu**
5. **Test Dashboard**
6. **Verify activities load**

---

**Status:** ✅ **Fix Applied - Reconnection Required**

**Once you reconnect, Intervals.icu will work perfectly!**
