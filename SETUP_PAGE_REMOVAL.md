# Setup Page Removal - October 3, 2025

## Summary
Removed the `/setup` page and replaced it with an in-app notification on the Dashboard that prompts users to connect Strava via Settings.

## Problem
The Setup page had a loopback issue with the Strava OAuth callback, even though the Settings page worked correctly.

## Solution
- **Removed** the Setup page entirely (`/setup` route)
- **Added** a prominent notification banner on the Dashboard when Strava is not connected
- **Updated** all navigation flows to go directly to Dashboard instead of Setup

## Changes Made

### 1. Removed Setup Page Route
**File:** `src/App.jsx`
- Removed import of `Setup` component
- Removed `/setup` route
- Updated Login redirect from `/setup` to `/`

### 2. Updated Navigation Flows
**Files:** `src/pages/Login.jsx`, `src/pages/ProfileSetup.jsx`
- Login now redirects to `/` (Dashboard) instead of `/setup`
- ProfileSetup redirects to `/` instead of `/setup`
- Removed conditional logic that checked for Strava tokens before redirecting

### 3. Added Strava Notification to Dashboard
**File:** `src/pages/Dashboard.jsx`

Added a prominent notification banner that:
- **Shows** when user has no Strava tokens connected
- **Displays** at the top of the Dashboard with orange gradient styling
- **Includes** a "Connect Strava" button that navigates to Settings
- **Includes** a "Dismiss" button that hides the notification for the session
- **Persists** across page refreshes until dismissed (uses sessionStorage)

#### Notification Features:
```javascript
// State management
const [showStravaNotification, setShowStravaNotification] = useState(false);

// Check on mount and when tokens change
useEffect(() => {
  if (stravaTokens) {
    setShowStravaNotification(false);
  } else {
    const dismissed = sessionStorage.getItem('strava_notification_dismissed');
    if (!dismissed) {
      setShowStravaNotification(true);
    }
  }
}, [stravaTokens]);
```

## User Flow

### New User Registration
```
1. Visit app → Redirected to /login
2. Click "Sign up" → Register account
3. Redirected to /profile-setup
4. Complete profile (or skip)
5. Redirected to / (Dashboard)
6. See Strava notification banner
7. Click "Connect Strava" → Navigate to /settings
8. Connect Strava via Settings page
9. Return to Dashboard with tokens loaded
```

### Existing User Login
```
1. Visit app → Redirected to /login
2. Enter credentials → Login
3. Redirected to / (Dashboard)
4. If no Strava tokens → See notification banner
5. If has Strava tokens → Dashboard loads normally
```

### Strava Connection via Settings
```
1. User on Dashboard without Strava
2. Click "Connect Strava" in notification
3. Navigate to /settings
4. Click "Connect" button for Strava
5. OAuth flow completes successfully
6. Tokens saved to database
7. Return to Dashboard
8. Notification automatically hidden
9. Dashboard loads activities
```

## Benefits

### ✅ Simplified Flow
- No separate setup page to maintain
- Single source of truth for OAuth (Settings page)
- Cleaner navigation structure

### ✅ Better UX
- Users can skip Strava connection and explore the app
- Notification is non-blocking but visible
- Can dismiss notification if not ready to connect
- Clear call-to-action button

### ✅ Eliminated Loopback Issue
- Setup page OAuth callback had issues
- Settings page OAuth works perfectly
- Now only using the working implementation

### ✅ Consistent Pattern
- All service connections managed in Settings
- Matches user expectations (settings = connections)
- Easier to add more integrations in future

## Technical Details

### Notification Styling
- **Gradient background:** Orange theme matching Strava branding
- **Border:** 2px orange border for prominence
- **Shadow:** Medium shadow for depth
- **Icon:** Activity icon from lucide-react
- **Buttons:** Primary orange button + outline dismiss button

### State Management
- Uses `sessionStorage` to persist dismissal within session
- Resets on browser close/new session
- Automatically hidden when Strava tokens present

### Responsive Design
- Flexbox layout adapts to mobile screens
- Buttons stack on small screens
- Text remains readable at all sizes

## Files Modified

1. **src/App.jsx**
   - Removed Setup import and route
   - Updated Login redirect

2. **src/pages/Login.jsx**
   - Changed redirect from `/setup` to `/`

3. **src/pages/ProfileSetup.jsx**
   - Changed redirect from `/setup` to `/`

4. **src/pages/Dashboard.jsx**
   - Added notification state
   - Added notification banner component
   - Added dismissal logic

## Files Unchanged (No Longer Used)

- **src/pages/Setup.jsx** - Still exists but not imported/used
  - Can be safely deleted in future cleanup

## Testing Checklist

- [x] New user registration → Dashboard → See notification
- [x] Click "Connect Strava" → Navigate to Settings
- [x] Connect Strava in Settings → Works correctly
- [x] Return to Dashboard → Notification hidden
- [x] Dismiss notification → Hidden for session
- [x] Refresh page → Notification stays dismissed
- [x] Close browser → New session shows notification again
- [x] Login with Strava connected → No notification shown

## Migration Notes

### For Existing Users
- No action required
- Users with Strava already connected see no changes
- Users without Strava will see the new notification

### For New Users
- Clearer onboarding flow
- Can explore app before connecting Strava
- Obvious prompt to connect when ready

## Future Improvements

- [ ] Add similar notifications for Google Calendar
- [ ] Add "Don't show again" option (localStorage)
- [ ] Add animation when notification appears
- [ ] Add progress indicator for OAuth flow
- [ ] Consider adding notification to other pages

---

**Status:** ✅ Complete  
**Date:** October 3, 2025  
**Version:** 2.1.0
