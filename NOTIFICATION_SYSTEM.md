# Workout Notification System

## Overview

Complete notification system that sends personalized workout reminders based on coach personas. Athletes receive notifications on their phone and computer before scheduled workouts.

## Features Implemented

### 1. Notification Service (`src/lib/notificationService.js`)

**Core Functionality:**
- Browser notification permission handling
- Notification preferences management
- Coach persona-based message generation
- **Dual reminders: Main reminder (4h default) + Nutrition reminder (2h)**
- Quiet hours support
- Key workout filtering
- Test notification capability

**Notification Preferences:**
```javascript
{
  enabled: false,                    // Master toggle
  workoutReminders: true,            // Workout notifications
  reminderHours: 4,                  // Hours before workout
  quietHoursStart: 22,               // 10 PM
  quietHoursEnd: 7,                  // 7 AM
  notifyOnlyKeyWorkouts: false,      // Only hard sessions
}
```

**Coach-Specific Messages:**
Each coach persona has 3 unique message templates for both main reminders and nutrition reminders:

**Main Workout Reminders (4h default):**
- **Coach Alex (Motivator)**: "Let's go! Your 90min endurance ride is coming up in 4h. Ready to crush it? 🔥"
- **Coach Jordan (Analytical)**: "Workout scheduled: Endurance Ride in 4h (90min). Optimal preparation window. 📊"
- **Coach Sam (Supportive)**: "Hey there! Your 90min workout is in 4h. Remember to hydrate and fuel up. 💙"
- **Coach Taylor (Strategic)**: "Strategic reminder: Endurance Ride in 4h. This 90min session builds toward your goal. 🎯"
- **Coach Morgan (Experienced)**: "Pro tip: Endurance Ride in 4h. 90min well spent builds champions. 🏆"

**Nutrition Reminders (2h before):**
- **Coach Alex (Motivator)**: "Fuel up, champ! Endurance Ride in 2h. Time to eat and hydrate for peak performance! 🍌💧"
- **Coach Jordan (Analytical)**: "T-minus 2 hours: Endurance Ride. Optimal nutrition window. 200-300 calories + 500ml water recommended. 📊"
- **Coach Sam (Supportive)**: "Gentle reminder: Endurance Ride in 2h. Take a moment to eat something light and drink water. You've got this! 💙"
- **Coach Taylor (Strategic)**: "Pre-workout strategy: Endurance Ride in 2h. Nutrition timing is key. Fuel now for optimal performance. 🎯"
- **Coach Morgan (Experienced)**: "Pro tip: Endurance Ride in 2h. Never start a 90min workout on empty. Eat light, hydrate well. 🏆"

### 2. Workout Reminder Manager (`src/lib/workoutReminderManager.js`)

**Automatic Checking:**
- Runs every 5 minutes when enabled
- Checks training plan for upcoming workouts
- **Sends TWO notifications per workout:**
  - **Nutrition reminder at 2 hours before** (eat & hydrate)
  - **Main reminder at configured time** (default 4 hours before)
- Tracks notified sessions to prevent duplicates
- Respects quiet hours and preferences

**Smart Logic:**
- Sends nutrition reminder 2 hours before every workout
- Sends main reminder at user-configured time (1-24 hours)
- Only notifies once per reminder type
- Skips completed workouts
- Filters by workout type if configured
- Auto-starts when notifications enabled
- Uses different notification tags to allow both to show

### 3. Notification Settings Component (`src/components/NotificationSettings.jsx`)

**User Interface:**
- Permission request button
- Enable/disable toggle
- Reminder timing selector (1-24 hours)
- Quiet hours configuration
- Key workouts only toggle
- Test notification button
- Live preview of coach messages

**Settings Location:**
- Accessible via Settings page (`/settings`)
- Appears after Coach Avatar Selector
- Full dark mode support

### 4. Notification Prompt (`src/components/NotificationPrompt.jsx`)

**Dashboard Banner:**
- Shows on Dashboard if notifications not enabled
- Coach-personalized message
- One-click enable button
- Dismissible (hides for 7 days)
- Auto-hides if permission denied or already enabled

### 5. Service Worker (`public/sw.js`)

**PWA Support:**
- Handles push notifications
- Offline caching
- Notification click handling
- Opens app to `/workout/today` on click
- Background sync ready (future)

**Notification Actions:**
- "View Workout" - Opens workout page
- "Dismiss" - Closes notification

### 6. PWA Manifest (`public/manifest.json`)

**Progressive Web App:**
- Installable on mobile devices
- Standalone app mode
- Shortcuts to Today's Workout and Dashboard
- Theme color: #2563EB (RiderLabs blue)

## User Flow

### First Time Setup

1. **User visits Dashboard**
   - Sees notification prompt banner with their coach's avatar
   - "Never Miss a Workout! 🔔"

2. **User clicks "Enable Notifications"**
   - Browser permission dialog appears
   - User grants permission
   - Redirected to Settings page

3. **User configures preferences**
   - Choose reminder timing (4 hours default)
   - Set quiet hours (10 PM - 7 AM default)
   - Toggle key workouts only (optional)
   - Send test notification

4. **System starts monitoring**
   - Reminder manager checks every 5 minutes
   - Notifications sent automatically

### Daily Usage

1. **Morning (or configured time)**
   - User receives notification: "🎯 Coach Taylor: Strategic reminder: Threshold Intervals in 4h..."
   - Click notification → Opens to `/workout/today`

2. **View workout details**
   - Full session description
   - Duration, zones, targets
   - Zwift recommendations

3. **Complete workout**
   - Mark as completed in app
   - No more reminders for that session

## Technical Implementation

### Notification Flow

```
Training Plan → Reminder Manager → Notification Service → Browser API → User Device
                     ↓
              Check every 5 min
                     ↓
         Calculate reminder time (session time - X hours)
                     ↓
              Generate coach message
                     ↓
           Check quiet hours & preferences
                     ↓
              Send notification
```

### Storage

**LocalStorage:**
- `notification_preferences` - User settings
- `notification_permission` - Permission status
- `notification_prompt_dismissed` - Banner dismiss timestamp
- `selected_coach` - Coach persona ID

**Session Tracking:**
- In-memory Set of notified session IDs
- Format: `${date}-${title}`
- Prevents duplicate notifications

### Browser Support

**Desktop:**
- ✅ Chrome/Edge (full support)
- ✅ Firefox (full support)
- ✅ Safari (limited - no service worker push)

**Mobile:**
- ✅ Android Chrome (full support + PWA)
- ✅ Android Firefox (full support)
- ⚠️ iOS Safari (limited - no background notifications)
- ⚠️ iOS Chrome (uses Safari engine - same limitations)

**Note:** iOS requires the app to be added to home screen for notifications to work reliably.

## Configuration Options

### Reminder Timing
- 1 hour before
- 2 hours before
- 3 hours before
- **4 hours before** (default)
- 6 hours before
- 12 hours before
- 24 hours before

### Quiet Hours
- Default: 22:00 (10 PM) to 07:00 (7 AM)
- Configurable per user
- Supports overnight ranges

### Notification Types
- All workouts (default)
- Key workouts only (threshold, VO2max, race, long)

## Testing

### Manual Testing

1. **Enable notifications:**
   ```
   1. Go to Dashboard
   2. Click "Enable Notifications" in banner
   3. Grant permission in browser dialog
   ```

2. **Send test notification:**
   ```
   1. Go to Settings
   2. Scroll to "Workout Reminders"
   3. Click "Send Test Notification"
   4. Check notification appears
   ```

3. **Test with real workout:**
   ```
   1. Create training plan with workout in 4 hours
   2. Enable notifications
   3. Wait for notification (or adjust reminder time to 1 hour for faster testing)
   ```

### Console Testing

```javascript
// Check notification support
import { isNotificationSupported } from './src/lib/notificationService';
console.log('Supported:', isNotificationSupported());

// Check permission
import { getNotificationPermission } from './src/lib/notificationService';
console.log('Permission:', getNotificationPermission());

// Send test notification
import { sendTestNotification } from './src/lib/notificationService';
await sendTestNotification();

// Check reminder manager status
import { workoutReminderManager } from './src/lib/workoutReminderManager';
console.log('Status:', workoutReminderManager.getStatus());

// Manually trigger check
workoutReminderManager.checkUpcomingWorkouts();
```

## Future Enhancements

### Phase 2 (Optional)

1. **Push Notifications (Server-side)**
   - Backend push notification service
   - Works even when app closed
   - Requires VAPID keys and push subscription

2. **Smart Timing**
   - Learn user's preferred workout times
   - Adjust reminder timing automatically
   - Weather-aware notifications

3. **Rich Notifications**
   - Show workout preview in notification
   - Quick actions (mark complete, reschedule)
   - Progress indicators

4. **Notification History**
   - View past notifications
   - Notification analytics
   - Engagement tracking

5. **Multiple Reminders**
   - First reminder: 24h before
   - Second reminder: 4h before
   - Final reminder: 30min before

6. **Custom Notification Sounds**
   - Different sounds per coach
   - Custom sound upload
   - Silent mode option

## Troubleshooting

### Notifications not appearing

**Check:**
1. Browser permission granted? (Settings → Site Settings → Notifications)
2. Notifications enabled in app? (Settings → Workout Reminders)
3. Quiet hours active? (Check time vs quiet hours setting)
4. Training plan exists with future workouts?
5. Browser notifications not blocked by OS?

**iOS Specific:**
- Add app to home screen first
- Grant notification permission when prompted
- Keep app in background (don't force close)

### Notifications appearing too early/late

**Solution:**
- Adjust "Reminder Time" in Settings
- Default is 4 hours before workout
- Can set from 1-24 hours

### Wrong coach messages

**Solution:**
- Change coach in Settings → Choose Your Coach
- Messages update immediately
- Send test notification to verify

## Files Created/Modified

### New Files
- `src/lib/notificationService.js` - Core notification logic
- `src/lib/workoutReminderManager.js` - Automatic reminder checking
- `src/components/NotificationSettings.jsx` - Settings UI
- `src/components/NotificationPrompt.jsx` - Dashboard banner
- `public/sw.js` - Service worker
- `public/manifest.json` - PWA manifest
- `NOTIFICATION_SYSTEM.md` - This documentation

### Modified Files
- `src/pages/Settings.jsx` - Added NotificationSettings component
- `src/pages/Dashboard.jsx` - Added NotificationPrompt component
- `src/main.jsx` - Service worker registration
- `index.html` - PWA manifest link

## Integration with Existing Features

### Coach Personas
- Uses existing `src/lib/coachPersonas.js`
- Each coach has unique notification style
- Messages match coach personality

### Training Plans
- Reads from `localStorage.getItem('training_plan')`
- Checks all weeks and sessions
- Respects completion status

### Timezone Support
- Uses existing timezone utilities
- Respects user's local time
- Accurate reminder timing

### Dark Mode
- Full dark mode support in all components
- Follows app theme automatically

## Performance

**Resource Usage:**
- Checks every 5 minutes (minimal CPU)
- In-memory session tracking (minimal RAM)
- No network requests (all local)
- Service worker cached (fast loading)

**Battery Impact:**
- Negligible on desktop
- Minimal on mobile (5min interval)
- No background sync (yet)

## Privacy

**Data Storage:**
- All preferences stored locally
- No server-side tracking
- No notification content sent to servers
- User controls all settings

**Permissions:**
- Only requests notification permission
- No location, camera, or microphone
- Can revoke anytime in browser settings

## Summary

Complete notification system with:
- ✅ Browser notification support
- ✅ Coach persona integration
- ✅ Configurable preferences
- ✅ Quiet hours
- ✅ Service worker + PWA
- ✅ Dashboard prompt
- ✅ Settings UI
- ✅ Test notifications
- ✅ Automatic reminders
- ✅ Dark mode support
- ✅ Mobile-friendly

**Status:** Ready for production use
**Estimated Development Time:** 3-4 hours
**User Benefit:** Never miss a workout, increased training adherence
