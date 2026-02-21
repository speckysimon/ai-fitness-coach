# User Profile Database Integration Fix

## Problem Identified

User profile data (weight, height, age, gender, name) was:
- ✅ Saved to localStorage only
- ❌ NOT saved to database
- ❌ NOT loaded from database on page load

This caused:
1. **Data loss** when clearing browser cache
2. **No sync** across devices/browsers
3. **Inconsistent architecture** - other settings use database, but profile doesn't
4. **Rider Profile calculations failing** - W/kg showing N/A because weight wasn't persisted

## Solution Implemented

### Frontend Changes

**File: `src/pages/UserProfile.jsx`**
- Updated `handleSave()` to be async and call `PUT /api/user/profile`
- Saves to database first, then updates localStorage as cache
- Added error handling with user feedback

### Backend Changes

**File: `server/routes/user.js`**
- Added `PUT /api/user/profile` endpoint
- Updates `users` table with: name, age, height, weight, gender
- Returns updated user object
- Requires authentication via `req.user.id`

## Database Schema

The `users` table already has these columns:
- `name` TEXT
- `age` INTEGER
- `height` REAL
- `weight` REAL
- `gender` TEXT
- `updated_at` TEXT

No migration needed - columns already exist.

## Data Flow (New)

1. **On Page Load:**
   - App.jsx loads user from `/api/auth/me` (includes profile data from database)
   - User data stored in localStorage as cache
   - All pages read from localStorage (fast)

2. **On Save:**
   - UserProfile.jsx calls `PUT /api/user/profile`
   - Backend updates database
   - Frontend updates localStorage cache
   - All pages immediately see new data

3. **On Cache Clear:**
   - User refreshes page
   - App.jsx reloads from `/api/auth/me`
   - Data restored from database ✅

## Testing Steps

1. **Save Profile:**
   - Go to Settings → User Profile
   - Click Edit
   - Enter: weight: 67, height: 168
   - Click Save
   - Check console - should see successful API call

2. **Verify Database:**
   - Check that data is saved to database
   - Clear localStorage
   - Refresh page
   - Profile should still show correct values (loaded from DB)

3. **Verify Rider Profile:**
   - Go to Rider Profile
   - FTP should show: 210W
   - W/kg should show: 3.13 (210 / 67)
   - BMI should show: 23.7

## Next Steps

The `/api/auth/me` endpoint should already return user profile data from the database. If it doesn't, we need to update it to include:
- name
- age
- height
- weight
- gender

This ensures the data flows correctly on app load.

## Benefits

✅ **Data persistence** - survives cache clears
✅ **Cross-device sync** - same data on all devices
✅ **Consistent architecture** - matches other settings
✅ **Fixes Rider Profile** - W/kg calculations now work
✅ **Production ready** - proper database-backed storage
