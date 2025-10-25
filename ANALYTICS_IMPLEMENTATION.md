# Analytics Implementation Guide

**Status**: ✅ Core implementation complete
**Date**: October 25, 2025
**Provider**: Plausible Analytics (privacy-friendly, GDPR compliant, no cookies)

---

## What's Implemented

### 1. Analytics Infrastructure

**Files Created:**
- `src/lib/analytics.js` - Complete analytics utility with organized tracking methods

**Files Modified:**
- `src/main.jsx` - Initialize analytics on app startup
- `src/App.jsx` - Auto-track page views on route changes
- `index.html` - Plausible script tag added

**Features:**
- ✅ Privacy-friendly (no cookies, GDPR compliant)
- ✅ Automatic page view tracking
- ✅ Custom event tracking
- ✅ Debug mode in development
- ✅ Only active in production
- ✅ Easy to swap providers (Plausible, PostHog, custom)

### 2. Tracking Categories

The analytics utility provides organized tracking methods:

#### **Milestone Tracking** (`trackMilestone`)
- Strava connected
- Profile completed
- First plan generated
- Plan generated (with event type, duration, weeks)
- Plan adjusted
- Activity matched
- Activity manually linked
- Workout analyzed
- Race prediction generated
- Race analysis completed
- Calendar exported
- FTP updated

#### **Feature Usage** (`trackFeature`)
- Dashboard viewed
- Training plan viewed
- Activities viewed
- Race analytics viewed
- Settings viewed
- Today's workout viewed
- Calendar viewed
- Changelog viewed

#### **Error Tracking** (`trackError`)
- Strava auth failed
- Plan generation failed
- Activity fetch failed
- API errors

#### **Engagement** (`trackEngagement`)
- Session started/ended
- Feedback submitted
- Welcome modal completed

#### **Conversion Funnel** (`trackFunnel`)
- Landing page viewed
- Signup started
- Strava connect clicked
- Strava connected
- Profile setup started/completed
- First plan started/completed
- First activity matched

### 3. Currently Tracked Events

**Login/Signup Flow:**
- ✅ Signup started (Login.jsx)
- ✅ Strava connect clicked (Setup.jsx)
- ✅ Strava connected (Setup.jsx)

**Page Views:**
- ✅ All routes automatically tracked

---

## Next Steps: Add Tracking to Key Features

### High Priority (Core User Journey)

1. **ProfileSetup.jsx**
   ```javascript
   import { trackFunnel } from '../lib/analytics';
   
   // On profile setup start
   trackFunnel.profileSetupStarted();
   
   // On profile completion
   trackFunnel.profileSetupCompleted();
   ```

2. **PlanGenerator.jsx**
   ```javascript
   import { trackMilestone, trackFunnel } from '../lib/analytics';
   
   // On first plan generation
   const isFirstPlan = !localStorage.getItem('has_generated_plan');
   if (isFirstPlan) {
     trackFunnel.firstPlanStarted();
     trackMilestone.firstPlanGenerated(eventType, duration);
     localStorage.setItem('has_generated_plan', 'true');
   }
   
   // On any plan generation
   trackMilestone.planGenerated(eventType, duration, weeks.length);
   
   // On plan adjustment
   trackMilestone.planAdjusted(adjustmentType);
   
   // On calendar export
   trackMilestone.calendarExported();
   ```

3. **AllActivities.jsx**
   ```javascript
   import { trackMilestone, trackFunnel } from '../lib/analytics';
   
   // On activity match
   trackMilestone.activityMatched(matchType, confidence);
   
   // On first activity match
   const isFirstMatch = !localStorage.getItem('has_matched_activity');
   if (isFirstMatch) {
     trackFunnel.firstActivityMatched();
     localStorage.setItem('has_matched_activity', 'true');
   }
   
   // On manual link
   trackMilestone.activityManuallyLinked();
   
   // On workout analysis
   trackMilestone.workoutAnalyzed(deviationLevel);
   ```

4. **RaceDayPredictor.jsx**
   ```javascript
   import { trackMilestone } from '../lib/analytics';
   
   // On race prediction generated
   trackMilestone.racePredictionGenerated(raceType);
   ```

5. **PostRaceAnalysis.jsx**
   ```javascript
   import { trackMilestone } from '../lib/analytics';
   
   // On race analysis completed
   trackMilestone.raceAnalysisCompleted(overallScore);
   ```

6. **FTPHistory.jsx**
   ```javascript
   import { trackMilestone } from '../lib/analytics';
   
   // On FTP update
   trackMilestone.ftpUpdated(method); // 'manual', 'activity', 'test'
   ```

### Medium Priority (Feature Usage)

7. **Dashboard.jsx**
   ```javascript
   import { trackFeature } from '../lib/analytics';
   
   useEffect(() => {
     trackFeature.dashboardViewed();
   }, []);
   ```

8. **Settings.jsx**
   ```javascript
   import { trackFeature } from '../lib/analytics';
   
   useEffect(() => {
     trackFeature.settingsViewed();
   }, []);
   ```

9. **TodaysWorkout.jsx**
   ```javascript
   import { trackFeature } from '../lib/analytics';
   
   useEffect(() => {
     trackFeature.todaysWorkoutViewed();
   }, []);
   ```

10. **Calendar.jsx**
    ```javascript
    import { trackFeature } from '../lib/analytics';
    
    useEffect(() => {
      trackFeature.calendarViewed();
    }, []);
    ```

11. **RaceAnalytics.jsx**
    ```javascript
    import { trackFeature } from '../lib/analytics';
    
    useEffect(() => {
      trackFeature.raceAnalyticsViewed();
    }, []);
    ```

### Low Priority (Error Tracking)

12. **Add to API error handlers**
    ```javascript
    import { trackError } from '../lib/analytics';
    
    catch (error) {
      trackError.apiError(endpoint, error);
      // ... existing error handling
    }
    ```

---

## Plausible Dashboard Setup

### 1. Create Plausible Account
1. Go to https://plausible.io
2. Sign up for account
3. Add site: `riderlabs.io`
4. Verify script is installed (already done in index.html)

### 2. Key Metrics to Monitor

**Conversion Funnel:**
1. Landing page viewed
2. Signup started
3. Strava connect clicked
4. Strava connected
5. Profile setup completed
6. First plan generated
7. First activity matched

**Engagement Metrics:**
- Daily active users
- Session duration
- Pages per session
- Feature usage (which features are most used)
- Plan generation frequency
- Activity matching rate

**Product Metrics:**
- Plan generation success rate
- Activity match accuracy
- Race prediction usage
- Post-race analysis completion
- Calendar export rate

**Error Tracking:**
- Strava auth failures
- Plan generation failures
- API errors

### 3. Custom Goals in Plausible

Set up these as goals in Plausible dashboard:
- `Strava Connected` (conversion goal)
- `First Plan Generated` (activation goal)
- `Plan Generated` (engagement goal)
- `Activity Matched` (engagement goal)
- `Race Prediction Generated` (feature usage)
- `Race Analysis Completed` (feature usage)

---

## Usage Examples

### Track a Simple Event
```javascript
import { trackEvent } from '../lib/analytics';

trackEvent('Button Clicked', { button: 'export-calendar' });
```

### Track a Milestone
```javascript
import { trackMilestone } from '../lib/analytics';

trackMilestone.planGenerated('Gran Fondo', '12 weeks', 12);
```

### Track an Error
```javascript
import { trackError } from '../lib/analytics';

try {
  // ... code
} catch (error) {
  trackError.apiError('/api/training/plan', error);
}
```

### Track Feature Usage
```javascript
import { trackFeature } from '../lib/analytics';

useEffect(() => {
  trackFeature.dashboardViewed();
}, []);
```

---

## Privacy & Compliance

**Plausible Analytics is:**
- ✅ GDPR compliant
- ✅ CCPA compliant
- ✅ Cookie-free
- ✅ No personal data collected
- ✅ Lightweight (< 1KB script)
- ✅ Open source
- ✅ EU-hosted option available

**What we track:**
- Page views (URL paths only)
- Custom events (feature usage, conversions)
- Referrer sources
- Browser/device type (aggregated)
- Country (from IP, not stored)

**What we DON'T track:**
- Personal information
- Email addresses
- User IDs
- Cookies
- Cross-site tracking
- IP addresses (not stored)

---

## Testing

### Development Mode
Analytics is disabled in development but logs events to console:
```
[Analytics] Page view: /dashboard
[Analytics] Event: Plan Generated { eventType: 'Gran Fondo', duration: '12 weeks' }
```

### Production Testing
1. Deploy to production
2. Open browser console
3. Check for Plausible script load
4. Perform actions (signup, plan generation, etc.)
5. Check Plausible dashboard (events appear within 1-2 minutes)

---

## Cost

**Plausible Pricing:**
- Free: 30-day trial
- Growth: $9/month (10k pageviews)
- Business: $19/month (100k pageviews)
- Enterprise: Custom pricing

**Estimated Usage:**
- 100 users/day × 10 pages/session = 1,000 pageviews/day
- 30,000 pageviews/month = Growth plan ($9/month)

---

## Alternative Providers

The analytics utility is designed to easily swap providers:

### PostHog (Product Analytics)
```javascript
// In analytics.js, change provider to 'posthog'
const ANALYTICS_CONFIG = {
  provider: 'posthog',
  posthogKey: 'YOUR_KEY',
};
```

### Custom/Self-Hosted
```javascript
// In analytics.js, change provider to 'custom'
const ANALYTICS_CONFIG = {
  provider: 'custom',
  endpoint: 'https://your-analytics.com/track',
};
```

---

## Next Actions

1. ✅ **Complete** - Core infrastructure
2. ✅ **Complete** - Page view tracking
3. ✅ **Complete** - Login/signup tracking
4. ✅ **Complete** - Strava connection tracking
5. ⏳ **Pending** - Add tracking to PlanGenerator
6. ⏳ **Pending** - Add tracking to AllActivities
7. ⏳ **Pending** - Add tracking to race features
8. ⏳ **Pending** - Add feature usage tracking
9. ⏳ **Pending** - Set up Plausible account
10. ⏳ **Pending** - Configure custom goals

**Estimated Time to Complete:** 2-3 hours for remaining tracking implementation

---

## Benefits

**For Product Development:**
- Understand which features users actually use
- Identify drop-off points in user journey
- Measure feature adoption rates
- Prioritize development based on data

**For Growth:**
- Track conversion funnel
- Measure marketing effectiveness
- Identify successful user paths
- Optimize onboarding flow

**For Users:**
- No privacy concerns (GDPR compliant)
- No performance impact (< 1KB script)
- No cookies or tracking
- Transparent data collection
