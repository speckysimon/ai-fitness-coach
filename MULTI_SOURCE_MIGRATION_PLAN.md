# Multi-Source Activity Integration - Migration Plan

## Overview
This document outlines how the new multi-source activity system (Strava + Intervals.icu + Manual) affects existing features and what changes are needed for full compatibility.

**Status:** Implementation Complete - Testing & Feature Compatibility Phase

---

## ✅ COMPLETED: Core Infrastructure

### 1. Backend Activity Fetching
- ✅ **Intervals.icu Endpoint**: `/api/intervals/activities` with flexible date parameters
- ✅ **Activity Normalization**: `intervalsService.normalizeActivity()` maps Intervals.icu format to Strava-compatible schema
- ✅ **Token Management**: OAuth tokens stored in database, loaded on startup

### 2. Frontend Activity Merger
- ✅ **Deduplication Logic**: `mergeMultiSourceActivities()` in `src/lib/activityMerger.js`
- ✅ **Deduplication Algorithm**: Matches activities by date + duration + distance (30s/100m tolerance)
- ✅ **Source Priority**: Strava > Intervals.icu > Manual (for duplicates)
- ✅ **Source Tagging**: Each activity tagged with `source` and `source_id` fields

### 3. Page Updates
- ✅ **Dashboard**: Fetches from both sources, graceful fallback when one fails
- ✅ **All Activities**: Conditional connect buttons (Strava OR Intervals.icu)
- ✅ **Plan Generator**: Multi-source support with FTP/FTHR calculation from all activities

---

## 🔄 FEATURE COMPATIBILITY ANALYSIS

### A. Race Tagging System

**Current Implementation:**
- Race tags stored in database: `race_tags` table
- Links activities by `activity_id` (Strava ID)
- Used for race analysis, filtering, and AI recommendations

**Impact:**
- ⚠️ **ISSUE**: Race tags currently only support Strava activity IDs
- Activities from Intervals.icu will have different IDs
- Need to support tagging activities from any source

**Required Changes:**

1. **Database Schema Update** (Priority: HIGH)
   ```sql
   -- Add source column to race_tags table
   ALTER TABLE race_tags ADD COLUMN activity_source TEXT DEFAULT 'strava';
   
   -- Update unique constraint to include source
   -- Current: UNIQUE(user_id, activity_id)
   -- New: UNIQUE(user_id, activity_id, activity_source)
   ```

2. **Backend API Updates** (`server/routes/raceTags.js`)
   - Update `POST /api/race-tags` to accept `activity_source` parameter
   - Update `GET /api/race-tags` to return source with each tag
   - Update queries to filter by both `activity_id` AND `activity_source`

3. **Frontend Updates**
   - `src/pages/AllActivities.jsx`: Pass `activity.source` when tagging races
   - `src/pages/Dashboard.jsx`: Include source when loading race tags
   - Race tag matching logic: Match by `activity_id` AND `source`

**Migration Script:**
```javascript
// server/migrations/008_add_race_tag_source.cjs
const db = require('../adminDb.cjs');

// Add source column (defaults to 'strava' for existing tags)
db.run(`ALTER TABLE race_tags ADD COLUMN activity_source TEXT DEFAULT 'strava'`);

// Update unique constraint
db.run(`DROP INDEX IF EXISTS idx_race_tags_unique`);
db.run(`CREATE UNIQUE INDEX idx_race_tags_unique ON race_tags(user_id, activity_id, activity_source)`);
```

---

### B. AI Analysis & Recommendations

**Current Implementation:**
- AI analyzes activities for training load, patterns, recommendations
- Post-race analysis uses activity data
- Training plan adjustments based on completed activities

**Impact:**
- ✅ **COMPATIBLE**: AI receives merged activity array with all sources
- ✅ **NO CHANGES NEEDED**: AI doesn't care about activity source
- ✅ Activities from any source contribute to FTP, TSS, training load calculations

**Verification Needed:**
- [ ] Test AI recommendations with Intervals.icu-only activities
- [ ] Test post-race analysis with Intervals.icu race
- [ ] Verify training load calculations include all sources

---

### C. Activity Matching (Plan Completion)

**Current Implementation:**
- `src/lib/activityMatching.js`: Matches completed activities to planned sessions
- Uses date, duration, and type to find matches
- Stores completions in localStorage

**Impact:**
- ✅ **COMPATIBLE**: Matching logic works with any activity source
- ✅ **NO CHANGES NEEDED**: Deduplication prevents double-counting
- ⚠️ **VERIFY**: Ensure Intervals.icu activity types map correctly

**Activity Type Mapping:**
```javascript
// Intervals.icu types → App types
'Ride' → 'Ride'
'VirtualRide' → 'VirtualRide'
'Run' → 'Run'
'Swim' → 'Swim'
'Workout' → 'Workout'
```

**Verification Needed:**
- [ ] Test activity matching with Intervals.icu activities
- [ ] Verify completion percentages calculate correctly
- [ ] Test with mixed sources (some Strava, some Intervals)

---

### D. Manual Activity Management

**Current Implementation:**
- Manual activities stored in database
- Merged with Strava activities
- Can be edited/deleted via UI

**Impact:**
- ✅ **COMPATIBLE**: Manual activities now merge with both Strava and Intervals
- ✅ **IMPROVED**: Deduplication prevents conflicts
- ✅ **NO CHANGES NEEDED**

**Verification Needed:**
- [ ] Test manual activity creation with both sources connected
- [ ] Verify deduplication works (manual activity doesn't duplicate Strava/Intervals)
- [ ] Test editing/deleting manual activities

---

### E. Analytics & Metrics

**Current Implementation:**
- FTP calculation: `/api/analytics/ftp`
- FTHR calculation: `/api/analytics/fthr`
- Training load: `/api/analytics/load`
- Smart FTP: `/api/analytics/smart-ftp`

**Impact:**
- ✅ **COMPATIBLE**: All analytics endpoints accept activity arrays
- ✅ **IMPROVED**: More data = better calculations
- ✅ **NO CHANGES NEEDED**: Source-agnostic

**Verification Needed:**
- [ ] Test FTP calculation with Intervals.icu power data
- [ ] Test FTHR calculation with Intervals.icu HR data
- [ ] Verify training load with mixed sources
- [ ] Test Smart FTP with multi-source data

---

### F. Calendar Sync (Google Calendar)

**Current Implementation:**
- Syncs training plan to Google Calendar
- Does NOT sync completed activities

**Impact:**
- ✅ **NO IMPACT**: Calendar sync only deals with planned sessions
- ✅ **NO CHANGES NEEDED**

---

### G. Strava-Specific Features

**Current Implementation:**
- Strava OAuth flow
- Strava token refresh
- Strava activity detail links

**Impact:**
- ⚠️ **PARTIAL COMPATIBILITY**: Some features only work with Strava activities
- Need to handle Intervals.icu activities gracefully

**Required Changes:**

1. **Activity Detail Links**
   - Strava: `https://www.strava.com/activities/{id}`
   - Intervals.icu: `https://intervals.icu/activities/{id}`
   - Update `ActivityDetailModal` to use correct URL based on source

2. **Activity Editing**
   - Strava activities: Read-only (edit on Strava)
   - Intervals.icu activities: Read-only (edit on Intervals.icu)
   - Manual activities: Editable in app

3. **Activity Deletion**
   - Strava activities: Cannot delete (must delete on Strava)
   - Intervals.icu activities: Cannot delete (must delete on Intervals.icu)
   - Manual activities: Can delete in app

---

## 🎨 UI/UX ENHANCEMENTS

### Source Badges (Priority: MEDIUM)

**Implementation:**
```javascript
// In activity list/card components
import { getActivitySourceInfo } from '../lib/activityMerger';

const sourceInfo = getActivitySourceInfo(activity);

<span className={`px-2 py-1 text-xs rounded ${sourceInfo.bgColor} ${sourceInfo.textColor}`}>
  {sourceInfo.name}
</span>
```

**Locations to Add Badges:**
- ✅ Dashboard activity list
- ✅ All Activities page
- ✅ Activity detail modal
- ✅ Plan completion cards
- ✅ Recent activities widget

**Design:**
- Strava: Orange badge
- Intervals.icu: Purple badge
- Manual: Blue badge

---

## 🧪 TESTING CHECKLIST

### Connection States
- [ ] **Strava Only**: All features work as before
- [ ] **Intervals Only**: Activities load, analytics work, no Strava errors
- [ ] **Both Connected**: Deduplication works, no duplicates shown
- [ ] **Neither Connected**: Appropriate connect buttons shown
- [ ] **Manual Only**: Manual activities work without external sources

### Feature Testing
- [ ] **Dashboard**: Loads with any source, shows correct metrics
- [ ] **All Activities**: Displays activities from all sources
- [ ] **Plan Generator**: Creates plans with multi-source data
- [ ] **Activity Matching**: Matches activities from any source
- [ ] **Race Tagging**: Can tag races from any source (after migration)
- [ ] **AI Analysis**: Works with multi-source activities
- [ ] **Post-Race Analysis**: Works with Intervals.icu races
- [ ] **FTP/FTHR Calculation**: Uses data from all sources
- [ ] **Training Load**: Calculates correctly with mixed sources

### Edge Cases
- [ ] **Duplicate Activities**: Same activity on Strava and Intervals shows once
- [ ] **Token Expiry**: Graceful handling when one source fails
- [ ] **API Errors**: App continues working if one source is down
- [ ] **Empty States**: Appropriate messages when no activities
- [ ] **Mixed Activity Types**: All types (Ride, Run, Swim, etc.) work

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 1: Critical (COMPLETED ✅)
1. ✅ Backend activity fetching (Intervals.icu endpoint)
2. ✅ Activity merger with deduplication
3. ✅ Dashboard multi-source support
4. ✅ All Activities page updates
5. ✅ Plan Generator updates

### Phase 2: High Priority (NEXT)
1. ⚠️ Race tagging database migration
2. ⚠️ Race tagging API updates
3. ⚠️ Race tagging frontend updates
4. 🔄 Source badges in UI
5. 🔄 Activity detail link handling

### Phase 3: Testing & Verification
1. 🔄 Connection state testing
2. 🔄 Feature compatibility testing
3. 🔄 Edge case testing
4. 🔄 Performance testing (large datasets)
5. 🔄 User acceptance testing

### Phase 4: Polish & Documentation
1. Source badge styling
2. User documentation
3. Admin documentation
4. API documentation
5. Changelog updates

---

## 🚨 KNOWN ISSUES & LIMITATIONS

### Current Limitations
1. **Race Tags**: Not yet compatible with Intervals.icu activities (migration needed)
2. **Activity Links**: All links currently go to Strava (need source-aware links)
3. **Source Badges**: Not yet visible in UI (implementation pending)

### Future Enhancements
1. **Activity Sync Direction**: Push activities FROM app TO Intervals.icu
2. **Workout Push**: Push training plan workouts to Intervals.icu calendar
3. **Advanced Deduplication**: Store mapping of duplicate activities
4. **Source Preferences**: Let user choose preferred source for metrics
5. **Bi-directional Sync**: Keep activities in sync across platforms

---

## 📝 DATABASE CHANGES SUMMARY

### Required Migrations

**Migration 008: Race Tag Source Support**
```sql
-- Add source column
ALTER TABLE race_tags ADD COLUMN activity_source TEXT DEFAULT 'strava';

-- Update unique constraint
DROP INDEX IF EXISTS idx_race_tags_unique;
CREATE UNIQUE INDEX idx_race_tags_unique ON race_tags(user_id, activity_id, activity_source);

-- Add index for source queries
CREATE INDEX idx_race_tags_source ON race_tags(activity_source);
```

### No Changes Needed
- `api_keys` table: Already supports multiple OAuth providers
- `intervals_tokens` table: Already exists
- `manual_activities` table: No changes needed
- `training_plans` table: No changes needed
- `ai_model_configs` table: No changes needed

---

## 🔐 SECURITY CONSIDERATIONS

### Token Storage
- ✅ Intervals.icu tokens stored encrypted in database
- ✅ Strava tokens stored encrypted in database
- ✅ API keys encrypted with AES-256
- ✅ No tokens in localStorage (session tokens only)

### API Access
- ✅ All endpoints require authentication
- ✅ User can only access their own activities
- ✅ OAuth scopes limited to read-only for activities
- ✅ Tokens refreshed automatically when expired

---

## 📊 PERFORMANCE CONSIDERATIONS

### Caching Strategy
- Dashboard caches merged activities (5-minute TTL)
- All Activities page reads from Dashboard cache
- Cache invalidated on force refresh
- Cache stores merged activities (all sources)

### API Rate Limits
- Strava: 100 requests per 15 minutes, 1000 per day
- Intervals.icu: No strict limits (1 req/sec implemented)
- Deduplication reduces redundant fetches

### Optimization Opportunities
1. **Parallel Fetching**: Fetch Strava and Intervals simultaneously (already implemented)
2. **Incremental Sync**: Only fetch new activities since last sync
3. **Background Sync**: Periodic background refresh
4. **Pagination**: Load activities in chunks for large datasets

---

## 🎯 SUCCESS CRITERIA

### Must Have (Phase 1 - COMPLETE ✅)
- ✅ Activities load from Strava OR Intervals.icu
- ✅ Deduplication prevents duplicate activities
- ✅ Dashboard works with any source
- ✅ All Activities page shows conditional connect buttons
- ✅ Plan Generator uses multi-source data

### Should Have (Phase 2 - IN PROGRESS)
- ⚠️ Race tagging works with any source
- 🔄 Source badges visible in UI
- 🔄 Activity links go to correct platform
- 🔄 All features tested with both sources

### Nice to Have (Phase 3 - FUTURE)
- Activity sync direction (push to Intervals)
- Workout push to Intervals calendar
- Advanced deduplication with mapping
- Source preference settings

---

## 📚 RELATED DOCUMENTATION

- `TODO_INTERVALS_INTEGRATION.md` - Original implementation plan
- `server/services/intervalsService.js` - Activity normalization logic
- `src/lib/activityMerger.js` - Deduplication algorithm
- `server/routes/intervals.js` - Intervals.icu API endpoints

---

**Last Updated:** Jan 24, 2026, 10:08 AM
**Status:** Core implementation complete, testing phase beginning
**Next Steps:** Race tagging migration, source badges, comprehensive testing
