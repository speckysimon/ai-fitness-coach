# Database Audit Report
**Date:** January 24, 2026, 3:51pm

## Database Architecture ✅ CORRECT

Your application uses **ONE database** for all data:
- **`fitness-coach.db`** - Single source of truth for ALL data

The `database.sqlite` file exists but is **NOT used** by the application (it's a leftover from earlier development).

## Tables in `fitness-coach.db`

### User Authentication & Sessions
- `users` - User accounts
- `sessions` - Active user sessions
- `admin_users` - Admin accounts
- `password_resets` - Password reset tokens

### Activity Sources & Tokens
- `strava_tokens` - Strava OAuth tokens ✅
- `intervals_tokens` - Intervals.icu OAuth tokens ✅
- `google_tokens` - Google Calendar OAuth tokens ✅
- `manual_activities` - Manually entered activities ✅

### Activity Data
- `race_tags` - Race tagging for activities
- `race_analyses` - Post-race analysis data
- `workout_comparisons` - Planned vs actual workout comparisons

### Training Plans
- `training_plans` - Generated training plans
- `plan_adjustments` - AI plan adjustments
- `adaptation_events` - Training adaptations (illness, injury, etc.)

### Wellness & Feedback
- `wellness_log` - Daily wellness check-ins
- `feedback` - User feedback submissions
- `ideas` - Feature ideas

### Configuration & Admin
- `api_keys` - API keys (OpenAI, Gemini, etc.) ✅
- `ai_model_configs` - AI model settings ✅
- `global_settings` - App-wide settings ✅
- `theme_configs` - UI theme configurations ✅
- `coach_personas` - AI coach personalities ✅
- `user_preferences` - User-specific preferences ✅
- `admin_activity_log` - Admin action logs ✅

### Sync State
- `intervals_sync_state` - Intervals.icu sync tracking

## Database Routing ✅ CORRECT

All database operations go through `/server/db.js`:
- Single database connection: `fitness-coach.db`
- All exported database operations use the same `db` instance
- No routing confusion - everything is centralized

## Current Status

### Intervals.icu Connection
- **Database:** Connection cleared (ready for fresh reconnect)
- **Table:** `intervals_tokens` exists with correct schema
- **Operations:** `intervalsTokenDb.upsert()`, `.findByUserId()`, `.delete()` all working

### Issue Identified
The Settings page UI state was out of sync because:
1. You cleared localStorage (frontend state)
2. But the database still had the connection (backend state)
3. The disconnect button tried to delete a connection that was already shown as connected
4. This caused the "Failed to disconnect" error

### Solution Applied
1. ✅ Cleared the database connection manually
2. ✅ Verified all tables are in the correct database
3. ✅ Confirmed no routing issues exist

## Next Steps

1. **Hard refresh Settings page** (Cmd+Shift+R)
2. **Click "Connect Intervals.icu"**
3. **Authorize on Intervals.icu**
4. **Connection will be saved to `fitness-coach.db`**
5. **Dashboard will load activities**

## Database Health: ✅ EXCELLENT

- Single database architecture (no confusion)
- All tables properly created
- All operations centralized through db.js
- No routing issues
- Clean separation of concerns

**Conclusion:** Your database architecture is solid. The issue was just a state sync problem between frontend localStorage and backend database, which has now been resolved.
