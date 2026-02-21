# Provider Interface Contract

**Version:** 1.0  
**Last Updated:** February 17, 2026  
**Purpose:** Strict interface contract for all activity data providers

---

## Core Principles

**CRITICAL RULES:**

1. ❌ **NO DATABASE WRITES** - Providers MUST NOT import or use `db.js`
2. ❌ **NO CANONICAL LOGIC** - Providers MUST NOT decide merge/create/upgrade actions
3. ❌ **NO ANALYTICS LOGIC** - Providers MUST NOT filter or determine analytics inclusion
4. ✅ **FETCH ONLY** - Providers only fetch and transform data
5. ✅ **PURE FUNCTIONS** - Mappers must be pure transformation functions

---

## Required Exports

Every provider module MUST export these functions:

### Service Functions

```typescript
/**
 * Get OAuth authorization URL
 * @param {number} userId - User ID
 * @param {string} redirectUri - OAuth callback URL
 * @returns {string} Authorization URL
 */
export function getAuthUrl(userId: number, redirectUri: string): string;

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code
 * @param {number} userId - User ID
 * @returns {Promise<TokenResult>} Token result
 */
export async function exchangeCodeForTokens(
  code: string, 
  userId: number
): Promise<TokenResult>;

/**
 * Check if user has valid tokens
 * @param {number} userId - User ID
 * @returns {boolean} True if tokens are valid
 */
export function hasValidTokens(userId: number): boolean;

/**
 * List activities from provider
 * CRITICAL: This is the main data fetching function
 * @param {number} userId - User ID
 * @param {ListOptions} options - Fetch options
 * @returns {Promise<ListResult>} Activities list
 */
export async function listActivities(
  userId: number, 
  options: ListOptions
): Promise<ListResult>;
```

### Mapper Functions

```typescript
/**
 * Map provider activity to internal format
 * CRITICAL: Must be a pure function (no side effects)
 * @param {any} providerActivity - Raw provider activity
 * @returns {InternalActivity} Mapped activity
 */
export function mapToInternalFormat(providerActivity: any): InternalActivity;

/**
 * Detect activity type
 * @param {any} providerActivity - Raw provider activity
 * @returns {string} Activity type
 */
export function detectActivityType(providerActivity: any): string;
```

---

## Type Definitions

### TokenResult

```typescript
interface TokenResult {
  ok: boolean;
  error?: string;
  message?: string;
}
```

### ListOptions

```typescript
interface ListOptions {
  after?: Date;      // Fetch activities after this date
  before?: Date;     // Fetch activities before this date
  limit?: number;    // Max activities to fetch
  cursor?: string;   // Pagination cursor (provider-specific)
}
```

### ListResult

```typescript
interface ListResult {
  ok: boolean;
  activities: any[];      // Raw provider activities
  cursor?: string;        // Next page cursor
  hasMore?: boolean;      // More pages available
  error?: string;         // Error message if ok=false
  providerStats?: {       // Optional provider-specific stats
    total?: number;
    fetched?: number;
    skipped?: number;
  };
}
```

### InternalActivity

```typescript
interface InternalActivity {
  // Provider metadata
  provider_id: string;    // REQUIRED: Provider's activity ID
  
  // Metadata fields
  name: string;           // REQUIRED
  description?: string;
  sport: string;          // REQUIRED: 'cycling', 'running', 'swimming', etc.
  type: string;           // REQUIRED: 'Ride', 'Run', 'Swim', etc.
  start_time: string;     // REQUIRED: ISO 8601 format
  timezone_offset_min?: number;
  
  // Physiology fields
  duration_s: number;     // REQUIRED
  distance_m?: number;
  elevation_m?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  tss?: number;
  avg_hr?: number;
  max_hr?: number;
  avg_cadence?: number;
  avg_speed?: number;
  max_speed?: number;
  calories?: number;
  
  // Flags
  has_power: boolean;     // REQUIRED
  
  // Raw payload (for debugging/reprocessing)
  _raw: any;              // REQUIRED: Complete provider response
}
```

---

## Forbidden Actions

Providers MUST NOT:

❌ Import `db.js` or any database module
❌ Import `canonicalActivitySelector.js`
❌ Import `activityUpdateService.js`
❌ Import `analyticsQueryBuilder.js`
❌ Call `db.prepare()` or any database function
❌ Decide merge/create/upgrade logic
❌ Filter activities for analytics
❌ Modify display classes
❌ Store tokens outside designated token tables

---

## Allowed Dependencies

Providers MAY import:

✅ Node.js built-in modules (fs, path, crypto, etc.)
✅ HTTP clients (fetch, axios, etc.)
✅ OAuth libraries
✅ FIT file parsers
✅ Date/time utilities
✅ Logging utilities

---

## Implementation Pattern

### Service Module Structure

```javascript
// server/services/providers/providerName/providerNameService.js

// ✅ ALLOWED: HTTP client
import fetch from 'node-fetch';

// ✅ ALLOWED: Token storage (via designated table)
import db from '../../../db.js';  // ONLY for token table access

// ❌ FORBIDDEN: Do not import these
// import { importActivity } from '../../activityImportOrchestrator.js';
// import { selectOrCreateCanonicalActivity } from '../../canonicalActivitySelector.js';

const PROVIDER_API_BASE = 'https://api.provider.com';

export function getAuthUrl(userId, redirectUri) {
  // Build OAuth URL
  return `${PROVIDER_API_BASE}/oauth/authorize?...`;
}

export async function exchangeCodeForTokens(code, userId) {
  // Exchange code for tokens
  // Store in provider_tokens table
  return { ok: true };
}

export function hasValidTokens(userId) {
  // Check provider_tokens table
  const tokens = db.prepare(`
    SELECT access_token FROM provider_tokens WHERE user_id = ?
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

### Mapper Module Structure

```javascript
// server/services/providers/providerName/providerNameMapper.js

// ✅ PURE FUNCTION: No side effects, no imports needed

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
  return 'provider_native';
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

## Integration Flow

Providers are integrated via `providerSyncRunner`:

```javascript
// Providers DO NOT call this - the sync runner does
import { syncProviderActivities } from './providers/providerSyncRunner.js';

const result = await syncProviderActivities({
  userId: 1,
  providerId: 'garmin',
  after: new Date('2026-01-01'),
  limit: 100
});

// Result includes:
// - importStats (from orchestrator)
// - integrity (from verifyPostImport)
// - providerStats (from provider.listActivities)
```

**Flow:**
1. `providerSyncRunner` calls `provider.listActivities()`
2. Runner maps each activity via `provider.mapToInternalFormat()`
3. Runner calls `importActivityBatch()` via orchestrator
4. Runner calls `verifyPostImport()` (mandatory)
5. Runner returns combined results

---

## Validation Checklist

Before registering a provider, verify:

- [ ] Exports `getAuthUrl()`
- [ ] Exports `exchangeCodeForTokens()`
- [ ] Exports `hasValidTokens()`
- [ ] Exports `listActivities()`
- [ ] Exports `mapToInternalFormat()`
- [ ] Exports `detectActivityType()`
- [ ] `listActivities()` returns `ListResult` shape
- [ ] `mapToInternalFormat()` returns `InternalActivity` shape
- [ ] `mapToInternalFormat()` includes `_raw` field
- [ ] `mapToInternalFormat()` is a pure function
- [ ] Does NOT import `db.js` (except for token table)
- [ ] Does NOT import `canonicalActivitySelector.js`
- [ ] Does NOT import `activityUpdateService.js`
- [ ] Does NOT import `analyticsQueryBuilder.js`
- [ ] Does NOT call database functions outside token table
- [ ] Passes contract tests

---

## Contract Tests

Every provider MUST pass these tests:

```javascript
// server/tests/providerContract.test.js

describe('Provider Contract - ProviderName', () => {
  it('exports required service functions');
  it('exports required mapper functions');
  it('listActivities returns correct shape');
  it('mapToInternalFormat returns correct shape');
  it('mapToInternalFormat includes _raw field');
  it('does not import forbidden modules');
});
```

---

## Example: Minimal Provider

```javascript
// Minimal valid provider implementation

export function getAuthUrl(userId, redirectUri) {
  return 'https://provider.com/oauth';
}

export async function exchangeCodeForTokens(code, userId) {
  return { ok: true };
}

export function hasValidTokens(userId) {
  return false;  // Stub
}

export async function listActivities(userId, options = {}) {
  return {
    ok: true,
    activities: [],  // Empty for stub
    hasMore: false
  };
}

export function mapToInternalFormat(activity) {
  return {
    provider_id: String(activity.id),
    name: activity.name,
    sport: 'cycling',
    type: 'Ride',
    start_time: activity.start_date,
    duration_s: activity.duration || 0,
    has_power: false,
    _raw: activity
  };
}

export function detectActivityType(activity) {
  return 'provider_native';
}
```

---

## Summary

**DO:**
- Fetch data from provider API
- Transform to internal format
- Return structured results
- Store tokens in designated table
- Be a pure data pipeline

**DON'T:**
- Write to activities table
- Decide merge/upgrade logic
- Filter for analytics
- Import forbidden modules
- Have side effects in mappers

**REMEMBER:**
The provider is just a data fetcher and transformer. All business logic (canonical selection, integrity, analytics) happens in the orchestrator and core services.
