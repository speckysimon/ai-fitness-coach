# Provider Interface

This directory contains provider integrations for external activity data sources (Garmin, Wahoo, etc.).

---

## Architecture Contract

**CRITICAL:** All providers MUST follow the RiderLabs integration contract:

1. ✅ Use `activityImportOrchestrator` for ALL imports
2. ✅ Let `canonicalActivitySelector` decide merge/create/upgrade actions
3. ✅ Use `activityUpdateService` for ALL writes to activities table
4. ✅ Store raw payloads in `activity_sources`
5. ✅ Call `verifyPostImport()` after every import
6. ✅ Preserve display classes (use `activityDisplayClassAdapter`)

---

## Provider Interface

Every provider MUST implement the following interface:

### Service Functions

```javascript
/**
 * Get OAuth authorization URL
 * @param {number} userId - User ID
 * @param {string} redirectUri - OAuth callback URL
 * @returns {string} Authorization URL
 */
export function getAuthUrl(userId, redirectUri);

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token data
 */
export async function exchangeCodeForTokens(code, userId);

/**
 * Refresh access token
 * @param {number} userId - User ID
 * @returns {Promise<Object>} New token data
 */
export async function refreshAccessToken(userId);

/**
 * Check if user has valid tokens
 * @param {number} userId - User ID
 * @returns {boolean} True if tokens are valid
 */
export function hasValidTokens(userId);

/**
 * Fetch activities list
 * @param {number} userId - User ID
 * @param {Object} options - Fetch options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @param {number} options.limit - Max activities per page
 * @returns {Promise<Array>} Raw provider activities
 */
export async function fetchActivities(userId, options);

/**
 * Sync activities for user
 * CRITICAL: MUST use importActivityBatch() and verifyPostImport()
 * @param {number} userId - User ID
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} { importStats, integrity }
 */
export async function syncActivities(userId, options);
```

### Mapper Functions

```javascript
/**
 * Map provider activity to internal format
 * @param {Object} providerActivity - Raw provider activity
 * @returns {Object} Internal format activity
 */
export function mapToInternalFormat(providerActivity);

/**
 * Detect activity type
 * @param {Object} providerActivity - Raw provider activity
 * @returns {string} Activity type (e.g., 'garmin_native', 'fit')
 */
export function detectActivityType(providerActivity);
```

---

## Internal Format Specification

All mappers MUST transform provider data to this format:

```javascript
{
  // Provider metadata
  provider_id: string,  // Required
  
  // Metadata fields
  name: string,  // Required
  description: string | null,
  sport: string,  // 'cycling', 'running', 'swimming', etc.
  type: string,  // 'Ride', 'Run', 'Swim', etc.
  start_time: string,  // ISO 8601 format
  timezone_offset_min: number,
  
  // Physiology fields
  duration_s: number,  // Required
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
  
  // Raw (for debugging/reprocessing)
  _raw: object  // Complete provider response
}
```

---

## Sync Function Template

Every provider's sync function MUST follow this pattern:

```javascript
import { importActivityBatch, verifyPostImport } from '../activityImportOrchestrator.js';
import { mapToInternalFormat, detectActivityType } from './providerMapper.js';

export async function syncProviderActivities(userId, options = {}) {
  // 1. Check tokens
  if (!hasValidTokens(userId)) {
    return {
      ok: false,
      error: 'NO_VALID_TOKENS',
      message: 'User needs to authorize connection'
    };
  }
  
  // 2. Fetch activities from provider
  const rawActivities = await fetchActivities(userId, options);
  
  // 3. Map to internal format
  const mappedActivities = rawActivities.map(mapToInternalFormat);
  
  // 4. Import through orchestrator (REQUIRED)
  const importResults = await importActivityBatch({
    userId,
    provider: 'provider_name',
    activities: mappedActivities,
    typeDetector: detectActivityType
  });
  
  // 5. Verify integrity (REQUIRED)
  const integrity = await verifyPostImport(userId);
  
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

---

## Database Schema

Each provider needs a tokens table:

```sql
CREATE TABLE IF NOT EXISTS provider_tokens (
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

---

## Testing Requirements

Every provider MUST have tests for:

1. **OAuth Flow**
   - Generate auth URL
   - Exchange code for tokens
   - Refresh expired tokens

2. **Activity Fetching**
   - Fetch activities list
   - Handle pagination
   - Handle API errors

3. **Mapping**
   - Map all physiology fields
   - Map all metadata fields
   - Handle missing fields

4. **Import Integration**
   - Create new activities
   - Attach to existing activities
   - Respect source-of-truth rules
   - Run post-import verification

5. **Integrity**
   - Pass integrity checks
   - No invalid states

6. **Display Stability**
   - Display classes unchanged

See `server/tests/providerIntegration.template.test.js` for complete template.

---

## File Structure

```
server/services/providers/
├── README.md (this file)
├── garminService.js
├── garminMapper.js
├── wahooService.js
├── wahooMapper.js
└── ... (future providers)
```

---

## Common Mistakes to Avoid

❌ **DON'T:**
- Bypass `activityImportOrchestrator`
- Write directly to `activities` table
- Skip `verifyPostImport()`
- Implement custom merge logic
- Change display classes

✅ **DO:**
- Use `importActivityBatch()` for all imports
- Store raw payloads in `activity_sources`
- Call `verifyPostImport()` after every import
- Follow the internal format specification
- Test thoroughly

---

## Support

For integration help:
1. Read `docs/PROVIDER_INTEGRATION_PLAYBOOK.md`
2. Review existing providers (Strava, Intervals)
3. Use test template
4. Check orchestrator documentation

**Remember:** The architecture enforces data integrity. Follow the contract strictly.
