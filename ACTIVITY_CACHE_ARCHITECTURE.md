# Activity Cache Architecture

## Overview
Clean, simple caching strategy with Dashboard as the single source of truth.

## Architecture

### Dashboard (Master)
**Role**: Fetch and cache activities
**Behavior**:
- Fetches 200 recent activities from Strava (covers ~3-6 months)
- Caches to `cached_activities_recent` with 5-minute expiration
- Refresh button clears cache and refetches
- Logs: `📡 [Dashboard] Fetching 200 recent activities from Strava`

### All Other Pages (Consumers)
**Role**: Read from cache only
**Behavior**:
- Read from `cached_activities_recent`
- Never fetch independently
- Never write to cache
- If no cache → show message "Please visit Dashboard first"

## Pages

### ✅ Dashboard
- **Fetches**: 200 activities (no date filter)
- **Caches**: Yes (5-minute expiration)
- **Status**: Master

### ✅ AllActivities
- **Fetches**: No (reads from Dashboard cache)
- **Caches**: No
- **Status**: Consumer

### ✅ RiderProfile
- **Fetches**: No (reads from Dashboard cache)
- **Caches**: No
- **Status**: Consumer

### ⏳ Calendar
- **Fetches**: No (reads from Dashboard cache)
- **Caches**: No
- **Status**: Consumer (needs update)

### ⏳ Form
- **Fetches**: No (reads from Dashboard cache)
- **Caches**: No
- **Status**: Consumer (needs update)

### ⏳ RaceDayPredictor
- **Fetches**: No (reads from Dashboard cache)
- **Caches**: No
- **Status**: Consumer (needs update)

### ⏳ PlanGenerator
- **Fetches**: Yes (6 weeks for FTP calculation)
- **Caches**: No
- **Status**: Independent (special case - needs FTP)

## Cache Keys

- `cached_activities_recent` - 200 recent activities (Dashboard writes, all read)
- `cached_metrics` - FTP, load metrics (Dashboard writes)
- `cached_trends` - Trend data (Dashboard writes)
- `cache_timestamp_recent` - Cache timestamp (Dashboard writes)

## Benefits

1. **No conflicts**: Single writer, multiple readers
2. **No duplicate fetching**: Only Dashboard fetches
3. **Consistent data**: All pages see same activities
4. **Simple debugging**: Clear data flow
5. **Better UX**: Fast page loads from cache

## User Flow

1. User logs in → Dashboard loads → Fetches 200 activities → Caches
2. User navigates to RiderProfile → Reads from cache → Instant load
3. User navigates to AllActivities → Reads from cache → Instant load
4. User clicks Dashboard refresh → Clears cache → Refetches → Updates cache
5. All pages now see fresh data

## Implementation Status

- ✅ Dashboard: Master (done)
- ✅ AllActivities: Consumer (done)
- ✅ RiderProfile: Consumer (done)
- ⏳ Calendar: Needs update
- ⏳ Form: Needs update
- ⏳ RaceDayPredictor: Needs update
- ⏳ PlanGenerator: Special case (independent)
