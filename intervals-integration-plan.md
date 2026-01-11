# Plan: Integrate Intervals.icu as a data source (multi-user safe)

Below is a concise, implementation-ready plan tailored to your stack (Express server + React client), aligned with Intervals.icu recommendations for multi-user apps.

## IMPORTANT: OAuth Registration Required First

**Before implementation, you must email david@intervals.icu to register your app with:**
- App name
- Description
- Website URL
- Logo image URL (square, at least 128x128)
- Privacy policy URL
- Redirect URI(s)
- Your Intervals.icu ID (found at bottom of /settings page)

**Note:** This is a manual approval process and may take several days. Plan accordingly.

## 1) Auth model and credentials

- **Use OAuth for multi-user apps**
  - Intervals.icu OAuth is required for multi-user apps (per their guidance).
  - Store app credentials in admin DB using existing centralized system (see `CENTRALIZED_CREDENTIALS_GUIDE.md`):
    - `INTERVALS_CLIENT_ID`
    - `INTERVALS_CLIENT_SECRET`
    - `INTERVALS_REDIRECT_URI`
- **Optional: API key mode**
  - Allow advanced users to paste their own Intervals API key in `Settings` as a fallback.
  - Clearly label as "power user" mode; do not share one key across users.

**Key Difference from Strava:** Intervals.icu OAuth does NOT use refresh tokens. Access tokens do not expire.

## 2) Backend: routes, services, storage

- **New route module**: `server/routes/intervals.js`
  - `GET /api/intervals/auth` → create state, build OAuth URL, return it (mirror `server/routes/strava.js`).
  - `GET /api/intervals/callback` → exchange `code` for access token; save to DB; redirect to frontend.
  - `GET /api/intervals/activities` → proxy fetch activities for a user (with date range filters).
  - `POST /api/intervals/disconnect` → delete tokens and pause sync.
- **Token and cursor storage**
  - Extend DB (similar to `stravaTokenDb`, `googleTokenDb`) with `intervalsTokenDb`:
    - Fields: `user_id`, `access_token`, `scopes`, `athlete_id`, `athlete_name`, `created_at`.
    - **NO refresh_token or expires_at needed** - Intervals.icu tokens don't expire.
  - Add `intervalsSyncStateDb`:
    - Fields: `user_id`, `last_synced_date`, `backfill_complete`.
- **Service layer**: `server/services/intervalsService.js`
  - Functions: `getActivities`, `getActivity`, `getPlannedWorkouts` (if used), `mapIntervalsToAppSchema`.
  - **NO refreshToken function needed** - tokens don't expire.
  - Implement robust mapping to your current activity shape used in `AllActivities.jsx`, `Dashboard.jsx`, etc.
  - Use date-based filtering: `oldest=YYYY-MM-DD&newest=YYYY-MM-DD` (not Unix timestamps).
- **Mount routes** in `server/index.js`
  - `app.use('/api/intervals', intervalsRoutes);`

## 3) Data model and mapping

- **Field mapping**
  - Map Intervals.icu activity fields (distance, duration, power, HR, TSS/IF equivalents, timestamps) to your internal schema.
  - Normalize units and timestamps to UTC consistently.
- **Activity identity**
  - Preserve the Intervals.icu `id` in a `source_id` column and set `source='intervals'` for de-duplication across providers.
- **Planned vs completed**
  - If you import planned workouts for calendar features, tag them as planned and keep separate from completed activities.

## 4) Sync strategy (multi-user friendly)

- **Initial import**
  - On first connect, backfill last 6-12 months using date ranges (e.g., `oldest=2024-01-01&newest=2024-12-31`).
  - Save `last_synced_date` and mark `backfill_complete` when done.
- **Incremental sync**
  - Poll using date filters: fetch activities from `last_synced_date` to today.
  - Schedule lightweight syncs via cron (e.g., daily or every few hours) and user-triggered on-demand sync from UI.
  - **No pagination parameters** - Intervals.icu uses date ranges only, no page/per_page.
- **Rate limit & retries**
  - Intervals.icu has lenient rate limits (not documented like Strava's strict limits).
  - Start with simple rate limiting: 1 request/second per user, adjust based on monitoring.
  - Use exponential backoff on 429/5xx, surface user-friendly error flags to UI.
  - **No token refresh needed** - tokens don't expire, so no `requiresReauth` pattern needed.
- **Partial failures**
  - Upsert activities individually and continue on per-item errors.
  - Log failures with enough context for reprocessing.

## 5) Frontend updates

- **Provider selection**
  - In `src/pages/Setup.jsx` and `src/pages/Settings.jsx`, add “Connect Intervals.icu” alongside Strava.
  - Allow selecting preferred data source: `Strava | Intervals.icu`.
  - Show connect/disconnect state and last sync timestamp.
- **UI actions**
  - “Connect Intervals.icu” → calls `GET /api/intervals/auth?session_token=...`.
  - “Disconnect” → call server to delete tokens and pause sync for that provider.
  - “Sync now” → trigger incremental sync endpoint; show progress and any rate-limit warnings.
- **Data source abstraction**
  - Introduce a provider-agnostic fetch in the client, or let the server unify activities so UI pages (`AllActivities.jsx`, `Dashboard.jsx`) don’t need provider-specific code.
  - Ensure filters and charts work identically regardless of source.

## 6) Admin and configuration

- **Admin credentials**
  - Add Intervals OAuth client credentials to your admin key loader (akin to `apiKeyLoader.cjs`) and secure storage path described in `CENTRALIZED_CREDENTIALS_GUIDE.md`.
- **Environment**
  - Update `.env.example` with Intervals variables and `FRONTEND_URL` callback path.
- **Scopes**
  - Request: `ACTIVITY:READ,WELLNESS:READ` (comma-separated, uppercase with colon).
  - Available scopes: ACTIVITY, WELLNESS, CALENDAR, CHATS, LIBRARY, SETTINGS (each with :READ or :WRITE).
  - Use minimal scopes - only request what you need.

## 7) Security and privacy

- **Token handling**
  - Encrypt at rest if possible (or at least limit access). Never log tokens.
  - **No token refresh needed** - tokens don't expire.
  - Handle 401/403 by prompting user to reconnect (rare, only if token is manually revoked).
- **Multi-user isolation**
  - All requests must be tied to `sessionDb` like Strava/Google flows in `server/routes/auth.js`.
  - Never reuse a single API key across users.
- **Athlete ID**
  - Can use `0` in API paths to reference the token owner's athlete ID automatically.

## 8) Testing and validation

- **Sandbox/limited accounts**
  - Use a test Intervals account to validate OAuth and data mapping.
- **Unit tests**
  - Add tests for `intervalsService` mapping and pagination.
- **Integration tests**
  - End-to-end: connect → initial backfill → incremental sync → disconnect.

## 9) Rollout and migration

- **Phased rollout**
  - Feature flag in `.env` or admin setting: `ENABLE_INTERVALS=1`.
  - Early adopters first; monitor logs and rate limits.
- **Migration**
  - If a user switches from Strava to Intervals.icu:
    - Keep existing activities and mark new ones `source='intervals'`.
    - De-duplicate by timestamp and metrics tolerance if both sources overlap.

## 10) Documentation and support

- **Update docs**
  - `README.md`, `SETUP_GUIDE.md`, and `API_DOCS.md` with:
    - How to configure Intervals OAuth.
    - How to connect/disconnect.
    - Data privacy notes and scopes used.
- **User messaging**
  - In UI, add short helper text describing Intervals.icu integration, with a link to their privacy and API guidance.

---

## Summary: Key Differences from Strava

| Feature | Strava | Intervals.icu |
|---------|--------|---------------|
| **OAuth Registration** | Self-service | Manual email approval |
| **Refresh Tokens** | Required, expire regularly | ❌ Not used - tokens don't expire |
| **Token Refresh Logic** | Complex refresh flow needed | ❌ Not needed - simpler! |
| **Rate Limits** | Strict (100/15min, 1000/day) | Lenient (not documented) |
| **Activity Pagination** | `page`, `per_page`, `before`, `after` | Date ranges only: `oldest`, `newest` |
| **Date Format** | Unix timestamps | ISO date strings (YYYY-MM-DD) |
| **Athlete ID** | Must specify exact ID | Can use `0` for token owner |
| **API Base URL** | `https://www.strava.com/api/v3` | `https://intervals.icu/api/v1` |

## Implementation Simplifications

✅ **Simpler than Strava:**
- No token refresh endpoint or logic needed
- No expires_at tracking required
- Lenient rate limiting (start with 1 req/sec)
- Can use `0` for athlete ID in all endpoints

⚠️ **Considerations:**
- Manual OAuth app approval (plan for lead time)
- Different API endpoint structure (date-based, not timestamp-based)
- Field mapping will differ from Strava schema

## Next Steps

1. **Email david@intervals.icu** with OAuth registration details (see `intervals-oauth-registration-email.md`)
2. **Wait for approval** (may take several days)
3. **Add credentials** to admin panel once received
4. **Implement routes** following Strava pattern but removing refresh logic
5. **Test with personal account** before expanding to club/users
