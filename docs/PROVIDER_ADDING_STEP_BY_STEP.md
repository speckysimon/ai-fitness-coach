# Provider Adding Step-by-Step Guide

**Version:** 1.0  
**Last Updated:** February 17, 2026  
**Purpose:** Step-by-step instructions for adding a new activity provider to RiderLabs

---

## Prerequisites

Before adding a new provider, ensure you have:

- [ ] Provider API documentation
- [ ] OAuth credentials (client ID, client secret)
- [ ] Understanding of provider's data model
- [ ] Test account with sample activities

---

## Step 1: Create Service + Mapper

### 1.1 Create Provider Directory

```bash
mkdir -p server/services/providers/PROVIDER_NAME
```

### 1.2 Create Service Module

Create `server/services/providers/PROVIDER_NAME/PROVIDER_NAMEService.js`:

```javascript
import db from '../../../db.js';

const PROVIDER_API_BASE = 'https://api.provider.com';

export function getAuthUrl(userId, redirectUri) {
  // Build OAuth URL
  return `${PROVIDER_API_BASE}/oauth/authorize?...`;
}

export async function exchangeCodeForTokens(code, userId) {
  // Exchange code for tokens
  // Store in PROVIDER_NAME_tokens table
  return { ok: true };
}

export function hasValidTokens(userId) {
  const tokens = db.prepare(`
    SELECT access_token FROM PROVIDER_NAME_tokens WHERE user_id = ?
  `).get(userId);
  
  return !!tokens?.access_token;
}

export async function listActivities(userId, options = {}) {
  // Fetch from provider API
  const response = await fetch(`${PROVIDER_API_BASE}/activities`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  return {
    ok: true,
    activities: data.activities,
    cursor: data.next_cursor,
    hasMore: !!data.next_cursor
  };
}
```

### 1.3 Create Mapper Module

Create `server/services/providers/PROVIDER_NAME/PROVIDER_NAMEMapper.js`:

```javascript
export function mapToInternalFormat(providerActivity) {
  return {
    provider_id: String(providerActivity.id),
    name: providerActivity.name || 'Untitled',
    description: providerActivity.description,
    sport: mapSportType(providerActivity.type),
    type: mapActivityType(providerActivity.type),
    start_time: providerActivity.start_date,
    timezone_offset_min: providerActivity.utc_offset,
    duration_s: providerActivity.duration,
    distance_m: providerActivity.distance,
    elevation_m: providerActivity.elevation_gain,
    avg_power: providerActivity.avg_watts,
    max_power: providerActivity.max_watts,
    avg_hr: providerActivity.avg_heartrate,
    max_hr: providerActivity.max_heartrate,
    avg_cadence: providerActivity.avg_cadence,
    avg_speed: providerActivity.avg_speed,
    calories: providerActivity.calories,
    has_power: !!providerActivity.avg_watts,
    _raw: providerActivity
  };
}

export function detectActivityType(providerActivity) {
  if (providerActivity.has_fit_file) {
    return 'fit';
  }
  return 'PROVIDER_NAME_native';
}

function mapSportType(providerType) {
  const mapping = {
    'ride': 'cycling',
    'run': 'running',
    'swim': 'swimming'
  };
  return mapping[providerType] || 'cycling';
}

function mapActivityType(providerType) {
  const mapping = {
    'ride': 'Ride',
    'run': 'Run',
    'swim': 'Swim'
  };
  return mapping[providerType] || 'Ride';
}
```

---

## Step 2: Register Provider

### 2.1 Create Registration File

Create `server/services/providers/PROVIDER_NAME/index.js`:

```javascript
import * as service from './PROVIDER_NAMEService.js';
import * as mapper from './PROVIDER_NAMEMapper.js';

export default {
  ...service,
  ...mapper
};
```

### 2.2 Register in Main App

In `server/index.js` or a dedicated providers initialization file:

```javascript
import { registerProvider } from './services/providers/providerRegistry.js';
import providerNameModule from './services/providers/PROVIDER_NAME/index.js';

// Register provider
registerProvider('PROVIDER_NAME', providerNameModule);
```

---

## Step 3: Add Database Migration

### 3.1 Create Tokens Table

Create `server/migrations/0XX_add_PROVIDER_NAME_tokens.sql`:

```sql
-- Add PROVIDER_NAME tokens table
CREATE TABLE IF NOT EXISTS PROVIDER_NAME_tokens (
  user_id INTEGER PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,
  scope TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_PROVIDER_NAME_tokens_user 
ON PROVIDER_NAME_tokens(user_id);
```

### 3.2 Run Migration

```bash
sqlite3 server/fitness-coach.db < server/migrations/0XX_add_PROVIDER_NAME_tokens.sql
```

---

## Step 4: Add API Endpoints

### 4.1 Create Routes File

Create `server/routes/PROVIDER_NAME.js`:

```javascript
import express from 'express';
import { syncProviderActivities } from '../services/providers/providerSyncRunner.js';
import { getProvider } from '../services/providers/providerRegistry.js';

const router = express.Router();

/**
 * GET /api/PROVIDER_NAME/auth/url
 * Get OAuth authorization URL
 */
router.get('/auth/url', (req, res) => {
  const userId = req.user.id;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/PROVIDER_NAME/auth/callback`;
  
  const provider = getProvider('PROVIDER_NAME');
  const authUrl = provider.getAuthUrl(userId, redirectUri);
  
  res.json({ authUrl });
});

/**
 * GET /api/PROVIDER_NAME/auth/callback
 * OAuth callback handler
 */
router.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const userId = req.user.id;
  
  try {
    const provider = getProvider('PROVIDER_NAME');
    await provider.exchangeCodeForTokens(code, userId);
    res.redirect('/settings?PROVIDER_NAME=connected');
  } catch (error) {
    res.redirect('/settings?PROVIDER_NAME=error');
  }
});

/**
 * POST /api/PROVIDER_NAME/sync
 * Sync PROVIDER_NAME activities
 */
router.post('/sync', async (req, res) => {
  const userId = req.user.id;
  const { after, before, limit } = req.body;
  
  try {
    const result = await syncProviderActivities({
      userId,
      providerId: 'PROVIDER_NAME',
      after: after ? new Date(after) : undefined,
      before: before ? new Date(before) : undefined,
      limit
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/PROVIDER_NAME/status
 * Check connection status
 */
router.get('/status', (req, res) => {
  const userId = req.user.id;
  
  const provider = getProvider('PROVIDER_NAME');
  const hasTokens = provider.hasValidTokens(userId);
  
  res.json({
    connected: hasTokens
  });
});

export default router;
```

### 4.2 Register Routes

In `server/index.js`:

```javascript
import providerNameRoutes from './routes/PROVIDER_NAME.js';

app.use('/api/PROVIDER_NAME', providerNameRoutes);
```

---

## Step 5: Add Contract Tests

### 5.1 Update Provider Contract Tests

In `server/tests/providerContract.test.js`, add your provider:

```javascript
import * as providerNameService from '../services/providers/PROVIDER_NAME/PROVIDER_NAMEService.js';
import * as providerNameMapper from '../services/providers/PROVIDER_NAME/PROVIDER_NAMEMapper.js';

const providerNameModule = { ...providerNameService, ...providerNameMapper };

const providers = [
  { id: 'garmin', module: garminProvider },
  { id: 'wahoo', module: wahooProvider },
  { id: 'PROVIDER_NAME', module: providerNameModule }  // Add here
];
```

### 5.2 Run Contract Tests

```bash
npm test server/tests/providerContract.test.js
```

Verify all tests pass:
- ✅ Required exports
- ✅ listActivities return shape
- ✅ mapToInternalFormat return shape
- ✅ Mapper purity
- ✅ Forbidden imports
- ✅ Physiology fields preservation
- ✅ Metadata fields preservation
- ✅ Activity type detection

---

## Step 6: Define Truth Priorities

### 6.1 Update Source Priority Documentation

In `SOURCE_TRUTH_CLEANUP_IMPLEMENTATION.md`, add provider to priority matrix:

**Physiology Priority:**
```
FIT (4) > Intervals-native (3) > PROVIDER_NAME (?) > Strava (2) > Shell (1)
```

**Metadata Priority:**
```
Strava (3) > PROVIDER_NAME (?) > Intervals (2) > FIT (1)
```

### 6.2 Update Canonical Selector

If provider has different priority than existing providers, update:

`server/services/canonicalActivitySelector.js`:

```javascript
const PHYSIOLOGY_PRIORITY = {
  fit: 4,
  intervals: 3,
  PROVIDER_NAME: 2.5,  // Add priority
  strava: 2,
  shell: 1
};

const METADATA_PRIORITY = {
  strava: 3,
  PROVIDER_NAME: 2.5,  // Add priority
  intervals: 2,
  fit: 1
};
```

### 6.3 Define Capability Matrix

Document provider capabilities:

| Capability | Intervals | Strava | FIT | PROVIDER_NAME |
|------------|-----------|--------|-----|---------------|
| Power Data | ✅ | ✅ | ✅ | ? |
| HR Data | ✅ | ✅ | ✅ | ? |
| Cadence | ✅ | ✅ | ✅ | ? |
| Streams | ✅ | ✅ | ✅ | ? |
| FIT Files | ❌ | ❌ | ✅ | ? |
| Map Data | ✅ | ✅ | ❌ | ? |
| Photos | ❌ | ✅ | ❌ | ? |

---

## Step 7: Run devResetAndReimport to Validate

### 7.1 Test with Real User

```bash
node server/scripts/devResetAndReimport.js
```

### 7.2 Verify Results

Check output for:

```
📊 [SOURCES] Source distribution report...

   📊 Physiology Sources:
      intervals: 112
      strava: 43
      PROVIDER_NAME: 5  ← New provider
      fit: 5

   📊 Metadata Sources:
      strava: 138
      PROVIDER_NAME: 5  ← New provider
      intervals: 17
      fit: 5
```

### 7.3 Verify Integrity

```bash
# Check no integrity violations
SELECT COUNT(*) FROM activities 
WHERE is_shell = 1 AND is_valid_for_analytics = 1;
-- Expected: 0

# Check provider activities created
SELECT COUNT(*) FROM activities 
WHERE physiology_source = 'PROVIDER_NAME';
-- Expected: > 0

# Check sources stored
SELECT COUNT(*) FROM activity_sources 
WHERE provider = 'PROVIDER_NAME';
-- Expected: > 0
```

---

## Validation Checklist

Before considering the provider integration complete:

### Code Quality
- [ ] Service exports all required functions
- [ ] Mapper is a pure function (no side effects)
- [ ] No forbidden imports (db.js except tokens, canonicalActivitySelector, etc.)
- [ ] Error handling implemented
- [ ] Logging added for debugging

### Data Integrity
- [ ] All physiology fields mapped
- [ ] All metadata fields mapped
- [ ] `_raw` field included in mapper output
- [ ] Token storage working
- [ ] OAuth flow working

### Testing
- [ ] Contract tests pass
- [ ] Integration tests added
- [ ] Tested with real provider API
- [ ] Tested with mock data
- [ ] Edge cases handled (missing fields, errors, etc.)

### Integration
- [ ] Provider registered in registry
- [ ] Routes added and working
- [ ] Migration run successfully
- [ ] Priority defined in canonical selector
- [ ] Capability matrix documented

### Verification
- [ ] devResetAndReimport runs successfully
- [ ] Source distribution shows provider
- [ ] Integrity checks pass
- [ ] Display classes unchanged
- [ ] Analytics queries work correctly

---

## Common Issues and Solutions

### Issue 1: Provider not registered

**Error:** `Provider 'PROVIDER_NAME' not registered`

**Solution:** Ensure provider is registered in app initialization:
```javascript
import { registerProvider } from './services/providers/providerRegistry.js';
import providerModule from './services/providers/PROVIDER_NAME/index.js';

registerProvider('PROVIDER_NAME', providerModule);
```

### Issue 2: Contract tests failing

**Error:** `Provider 'PROVIDER_NAME' missing required function: listActivities`

**Solution:** Verify all required functions are exported:
- `getAuthUrl`
- `exchangeCodeForTokens`
- `hasValidTokens`
- `listActivities`
- `mapToInternalFormat`
- `detectActivityType`

### Issue 3: Mapper not pure

**Error:** Mapper produces different output on repeated calls

**Solution:** Ensure mapper has no side effects:
- No database calls
- No external API calls
- No state mutations
- Only pure transformations

### Issue 4: Missing _raw field

**Error:** `mapToInternalFormat` output missing `_raw` field

**Solution:** Always include complete provider response:
```javascript
export function mapToInternalFormat(providerActivity) {
  return {
    // ... other fields
    _raw: providerActivity  // REQUIRED
  };
}
```

### Issue 5: Integrity violations after import

**Error:** Post-import verification shows violations

**Solution:** Check:
- Shells not marked as valid
- Valid activities have physiology_source
- No duplicate canonicals
- No orphaned sources

---

## Example: Complete Provider Integration

See `server/services/providers/garmin/` for a complete stub implementation showing:
- Service structure
- Mapper structure
- OAuth flow
- Activity fetching
- Data transformation
- Error handling

---

## Next Steps After Integration

1. **Monitor Production**
   - Watch for API errors
   - Monitor rate limits
   - Track sync performance

2. **Optimize**
   - Add caching if needed
   - Optimize pagination
   - Batch operations

3. **Enhance**
   - Add FIT file download
   - Add stream data
   - Add lap/split data

4. **Document**
   - Update user guide
   - Add troubleshooting docs
   - Document provider quirks

---

## Support

For questions or issues:
1. Review `PROVIDER_INTERFACE.md`
2. Check existing providers (Strava, Intervals)
3. Run contract tests
4. Check `providerSyncRunner.js` logs

**Remember:** The provider is just a data pipeline. All business logic (canonical selection, integrity, analytics) happens in the core services.
