# Provider Integration Playbook

**Version:** 1.0  
**Last Updated:** February 17, 2026  
**Purpose:** Step-by-step guide for integrating new activity providers (Garmin, Wahoo, etc.) into RiderLabs

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Integration Contract](#integration-contract)
3. [Step-by-Step Integration](#step-by-step-integration)
4. [Provider Interface Requirements](#provider-interface-requirements)
5. [Testing Requirements](#testing-requirements)
6. [Common Pitfalls](#common-pitfalls)
7. [Example: Adding Garmin](#example-adding-garmin)

---

## Architecture Overview

### Core Principles

**CRITICAL:** RiderLabs has a strict data integrity architecture. All provider integrations MUST follow these rules:

1. **Single Entry Point:** `activityImportOrchestrator` is the ONLY way to write activities
2. **Canonical Selection:** `canonicalActivitySelector` decides all merge/create/upgrade actions
3. **Split Updates:** `activityUpdateService` is the ONLY place to write physiology/metadata
4. **Source Tracking:** `activity_sources` stores raw payloads and provenance
5. **Mandatory Verification:** `verifyPostImport` MUST run after all imports
6. **Display Stability:** Display classes MUST NOT change

### Data Flow

```
Provider API
    ↓
Provider Service (fetch activities)
    ↓
Provider Mapper (transform to internal format)
    ↓
activityImportOrchestrator.importActivityBatch()
    ↓
canonicalActivitySelector.selectOrCreateCanonicalActivity()
    ↓
activityUpdateService.{createCanonicalActivity|updateActivityPhysiology|updateActivityMetadata}
    ↓
activity_sources (raw payload stored)
    ↓
verifyPostImport() (mandatory)
```

### Source-of-Truth Rules

**Physiology Priority:**
```
FIT (4) > Intervals-native (3) > Strava (2) > Shell (1)
```

**Metadata Priority:**
```
Strava (3) > Intervals (2) > FIT (1)
```

**Protected Fields:**
- Intervals-native physiology is PROTECTED from Strava overwrites
- Duration, power, HR, cadence NEVER overwritten by lower-priority sources
- Safe backfill: distance/elevation/speed only if missing

---

## Integration Contract

### MUST DO

✅ **Use activityImportOrchestrator**
- ALL imports go through `importActivity()` or `importActivityBatch()`
- NO direct DB writes to `activities` table
- NO direct calls to `activityUpdateService`

✅ **Implement Provider Service**
- OAuth token management (fetch, refresh, store)
- Fetch activities list with pagination
- Fetch activity details/streams
- Download FIT files (if available)

✅ **Implement Provider Mapper**
- Transform provider format to internal format
- Map physiology fields (duration, power, HR, cadence, etc.)
- Map metadata fields (name, description, sport, type)
- Detect activity type (native vs shell vs FIT)

✅ **Call verifyPostImport**
- MUST run after every import batch
- Return integrity results in API response
- NO auto-fix (manual review required)

✅ **Store Raw Payloads**
- Store complete provider response in `activity_sources.raw_json`
- Include all fields for debugging/reprocessing
- Track provider version/API version

✅ **Preserve Display Classes**
- Use `activityDisplayClassAdapter` for UI display
- NO changes to display logic
- Test display class stability

### MUST NOT DO

❌ **Bypass Orchestrator**
- NO `db.prepare("INSERT INTO activities")`
- NO `db.prepare("UPDATE activities")`
- NO direct manipulation of `physiology_source` or `metadata_source`

❌ **Skip Verification**
- `verifyPostImport()` is NOT optional
- Integrity violations MUST be logged
- NO silent auto-fixes

❌ **Change Display Classes**
- Display logic is locked in `activityDisplayClassAdapter`
- NO new display rules
- NO changes to existing display rules

❌ **Implement Custom Merge Logic**
- `canonicalActivitySelector` handles ALL merging
- NO custom fuzzy matching
- NO custom priority rules

---

## Step-by-Step Integration

### Step 1: Set Up Provider Structure

Create provider directory:
```
server/services/providers/
├── README.md
├── garminService.js
├── garminMapper.js
└── garminTypes.js (optional)
```

### Step 2: Implement OAuth Flow

**Required Functions:**

```javascript
// garminService.js

/**
 * Get OAuth authorization URL
 */
export function getAuthUrl(userId, redirectUri) {
  // Return OAuth URL for user to authorize
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code, userId) {
  // Exchange code for access/refresh tokens
  // Store in database (garmin_tokens table)
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(userId) {
  // Use refresh token to get new access token
  // Update database
}

/**
 * Check if user has valid tokens
 */
export function hasValidTokens(userId) {
  // Check if tokens exist and are not expired
}
```

**Database Schema:**

```sql
CREATE TABLE IF NOT EXISTS garmin_tokens (
  user_id INTEGER PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,
  scope TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Step 3: Implement Activity Fetching

**Required Functions:**

```javascript
// garminService.js

/**
 * Fetch activities list with pagination
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Fetch options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @param {number} options.limit - Max activities per page
 * @returns {Promise<Array>} Activities
 */
export async function fetchActivities(userId, options = {}) {
  // 1. Get valid access token (refresh if needed)
  const token = await getValidAccessToken(userId);
  
  // 2. Fetch activities from provider API
  const response = await fetch(GARMIN_API_URL, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // 3. Handle pagination
  const activities = response.data;
  
  // 4. Return raw provider format
  return activities;
}

/**
 * Fetch single activity details
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Provider activity ID
 * @returns {Promise<Object>} Activity details
 */
export async function fetchActivityDetails(userId, activityId) {
  // Fetch detailed activity data including streams
}

/**
 * Download FIT file (if available)
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Provider activity ID
 * @returns {Promise<Buffer>} FIT file data
 */
export async function downloadFitFile(userId, activityId) {
  // Download original FIT file if provider supports it
}
```

### Step 4: Implement Provider Mapper

**Required Functions:**

```javascript
// garminMapper.js

/**
 * Map provider activity to internal format
 * 
 * @param {Object} providerActivity - Raw provider activity
 * @returns {Object} Internal format
 */
export function mapToInternalFormat(providerActivity) {
  return {
    // Provider metadata
    provider_id: providerActivity.id,
    
    // Metadata fields
    name: providerActivity.activityName,
    description: providerActivity.description,
    sport: mapSportType(providerActivity.activityType),
    type: mapActivityType(providerActivity.activityType),
    start_time: providerActivity.startTimeGMT,
    timezone_offset_min: providerActivity.timeZoneUnitOffsetMinutes,
    
    // Physiology fields
    duration_s: providerActivity.duration,
    distance_m: providerActivity.distance,
    elevation_m: providerActivity.elevationGain,
    avg_power: providerActivity.avgPower,
    max_power: providerActivity.maxPower,
    normalized_power: providerActivity.normPower,
    avg_hr: providerActivity.avgHR,
    max_hr: providerActivity.maxHR,
    avg_cadence: providerActivity.avgRunCadence || providerActivity.avgBikeCadence,
    avg_speed: providerActivity.avgSpeed,
    max_speed: providerActivity.maxSpeed,
    calories: providerActivity.calories,
    
    // Flags
    has_power: !!providerActivity.avgPower,
    
    // Keep raw for debugging
    _raw: providerActivity
  };
}

/**
 * Detect activity type
 * 
 * @param {Object} providerActivity - Raw provider activity
 * @returns {string} Activity type: 'garmin_native', 'garmin_fit', etc.
 */
export function detectActivityType(providerActivity) {
  // Determine if this is native Garmin data, FIT upload, etc.
  if (providerActivity.fileFormat === 'FIT') {
    return 'fit';
  }
  return 'garmin_native';
}

/**
 * Map sport type to internal format
 */
function mapSportType(garminType) {
  const mapping = {
    'cycling': 'cycling',
    'running': 'running',
    'swimming': 'swimming',
    // ... more mappings
  };
  return mapping[garminType] || 'cycling';
}
```

### Step 5: Implement Sync Function

**Required Functions:**

```javascript
// garminService.js

import { importActivityBatch, verifyPostImport } from '../activityImportOrchestrator.js';
import { mapToInternalFormat, detectActivityType } from './garminMapper.js';

/**
 * Sync Garmin activities for a user
 * 
 * CRITICAL: This is the main integration point.
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results with integrity check
 */
export async function syncGarminActivities(userId, options = {}) {
  console.log(`[Garmin] Starting sync for user ${userId}`);
  
  // 1. Check tokens
  if (!hasValidTokens(userId)) {
    return {
      ok: false,
      error: 'NO_VALID_TOKENS',
      message: 'User needs to authorize Garmin connection'
    };
  }
  
  // 2. Fetch activities from Garmin
  const rawActivities = await fetchActivities(userId, options);
  console.log(`[Garmin] Fetched ${rawActivities.length} activities`);
  
  // 3. Map to internal format
  const mappedActivities = rawActivities.map(mapToInternalFormat);
  
  // 4. Import through orchestrator
  const importResults = await importActivityBatch({
    userId,
    provider: 'garmin',
    activities: mappedActivities,
    typeDetector: detectActivityType
  });
  
  console.log(`[Garmin] Import complete: ${importResults.created} created, ${importResults.upgraded} upgraded`);
  
  // 5. MANDATORY: Verify integrity
  const integrity = await verifyPostImport(userId);
  
  if (!integrity.ok) {
    console.error(`[Garmin] Integrity violations detected:`, integrity.issues);
  }
  
  // 6. Return combined results
  return {
    ok: true,
    importStats: importResults,
    integrity: {
      ok: integrity.ok,
      issues: integrity.issues,
      summary: {
        errorCount: integrity.errorCount,
        warningCount: integrity.warningCount
      }
    }
  };
}
```

### Step 6: Add API Routes

**Required Endpoints:**

```javascript
// server/routes/garmin.js

import express from 'express';
import { getAuthUrl, exchangeCodeForTokens, syncGarminActivities } from '../services/providers/garminService.js';

const router = express.Router();

/**
 * GET /api/garmin/auth/url
 * Get OAuth authorization URL
 */
router.get('/auth/url', (req, res) => {
  const userId = req.user.id;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/garmin/auth/callback`;
  
  const authUrl = getAuthUrl(userId, redirectUri);
  
  res.json({ authUrl });
});

/**
 * GET /api/garmin/auth/callback
 * OAuth callback handler
 */
router.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = req.user.id;
  
  try {
    await exchangeCodeForTokens(code, userId);
    res.redirect('/settings?garmin=connected');
  } catch (error) {
    res.redirect('/settings?garmin=error');
  }
});

/**
 * POST /api/garmin/sync
 * Sync Garmin activities
 */
router.post('/sync', async (req, res) => {
  const userId = req.user.id;
  const options = req.body;
  
  try {
    const result = await syncGarminActivities(userId, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/garmin/status
 * Check connection status
 */
router.get('/status', (req, res) => {
  const userId = req.user.id;
  const hasTokens = hasValidTokens(userId);
  
  res.json({
    connected: hasTokens
  });
});

export default router;
```

### Step 7: Implement Tests

**Required Test Coverage:**

```javascript
// server/tests/garminIntegration.test.js

describe('Garmin Integration', () => {
  
  // 1. OAuth flow
  it('should generate valid OAuth URL');
  it('should exchange code for tokens');
  it('should refresh expired tokens');
  
  // 2. Activity fetching
  it('should fetch activities with pagination');
  it('should handle API errors gracefully');
  
  // 3. Mapping
  it('should map Garmin activity to internal format');
  it('should detect activity type correctly');
  it('should preserve all physiology fields');
  
  // 4. Import integration
  it('should import Garmin-native activities');
  it('should not overwrite Intervals-native physiology');
  it('should upgrade from Strava to Garmin');
  it('should run post-import verification');
  
  // 5. Display stability
  it('should not change display classes');
  
  // 6. Integrity
  it('should pass integrity checks after import');
  it('should detect and report violations');
});
```

### Step 8: Update Documentation

**Required Updates:**

1. Add provider to `README.md`
2. Update API documentation
3. Add user-facing setup guide
4. Document provider-specific quirks

---

## Provider Interface Requirements

### Minimum Required Functions

Every provider MUST implement:

```javascript
// Service
export function getAuthUrl(userId, redirectUri);
export async function exchangeCodeForTokens(code, userId);
export async function refreshAccessToken(userId);
export function hasValidTokens(userId);
export async function fetchActivities(userId, options);
export async function syncActivities(userId, options);

// Mapper
export function mapToInternalFormat(providerActivity);
export function detectActivityType(providerActivity);
```

### Internal Format Specification

```javascript
{
  // Provider metadata
  provider_id: string,  // Provider's activity ID
  
  // Metadata fields
  name: string,
  description: string | null,
  sport: 'cycling' | 'running' | 'swimming' | ...,
  type: string,  // 'Ride', 'Run', 'Swim', etc.
  start_time: string,  // ISO 8601
  timezone_offset_min: number,
  
  // Physiology fields
  duration_s: number,
  distance_m: number | null,
  elevation_m: number | null,
  avg_power: number | null,
  max_power: number | null,
  normalized_power: number | null,
  tss: number | null,
  avg_hr: number | null,
  max_hr: number | null,
  avg_cadence: number | null,
  avg_speed: number | null,
  max_speed: number | null,
  calories: number | null,
  
  // Flags
  has_power: boolean,
  
  // Raw (for debugging)
  _raw: object  // Complete provider response
}
```

---

## Testing Requirements

### Required Test Cases

Every provider integration MUST have tests for:

1. **OAuth Flow**
   - Generate auth URL
   - Exchange code for tokens
   - Refresh expired tokens
   - Handle OAuth errors

2. **Activity Fetching**
   - Fetch activities list
   - Handle pagination
   - Fetch activity details
   - Handle API errors

3. **Mapping**
   - Map all physiology fields
   - Map all metadata fields
   - Detect activity type
   - Handle missing fields

4. **Import Integration**
   - Create new activities
   - Attach to existing activities
   - Upgrade physiology (if higher priority)
   - Upgrade metadata (if higher priority)
   - Respect Intervals-native protection

5. **Integrity**
   - Pass post-import verification
   - No shells marked as valid
   - No invalid physiology_source
   - No orphaned sources

6. **Display Stability**
   - Display classes unchanged
   - UI display logic stable

### Test Template

See `server/tests/providerIntegration.template.test.js` for complete template.

---

## Common Pitfalls

### ❌ Pitfall 1: Bypassing Orchestrator

**WRONG:**
```javascript
// DON'T DO THIS
db.prepare(`
  INSERT INTO activities (id, user_id, name, ...)
  VALUES (?, ?, ?, ...)
`).run(...);
```

**RIGHT:**
```javascript
// DO THIS
await importActivity({
  userId,
  provider: 'garmin',
  providerId: activity.id,
  providerActivity: activity,
  incomingType: 'garmin_native'
});
```

### ❌ Pitfall 2: Custom Merge Logic

**WRONG:**
```javascript
// DON'T DO THIS
const existing = db.prepare('SELECT * FROM activities WHERE ...').get(...);
if (existing) {
  // Custom merge logic
  db.prepare('UPDATE activities SET ...').run(...);
}
```

**RIGHT:**
```javascript
// DO THIS
// Let canonicalActivitySelector handle merging
await importActivity({...});
```

### ❌ Pitfall 3: Skipping Verification

**WRONG:**
```javascript
// DON'T DO THIS
const results = await importActivityBatch({...});
return results;  // Missing verification!
```

**RIGHT:**
```javascript
// DO THIS
const results = await importActivityBatch({...});
const integrity = await verifyPostImport(userId);
return { importStats: results, integrity };
```

### ❌ Pitfall 4: Changing Display Classes

**WRONG:**
```javascript
// DON'T DO THIS
function getActivityType(activity) {
  if (activity.provider === 'garmin') {
    return 'Garmin Ride';  // New display type!
  }
}
```

**RIGHT:**
```javascript
// DO THIS
import { mapToDisplayClass } from './activityDisplayClassAdapter.js';
const displayClass = mapToDisplayClass(activity);
```

---

## Example: Adding Garmin

### 1. Create Provider Files

```bash
mkdir -p server/services/providers
touch server/services/providers/garminService.js
touch server/services/providers/garminMapper.js
```

### 2. Implement OAuth

```javascript
// garminService.js
export function getAuthUrl(userId, redirectUri) {
  return `https://connect.garmin.com/oauthConfirm?oauth_callback=${redirectUri}`;
}

export async function exchangeCodeForTokens(code, userId) {
  // Exchange code for tokens
  // Store in garmin_tokens table
}
```

### 3. Implement Fetching

```javascript
export async function fetchActivities(userId, options = {}) {
  const token = await getValidAccessToken(userId);
  
  const response = await fetch('https://apis.garmin.com/wellness-api/rest/activities', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return response.json();
}
```

### 4. Implement Mapper

```javascript
// garminMapper.js
export function mapToInternalFormat(garminActivity) {
  return {
    provider_id: garminActivity.activityId,
    name: garminActivity.activityName,
    start_time: garminActivity.startTimeGMT,
    duration_s: garminActivity.duration,
    distance_m: garminActivity.distance,
    avg_power: garminActivity.avgPower,
    // ... more fields
  };
}
```

### 5. Implement Sync

```javascript
export async function syncGarminActivities(userId, options = {}) {
  const rawActivities = await fetchActivities(userId, options);
  
  const results = await importActivityBatch({
    userId,
    provider: 'garmin',
    activities: rawActivities.map(mapToInternalFormat),
    typeDetector: detectActivityType
  });
  
  const integrity = await verifyPostImport(userId);
  
  return { importStats: results, integrity };
}
```

### 6. Add Routes

```javascript
// server/routes/garmin.js
router.post('/sync', async (req, res) => {
  const result = await syncGarminActivities(req.user.id);
  res.json(result);
});
```

### 7. Test

```javascript
// server/tests/garminIntegration.test.js
it('should import Garmin activities', async () => {
  const result = await syncGarminActivities(testUserId);
  
  expect(result.ok).toBe(true);
  expect(result.integrity.ok).toBe(true);
});
```

---

## Checklist

Before submitting a provider integration, verify:

- [ ] OAuth flow implemented and tested
- [ ] Activity fetching with pagination
- [ ] Mapper transforms all fields correctly
- [ ] Sync function uses `importActivityBatch()`
- [ ] `verifyPostImport()` called after import
- [ ] Raw payloads stored in `activity_sources`
- [ ] No direct DB writes to `activities`
- [ ] Display classes unchanged
- [ ] All tests pass
- [ ] Integration tests added
- [ ] Documentation updated
- [ ] API routes added
- [ ] Error handling implemented
- [ ] Token refresh logic working

---

## Support

For questions or issues:
1. Review this playbook
2. Check existing provider implementations (Strava, Intervals)
3. Review test templates
4. Check `activityImportOrchestrator` documentation

**Remember:** The architecture is designed to prevent data corruption. Follow the contract strictly.
