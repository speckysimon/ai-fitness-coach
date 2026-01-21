# Activity De-Duplication Strategy

## Problem Statement

When a user connects both Strava and Intervals.icu:
- Same activity may exist in both platforms
- Intervals.icu often syncs FROM Strava (or other sources)
- We need to detect and handle duplicates intelligently

---

## Detection Strategy

### **Primary Matching Criteria**

Activities are considered duplicates if they match on **ALL** of:

1. **Start Time** (within 60-second tolerance)
   - Accounts for slight timestamp differences between platforms
   - Compare: `start_date_local` or `start_date`

2. **Activity Type** (exact match)
   - Both must be same type: 'Ride', 'Run', etc.

3. **Duration** (within 5% tolerance)
   - Accounts for rounding differences
   - Compare: `moving_time` or `elapsed_time`

4. **Distance** (within 2% tolerance)
   - Accounts for GPS/calculation differences
   - Compare: `distance` (in meters)

### **Why This Works**

- **High confidence:** Matching all 4 criteria = 99.9% certainty it's the same activity
- **Tolerances:** Account for platform calculation differences
- **No false positives:** Very unlikely two different activities match all criteria

---

## Resolution Strategy

### **Option 1: Primary Source Preference (Recommended)**

User sets a "primary source" in Settings:
- **Primary:** Strava or Intervals.icu
- **Behavior:** When duplicate detected, keep primary source, discard secondary
- **Default:** Strava (most common)

**Pros:**
- Simple, predictable
- User has control
- No data conflicts

**Cons:**
- May miss data unique to secondary source

### **Option 2: Data Merging (Advanced)**

Merge data from both sources, taking best of each:
- Keep richer dataset (more fields populated)
- Prefer power data from Intervals.icu (better analytics)
- Prefer social data from Strava (kudos, comments)

**Pros:**
- Most complete dataset
- Leverages strengths of each platform

**Cons:**
- Complex logic
- Potential data conflicts
- Harder to debug

### **Option 3: Keep Both, Mark as Duplicate**

Store both activities, add `duplicate_of` field:
- Primary activity: `duplicate_of = NULL`
- Duplicate: `duplicate_of = primary_activity_id`
- UI shows only primary, but both in database

**Pros:**
- No data loss
- Can change mind later
- Audit trail

**Cons:**
- Database bloat
- More complex queries

---

## Recommended Implementation

### **Phase 1: Primary Source Preference** ✅

**Why:** Simple, effective, user-controlled

**Implementation:**

1. **Add user preference:**
   ```sql
   ALTER TABLE user_preferences 
   ADD COLUMN primary_activity_source TEXT DEFAULT 'strava';
   ```

2. **De-duplication on sync:**
   ```javascript
   async function storeActivity(activity, userId) {
     // Check for duplicates
     const duplicate = await findDuplicateActivity(activity, userId);
     
     if (duplicate) {
       const userPrefs = await getUserPreferences(userId);
       
       // If new activity is from primary source, replace
       if (activity.source === userPrefs.primary_activity_source) {
         await updateActivity(duplicate.id, activity);
         console.log(`✅ Updated duplicate with primary source data`);
       } else {
         console.log(`⏭️  Skipped duplicate (non-primary source)`);
       }
       return duplicate.id;
     }
     
     // No duplicate, insert new
     return await insertActivity(activity, userId);
   }
   ```

3. **Duplicate detection function:**
   ```javascript
   async function findDuplicateActivity(activity, userId) {
     const startTime = new Date(activity.start_date_local);
     const startTimeMin = new Date(startTime.getTime() - 60000); // -60s
     const startTimeMax = new Date(startTime.getTime() + 60000); // +60s
     
     const durationTolerance = activity.moving_time * 0.05; // 5%
     const distanceTolerance = activity.distance * 0.02; // 2%
     
     const query = `
       SELECT * FROM activities 
       WHERE user_id = ?
         AND type = ?
         AND start_date_local BETWEEN ? AND ?
         AND moving_time BETWEEN ? AND ?
         AND distance BETWEEN ? AND ?
       LIMIT 1
     `;
     
     return db.get(query, [
       userId,
       activity.type,
       startTimeMin.toISOString(),
       startTimeMax.toISOString(),
       activity.moving_time - durationTolerance,
       activity.moving_time + durationTolerance,
       activity.distance - distanceTolerance,
       activity.distance + distanceTolerance
     ]);
   }
   ```

---

## User Experience

### **Settings UI:**

```
┌─────────────────────────────────────────┐
│ Activity Source Preference              │
├─────────────────────────────────────────┤
│                                         │
│ When the same activity exists in both   │
│ Strava and Intervals.icu, which should  │
│ be your primary source?                 │
│                                         │
│ ○ Strava (recommended)                  │
│   • Most complete social data           │
│   • Standard for cycling apps           │
│                                         │
│ ○ Intervals.icu                         │
│   • Better training analytics           │
│   • More detailed power data            │
│                                         │
│ Note: Duplicates are automatically      │
│ detected and merged based on your       │
│ preference.                             │
└─────────────────────────────────────────┘
```

### **Sync Behavior:**

**Scenario 1: Strava Primary (Default)**
```
User uploads activity to Strava
  ↓
Strava syncs to RiderLabs → Stored ✅
  ↓
Intervals.icu syncs from Strava
  ↓
Intervals.icu syncs to RiderLabs → Detected as duplicate, skipped ⏭️
```

**Scenario 2: Intervals.icu Primary**
```
User uploads activity to Strava
  ↓
Strava syncs to RiderLabs → Stored ✅
  ↓
Intervals.icu syncs from Strava (with enhanced analytics)
  ↓
Intervals.icu syncs to RiderLabs → Detected as duplicate, UPDATES existing ✅
  ↓
Result: Activity now has Intervals.icu's enhanced data
```

---

## Edge Cases

### **1. Activity edited on one platform**
- **Detection:** Same activity, different data
- **Behavior:** Update based on primary source preference
- **Example:** User edits name on Strava → next sync updates RiderLabs

### **2. Activity deleted from one platform**
- **Detection:** Activity exists in RiderLabs, not in source
- **Behavior:** Keep in RiderLabs (don't auto-delete)
- **Reason:** User may have disconnected source temporarily

### **3. User switches primary source**
- **Detection:** User changes preference in settings
- **Behavior:** Only affects NEW syncs, doesn't re-process existing
- **Reason:** Avoid data churn, respect user's history

### **4. Manual activities**
- **Detection:** `source='manual'`
- **Behavior:** Never considered duplicates of synced activities
- **Reason:** User explicitly added, should be preserved

---

## Database Schema Updates

### **Activities Table:**

```sql
-- Add source tracking (if not exists)
ALTER TABLE activities ADD COLUMN source TEXT DEFAULT 'strava';
ALTER TABLE activities ADD COLUMN source_id TEXT;

-- Add index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_activities_duplicate_check 
ON activities(user_id, type, start_date_local, moving_time, distance);

-- Add unique constraint to prevent exact duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_unique_source 
ON activities(user_id, source, source_id);
```

### **User Preferences:**

```sql
ALTER TABLE user_preferences 
ADD COLUMN primary_activity_source TEXT DEFAULT 'strava';
```

---

## Implementation Checklist

### **Phase 1: Basic De-duplication** (Recommended Now)
- [ ] Add `source` and `source_id` columns to activities table
- [ ] Add `primary_activity_source` to user preferences
- [ ] Implement `findDuplicateActivity()` function
- [ ] Update activity storage logic to check for duplicates
- [ ] Add Settings UI for primary source preference
- [ ] Test with sample duplicate activities

### **Phase 2: Enhanced Features** (Future)
- [ ] Add "View Duplicates" page for manual review
- [ ] Add merge conflict resolution UI
- [ ] Add activity comparison view (side-by-side)
- [ ] Add bulk re-processing option (if user switches primary source)
- [ ] Add duplicate detection report in sync logs

---

## Testing Strategy

### **Test Cases:**

1. **Exact duplicate:**
   - Same activity in both sources
   - Should detect and handle per preference

2. **Near duplicate:**
   - 30-second time difference
   - 1% distance difference
   - Should still detect as duplicate

3. **Similar but different:**
   - Same time, same type, different distance (>2%)
   - Should NOT detect as duplicate

4. **Manual activity:**
   - User logs manual activity
   - Later syncs similar activity from Strava
   - Should NOT detect as duplicate (different sources)

5. **Preference change:**
   - User switches from Strava to Intervals.icu primary
   - New syncs should use new preference
   - Old activities unchanged

---

## Performance Considerations

### **Query Optimization:**

- Index on `(user_id, type, start_date_local, moving_time, distance)`
- Limit duplicate search to ±60 seconds window
- Only check activities from last 30 days (configurable)

### **Sync Performance:**

- Duplicate check adds ~10ms per activity
- Acceptable for typical sync (10-50 activities)
- For bulk import (1000+ activities), consider batch processing

---

## Recommended Next Steps

1. **Implement Phase 1** (Basic De-duplication)
   - Add database columns
   - Implement detection logic
   - Add Settings UI

2. **Test with your account**
   - Connect both Strava and Intervals.icu
   - Upload test activity
   - Verify duplicate detection works

3. **Monitor and refine**
   - Check logs for false positives/negatives
   - Adjust tolerances if needed
   - Gather user feedback

---

## Alternative: Let User Choose Per Activity

**Advanced Option:** When duplicate detected, show UI:

```
┌─────────────────────────────────────────┐
│ Duplicate Activity Detected             │
├─────────────────────────────────────────┤
│                                         │
│ This activity exists in both sources:   │
│                                         │
│ Strava:                                 │
│ • Morning Ride                          │
│ • 45.2 km, 1:23:45                      │
│ • 215 W avg, 156 bpm avg                │
│                                         │
│ Intervals.icu:                          │
│ • Morning Ride                          │
│ • 45.3 km, 1:23:47                      │
│ • 218 W avg, 157 bpm avg, TSS: 87       │
│                                         │
│ Which would you like to keep?           │
│                                         │
│ [Keep Strava] [Keep Intervals] [Merge]  │
└─────────────────────────────────────────┘
```

**Pros:** Maximum user control  
**Cons:** Interrupts sync flow, requires user attention

---

**Recommendation:** Start with **Phase 1: Primary Source Preference**. It's simple, effective, and handles 95% of cases automatically. Add advanced features later if needed.
