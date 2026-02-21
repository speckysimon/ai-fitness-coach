# Canonical Streams Fixes - Source-of-Truth Enforcement

## Overview

Fixed canonical stream storage to enforce strict physiology_source matching, make time_s mandatory, and wire stream writes at the correct physiology update point.

---

## Problems Fixed

### 1. ❌ Incorrect Source-of-Truth Enforcement

**Problem:** `upsertCanonicalStreams` was using provider ordering or accepting provider incorrectly, allowing lower-priority providers to overwrite streams.

**Fix:** Updated function signature to require both `physiologySource` and `incomingProvider`, with strict matching enforcement.

### 2. ❌ Optional time_s

**Problem:** `time_s` was optional, but downstream metrics require it to be reliable.

**Fix:** Made `time_s` mandatory - streams are rejected if `time_s` is missing. Extractors now always generate deterministic `time_s` if not provided by the source.

### 3. ❌ Wrong Wiring Point

**Problem:** Streams were being written "after applyBestDataWins with provider=..." which could write at the wrong time.

**Fix:** Wired stream upserts into `activityUpdateService.updateActivityPhysiology()` - streams are written only when physiology_source is correctly set.

---

## Changes Made

### A) canonicalStreamService.js

**Updated Function Signature:**

```javascript
// OLD:
export async function upsertCanonicalStreams(userId, activityId, physiologySource, providerStreams)

// NEW:
export async function upsertCanonicalStreams(userId, activityId, physiologySource, incomingProvider, providerStreams)
```

**Provider Mapping:**

```javascript
function mapProviderToPhysiologySource(provider) {
  const mapping = {
    'garmin_fit': 'fit',
    'fit_upload': 'fit',
    'intervals': 'intervals',
    'strava': 'strava'
  };
  return mapping[provider] || provider;
}
```

**Strict Enforcement:**

```javascript
// Map incoming provider to canonical source
const mappedProvider = mapProviderToPhysiologySource(incomingProvider);

// STRICT MATCHING - reject if mismatch
if (mappedProvider !== physiologySource) {
  return {
    ok: false,
    reason: 'PHYSIOLOGY_SOURCE_MISMATCH',
    incomingProvider,
    mappedProvider,
    physiologySource
  };
}
```

**Mandatory time_s:**

```javascript
// MANDATORY: time_s must be present
if (!time_s || !Array.isArray(time_s) || time_s.length === 0) {
  return {
    ok: false,
    reason: 'TIME_S_REQUIRED',
    message: 'time_s array is mandatory for stream storage'
  };
}
```

---

### B) streamExtractor.js

**Added Helper Functions:**

```javascript
// Generate deterministic time_s array
function generateTimeArray(length, sampleInterval = 1) {
  return Array(length).fill(0).map((_, i) => i * sampleInterval);
}

// Infer sample interval from stream length and duration
function inferSampleInterval(streamLength, durationS) {
  if (!streamLength || !durationS || streamLength === 0) {
    return 1; // Default to 1Hz
  }
  const interval = durationS / streamLength;
  // Round to sensible intervals: 1, 2, 5, 10, 15, 30, 60
  const sensibleIntervals = [1, 2, 5, 10, 15, 30, 60];
  return sensibleIntervals.reduce((prev, curr) => 
    Math.abs(curr - interval) < Math.abs(prev - interval) ? curr : prev
  );
}
```

**Updated Extractors:**

All extractors now:
1. Accept `options` parameter with `duration_s`
2. Always generate `time_s` if missing
3. Mark generated `time_s` with flags

**Example - extractStravaStreams:**

```javascript
// MANDATORY: time_s must always be present
if (stravaStreams.time?.data) {
  streams.time_s = stravaStreams.time.data;
} else if (streamLength > 0) {
  // Generate time_s deterministically
  const sampleInterval = options.duration_s 
    ? inferSampleInterval(streamLength, options.duration_s)
    : 1;
  streams.time_s = generateTimeArray(streamLength, sampleInterval);
  streams._time_s_generated = true;
  streams._sample_interval_inferred = sampleInterval;
}
```

---

### C) activityUpdateService.js

**Made Function Async:**

```javascript
// OLD:
export function updateActivityPhysiology(activityId, provider, physiology, streams = null)

// NEW:
export async function updateActivityPhysiology(activityId, provider, physiology, streams = null)
```

**Wired Stream Upserts:**

```javascript
// WIRE STREAMS: After physiology update, extract and store streams
if (streams && typeof streams === 'object') {
  // Get updated activity to get final physiology_source
  const updatedActivity = db.prepare('SELECT physiology_source, duration_s, user_id FROM activities WHERE id = ?').get(activityId);
  
  if (updatedActivity) {
    // Extract streams from provider data
    const extractedStreams = extractStreams(streams, provider, {
      duration_s: updatedActivity.duration_s || physiology.duration_s
    });
    
    if (extractedStreams) {
      // Upsert streams with strict physiology_source enforcement
      const streamResult = await upsertCanonicalStreams(
        updatedActivity.user_id,
        activityId,
        updatedActivity.physiology_source, // Current canonical physiology source
        provider, // Incoming provider attempting to write
        extractedStreams
      );
      
      if (streamResult.ok) {
        console.log(`[ActivityUpdate] ✅ Streams stored for ${activityId} from ${provider}`);
      } else if (streamResult.reason === 'PHYSIOLOGY_SOURCE_MISMATCH') {
        console.log(`[ActivityUpdate] ⚠️  Streams rejected: ${provider} does not match physiology_source`);
      } else {
        console.warn(`[ActivityUpdate] ⚠️  Stream storage failed: ${streamResult.reason}`);
      }
    }
  }
}
```

---

### D) canonicalStreams.test.js

**Updated Tests:**

1. **Physiology Source Enforcement:**
   ```javascript
   it('should enforce physiology_source rule - Strava cannot overwrite Intervals', async () => {
     // Intervals activity with physiology_source='intervals'
     // Try to write streams from Strava
     const result = await upsertCanonicalStreams(
       TEST_USER_ID,
       activityId,
       'intervals', // physiology_source
       'strava', // incoming provider
       streams
     );
     
     expect(result.ok).toBe(false);
     expect(result.reason).toBe('PHYSIOLOGY_SOURCE_MISMATCH');
   });
   ```

2. **FIT Upgrade Scenario:**
   ```javascript
   it('should allow FIT to overwrite when physiology_source upgraded to fit', async () => {
     // Store Intervals streams
     await upsertCanonicalStreams(userId, activityId, 'intervals', 'intervals', intervalsStreams);
     
     // Upgrade physiology_source to FIT
     db.prepare('UPDATE activities SET physiology_source = ? WHERE id = ?').run('fit', activityId);
     
     // Now FIT can overwrite
     const result = await upsertCanonicalStreams(userId, activityId, 'fit', 'garmin_fit', fitStreams);
     
     expect(result.ok).toBe(true);
     expect(result.source).toBe('garmin_fit');
   });
   ```

3. **Mandatory time_s:**
   ```javascript
   it('should reject streams without time_s', async () => {
     const streams = {
       power: [150, 180, 200],
       hr: [140, 150, 160]
       // time_s is missing!
     };
     
     const result = await upsertCanonicalStreams(userId, activityId, 'intervals', 'intervals', streams);
     
     expect(result.ok).toBe(false);
     expect(result.reason).toBe('TIME_S_REQUIRED');
   });
   ```

4. **Generated time_s:**
   ```javascript
   it('should generate time_s when missing from Intervals', () => {
     const streams = extractIntervalsStreams(intervalsActivity, { duration_s: 3 });
     
     expect(streams.time_s).toEqual([0, 1, 2]);
     expect(streams._time_s_generated).toBe(true);
     expect(streams._sample_interval_inferred).toBe(1);
   });
   ```

5. **Deterministic Sample Interval:**
   ```javascript
   it('should generate deterministic time_s with inferred sample interval', () => {
     const stravaStreams = {
       watts: { data: Array(120).fill(150) } // 120 samples
     };
     
     // 600 seconds / 120 samples = 5 second interval
     const streams = extractStravaStreams(stravaActivity, stravaStreams, { duration_s: 600 });
     
     expect(streams.time_s[1]).toBe(5);
     expect(streams._sample_interval_inferred).toBe(5);
   });
   ```

---

## Enforcement Rules

### Source-of-Truth Matching

| Physiology Source | Incoming Provider | Mapped Provider | Result |
|-------------------|-------------------|-----------------|--------|
| `intervals` | `intervals` | `intervals` | ✅ ALLOWED |
| `intervals` | `strava` | `strava` | ❌ REJECTED |
| `fit` | `garmin_fit` | `fit` | ✅ ALLOWED |
| `fit` | `fit_upload` | `fit` | ✅ ALLOWED |
| `fit` | `intervals` | `intervals` | ❌ REJECTED |
| `strava` | `strava` | `strava` | ✅ ALLOWED |
| `strava` | `intervals` | `intervals` | ❌ REJECTED |

### Provider Mapping

```javascript
'garmin_fit' → 'fit'
'fit_upload' → 'fit'
'intervals' → 'intervals'
'strava' → 'strava'
```

### time_s Generation

**When time_s is provided:**
- Use as-is

**When time_s is missing:**
1. Infer sample interval from `streamLength / duration_s`
2. Round to sensible interval (1, 2, 5, 10, 15, 30, 60 seconds)
3. Generate: `[0, interval, 2*interval, ..., (n-1)*interval]`
4. Mark with flags: `_time_s_generated: true`, `_sample_interval_inferred: N`

**Example:**
- 120 samples, 600 seconds → 5 second interval
- Generated: `[0, 5, 10, 15, ..., 595]`

---

## Integration Flow

### 1. Activity Import/Update

```
Provider data arrives
    ↓
activityUpdateService.updateActivityPhysiology(activityId, provider, physiology, streams)
    ↓
Guard checks (guardIntervalsPhysiology)
    ↓
Update physiology fields
    ↓
Get final physiology_source from DB
    ↓
extractStreams(streams, provider, { duration_s })
    ↓
upsertCanonicalStreams(userId, activityId, physiologySource, incomingProvider, extractedStreams)
    ↓
Enforce: mappedProvider === physiologySource
    ↓
Enforce: time_s must exist
    ↓
Store streams in activity_streams table
```

### 2. Stream Retrieval

```
Analytics service needs streams
    ↓
getCanonicalStreams(userId, activityId)
    ↓
Decode streams (handle compression)
    ↓
Return: { power, hr, cadence, speed, elevation, time_s, meta }
```

---

## Error Codes

### PHYSIOLOGY_SOURCE_MISMATCH

**Reason:** Incoming provider does not match activity's physiology_source

**Response:**
```json
{
  "ok": false,
  "reason": "PHYSIOLOGY_SOURCE_MISMATCH",
  "incomingProvider": "strava",
  "mappedProvider": "strava",
  "physiologySource": "intervals"
}
```

**Action:** Do not store streams. Log warning.

### TIME_S_REQUIRED

**Reason:** time_s array is missing or empty

**Response:**
```json
{
  "ok": false,
  "reason": "TIME_S_REQUIRED",
  "message": "time_s array is mandatory for stream storage"
}
```

**Action:** Do not store streams. Ensure extractor generates time_s.

### ACTIVITY_NOT_FOUND

**Reason:** Activity does not exist in database

**Response:**
```json
{
  "ok": false,
  "reason": "ACTIVITY_NOT_FOUND"
}
```

**Action:** Do not store streams. Check activity creation.

---

## Testing

### Run Tests

```bash
npm test server/tests/canonicalStreams.test.js
```

### Expected Results

```
✓ Stream Codec - Encoding/Decoding (4 tests)
✓ Stream Codec - Gap Detection (3 tests)
✓ Stream Codec - Validation (3 tests)
✓ Canonical Stream Service - Storage (5 tests)
  ✓ should store and retrieve streams
  ✓ should enforce physiology_source rule - Strava cannot overwrite Intervals
  ✓ should allow FIT to overwrite when physiology_source upgraded to fit
  ✓ should reject streams without time_s
  ✓ should handle compression for large streams
✓ Canonical Stream Service - Queries (3 tests)
✓ Stream Extractor (6 tests)
  ✓ should extract Intervals streams with time_s
  ✓ should generate time_s when missing from Intervals
  ✓ should extract Strava streams with time_s
  ✓ should generate time_s when missing from Strava
  ✓ should generate deterministic time_s with inferred sample interval
  ✓ should return null for missing streams
✓ Integration - Normaliser (1 test)

Total: 25 tests passing
```

---

## Files Changed

### Modified Files

1. **server/services/canonicalStreamService.js**
   - Updated `upsertCanonicalStreams` signature
   - Added `mapProviderToPhysiologySource` function
   - Added strict physiology_source enforcement
   - Added mandatory time_s validation

2. **server/services/streamExtractor.js**
   - Added `generateTimeArray` helper
   - Added `inferSampleInterval` helper
   - Updated `extractStravaStreams` to always generate time_s
   - Updated `extractIntervalsStreams` to always generate time_s
   - Updated `extractFitStreams` to always generate time_s
   - Updated `extractStreams` to pass options through

3. **server/services/activityUpdateService.js**
   - Made `updateActivityPhysiology` async
   - Added stream extraction and upsert after physiology update
   - Wired streams at correct physiology update point

4. **server/tests/canonicalStreams.test.js**
   - Updated test for physiology_source enforcement
   - Added test for FIT upgrade scenario
   - Added test for mandatory time_s rejection
   - Added tests for generated time_s
   - Added test for deterministic sample interval inference

---

## Usage Examples

### Correct Usage

```javascript
// In activityUpdateService.updateActivityPhysiology
const result = await updateActivityPhysiology(
  activityId,
  'intervals', // provider
  {
    avg_power: 185,
    duration_s: 3600,
    // ... other physiology
  },
  {
    // Provider stream data (will be extracted)
    _raw: {
      streams: [
        { type: 'watts', data: [...] },
        { type: 'heartrate', data: [...] }
      ]
    }
  }
);
```

### Stream Extraction

```javascript
// Extractor automatically generates time_s if missing
const streams = extractStreams(providerData, 'intervals', {
  duration_s: 3600
});

// Result:
// {
//   power: [150, 180, 200, ...],
//   hr: [140, 150, 160, ...],
//   time_s: [0, 1, 2, ...], // Generated if missing
//   _time_s_generated: true,
//   _sample_interval_inferred: 1
// }
```

### Stream Upsert

```javascript
// Correct physiology_source and provider
const result = await upsertCanonicalStreams(
  userId,
  activityId,
  'intervals', // physiology_source from activity
  'intervals', // incoming provider
  streams
);
// Result: { ok: true, ... }

// Mismatched provider
const result = await upsertCanonicalStreams(
  userId,
  activityId,
  'intervals', // physiology_source from activity
  'strava', // incoming provider (MISMATCH)
  streams
);
// Result: { ok: false, reason: 'PHYSIOLOGY_SOURCE_MISMATCH' }
```

---

## Summary

✅ **Strict physiology_source enforcement** - Only matching providers can write streams
✅ **Mandatory time_s** - All streams must have time_s array
✅ **Deterministic time_s generation** - Automatic generation with inferred sample interval
✅ **Correct wiring point** - Streams written during physiology update
✅ **Provider mapping** - garmin_fit/fit_upload map to 'fit'
✅ **Comprehensive tests** - 25 tests covering all scenarios
✅ **Clear error codes** - PHYSIOLOGY_SOURCE_MISMATCH, TIME_S_REQUIRED

**Status:** Ready for integration and testing with real provider data.
