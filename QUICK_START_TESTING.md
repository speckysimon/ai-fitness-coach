# Quick Start Testing Guide - Multi-Source Integration

**Date:** January 24, 2026  
**Status:** Ready for Testing  
**Estimated Time:** 15-30 minutes

---

## 🚀 Prerequisites

Before testing, ensure:
- [x] Database migration run successfully (`008_add_race_tag_source.cjs`)
- [x] Server restarted after migration
- [ ] You have access to a Strava account
- [ ] You have access to an Intervals.icu account (optional but recommended)

---

## 📋 Quick Test Sequence (15 minutes)

### **Test 1: Verify Database Migration** ✅
```bash
node server/migrations/verify-race-tag-migration.cjs
```

**Expected Output:**
- ✅ activity_source column exists
- ✅ Indexes created correctly
- ✅ Ready for multi-source race tagging

**Status:** ✅ PASSED

---

### **Test 2: Connect Intervals.icu** (5 minutes)

1. **Navigate to Settings**
   - Click Settings in navigation
   - Scroll to "Connected Services"

2. **Connect Intervals.icu**
   - Click "Connect Intervals.icu" button
   - Authorize the app
   - Verify redirect back to app

3. **Verify Connection**
   - Check Settings shows "Connected" status
   - Note athlete name displayed

**Expected Result:**
- ✅ Connection successful
- ✅ Athlete name displayed
- ✅ No errors in console

---

### **Test 3: Dashboard Multi-Source Loading** (3 minutes)

1. **Navigate to Dashboard**
   - Click Dashboard in navigation
   - Wait for activities to load

2. **Check Console Logs**
   ```
   🔀 [Activity Merger] Starting merge: { strava: X, intervals: Y, manual: Z }
   ✅ [Activity Merger] Merge complete: { total: N, afterDedup: M, removed: K }
   ```

3. **Verify Activities Display**
   - Activities from both sources visible
   - Source badges show correct colors:
     - 🟠 Orange = Strava
     - 🟣 Purple = Intervals.icu
     - 🔵 Blue = Manual

**Expected Result:**
- ✅ Activities load from both sources
- ✅ Source badges visible
- ✅ No duplicate activities (if same activity on both platforms)
- ✅ Console shows merge statistics

---

### **Test 4: Source Badges** (2 minutes)

1. **Check Dashboard Recent Activities**
   - Each activity should have a small colored badge
   - Badge shows source name

2. **Check All Activities Page**
   - Navigate to "All Activities"
   - Verify source badges on each activity
   - Badges should be next to activity type

**Expected Result:**
- ✅ Badges visible on Dashboard
- ✅ Badges visible on All Activities
- ✅ Colors match source (Orange/Purple/Blue)

---

### **Test 5: Race Tagging Multi-Source** (5 minutes)

#### **5A: Tag Strava Activity**
1. Go to All Activities
2. Click on a Strava activity (orange badge)
3. Click "Tag as Race"
4. Select race type (e.g., "Criterium")
5. Save

**Expected Result:**
- ✅ Race badge appears
- ✅ Activity shows "RACE" label
- ✅ Database stores with source='strava'

#### **5B: Tag Intervals.icu Activity**
1. Click on an Intervals.icu activity (purple badge)
2. Click "Tag as Race"
3. Select race type
4. Save

**Expected Result:**
- ✅ Race badge appears
- ✅ Database stores with source='intervals'
- ✅ No conflicts with Strava races

#### **5C: Verify in Database** (Optional)
```bash
sqlite3 server/fitness-coach.db "SELECT activity_id, activity_source, race_type FROM race_tags LIMIT 5;"
```

**Expected Output:**
```
12345678|strava|criterium
2024-01-15-12345|intervals|road_race
```

---

### **Test 6: Deduplication** (3 minutes)

**If you have the same activity on both Strava and Intervals.icu:**

1. **Check Dashboard**
   - Activity should appear only once
   - Source badge should show "Strava" (priority source)

2. **Check Console**
   ```
   ✅ [Activity Merger] Merge complete: { total: 20, afterDedup: 18, removed: 2 }
   ```
   - `removed` count shows duplicates found

3. **Verify Deduplication Logic**
   - Same date (within 1 day)
   - Same duration (within 30 seconds)
   - Same distance (within 100 meters)

**Expected Result:**
- ✅ Duplicate activities merged
- ✅ Strava version kept (priority)
- ✅ Console logs show deduplication

---

## 🧪 Connection State Tests

### **State 1: Strava Only** ✅
- Dashboard loads Strava activities
- Source badges show "Strava" (orange)
- All Activities works normally
- Race tagging works with source='strava'

### **State 2: Intervals.icu Only**
1. Disconnect Strava (Settings)
2. Refresh Dashboard
3. Verify Intervals activities load
4. Check source badges show "Intervals.icu" (purple)

### **State 3: Both Connected** ✅
- Activities from both sources
- Deduplication active
- Source badges show correct source
- Race tagging works for both

### **State 4: Neither Connected**
1. Disconnect both services
2. Navigate to All Activities
3. Verify both connect buttons show:
   - "Connect Strava"
   - "Connect Intervals.icu"

---

## 🐛 Common Issues & Solutions

### **Issue: Activities not loading**
**Solution:**
1. Check browser console for errors
2. Verify tokens in Settings
3. Try force refresh (Dashboard refresh button)
4. Check API rate limits

### **Issue: Duplicate activities showing**
**Solution:**
1. Check console logs for deduplication messages
2. Verify activities have similar date/duration/distance
3. Check tolerance settings in `activityMerger.js`:
   - Date: 1 day
   - Duration: 30 seconds
   - Distance: 100 meters

### **Issue: Source badges not showing**
**Solution:**
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear localStorage
3. Check console for React errors
4. Verify `ActivitySourceBadge` component imported

### **Issue: Race tags not saving**
**Solution:**
1. Check browser console for API errors
2. Verify migration ran: `node server/migrations/verify-race-tag-migration.cjs`
3. Check database has `activity_source` column
4. Verify API receives source parameter (Network tab)

---

## ✅ Success Criteria

After completing all tests, you should have:

- [x] ✅ Database migration verified
- [ ] ✅ Intervals.icu connected
- [ ] ✅ Dashboard loads multi-source activities
- [ ] ✅ Source badges visible and correct
- [ ] ✅ Race tagging works for all sources
- [ ] ✅ Deduplication working (if applicable)
- [ ] ✅ No errors in console
- [ ] ✅ All connection states tested

---

## 📊 Test Results Template

Copy and fill out after testing:

```
## Test Results - [Your Name] - [Date]

### Environment
- Browser: [Chrome/Firefox/Safari]
- OS: [macOS/Windows/Linux]
- Strava Connected: [Yes/No]
- Intervals.icu Connected: [Yes/No]

### Test Results
- [ ] Database migration verified
- [ ] Intervals.icu connection successful
- [ ] Dashboard multi-source loading works
- [ ] Source badges display correctly
- [ ] Race tagging Strava activity works
- [ ] Race tagging Intervals activity works
- [ ] Deduplication working
- [ ] All connection states tested

### Issues Found
1. [Issue description]
2. [Issue description]

### Console Errors
[Paste any errors here]

### Screenshots
[Attach screenshots if needed]

### Overall Status
[PASS / FAIL / PARTIAL]

### Notes
[Any additional observations]
```

---

## 🚀 Next Steps After Testing

1. **If all tests pass:**
   - Document results
   - Test with real user accounts
   - Monitor for edge cases

2. **If issues found:**
   - Document in test results
   - Create GitHub issues
   - Prioritize fixes

3. **Production deployment:**
   - Backup database
   - Run migration on production
   - Monitor logs
   - Test with small user group

---

## 📚 Related Documentation

- `PHASE2_IMPLEMENTATION_COMPLETE.md` - Full implementation details
- `MULTI_SOURCE_MIGRATION_PLAN.md` - Original migration plan
- `server/migrations/008_add_race_tag_source.cjs` - Database migration
- `src/lib/activityMerger.js` - Deduplication logic

---

**Last Updated:** January 24, 2026, 11:30 AM  
**Status:** Ready for Testing  
**Estimated Time:** 15-30 minutes
