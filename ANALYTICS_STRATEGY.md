# Analytics Strategy for Initial User Testing

**Last Updated:** November 7, 2025  
**Status:** Ready for implementation

---

## Current State ✅

You already have **Plausible Analytics** implemented with:
- ✅ Page view tracking
- ✅ Custom event tracking
- ✅ Milestone tracking (Strava connected, plan generated, etc.)
- ✅ Feature usage tracking
- ✅ Error tracking
- ✅ Conversion funnel tracking
- ✅ Privacy-friendly (GDPR compliant, no cookies)

**Location:** `src/lib/analytics.js`

---

## Recommendation: Stick with Plausible + Add PostHog

### **Why This Combo?**

**Plausible (Keep):**
- ✅ Already implemented
- ✅ Privacy-friendly (no GDPR consent needed)
- ✅ Simple, fast, lightweight
- ✅ Great for traffic and conversions
- ✅ $9/month for 10k pageviews

**PostHog (Add):**
- ✅ Product analytics (user behavior)
- ✅ Session recordings (watch users struggle)
- ✅ Feature flags (A/B testing)
- ✅ Heatmaps (where users click)
- ✅ **FREE for <1M events/month**
- ✅ Self-hostable (privacy-friendly)

---

## Quick Implementation Plan (2-3 hours)

### **Phase 1: Add PostHog (1 hour)**

**1. Install PostHog**
```bash
npm install posthog-js
```

**2. Update `src/lib/analytics.js`**
```javascript
import posthog from 'posthog-js';

const ANALYTICS_CONFIG = {
  enabled: import.meta.env.PROD,
  plausible: true,  // Keep Plausible
  posthog: true,    // Add PostHog
  plausibleDomain: 'riderlabs.io',
  posthogKey: import.meta.env.VITE_POSTHOG_KEY,
  posthogHost: 'https://app.posthog.com',
  debug: import.meta.env.DEV,
};

export function initAnalytics() {
  // Initialize Plausible (already done via script tag)
  
  // Initialize PostHog
  if (ANALYTICS_CONFIG.posthog && ANALYTICS_CONFIG.posthogKey) {
    posthog.init(ANALYTICS_CONFIG.posthogKey, {
      api_host: ANALYTICS_CONFIG.posthogHost,
      autocapture: false, // Manual tracking only
      capture_pageview: false, // We handle this
      disable_session_recording: false, // Enable recordings
    });
  }
}

export function trackEvent(eventName, properties = {}) {
  // Plausible
  if (ANALYTICS_CONFIG.plausible && window.plausible) {
    window.plausible(eventName, { props: properties });
  }
  
  // PostHog
  if (ANALYTICS_CONFIG.posthog && posthog) {
    posthog.capture(eventName, properties);
  }
}
```

**3. Add to `.env`**
```
VITE_POSTHOG_KEY=your_project_key_here
```

---

### **Phase 2: Critical Events to Track (1 hour)**

Add these events to understand user behavior:

#### **User Onboarding**
```javascript
// Already tracked:
- Signup Started ✅
- Strava Connected ✅
- Profile Setup Completed ✅

// Add these:
- Onboarding Abandoned (user left during setup)
- Onboarding Time (how long setup took)
```

#### **Core Feature Usage**
```javascript
// Add these:
- Plan Generation Started (button clicked)
- Plan Generation Time (how long AI took)
- Plan Generation Abandoned (user left before complete)
- Plan Regenerated (how often users regenerate)
- Plan Adjusted (adaptive plan usage)
- Session Completed (user marked workout as done)
- Session Skipped (user skipped workout)
```

#### **Engagement Metrics**
```javascript
// Add these:
- Daily Active User (user visited today)
- Weekly Active User (user visited this week)
- Session Duration (how long users stay)
- Pages Per Session (how many pages viewed)
- Return Visit (user came back after 1 day)
```

#### **Drop-off Points**
```javascript
// Add these:
- Dashboard Loaded But No Plan (user stuck)
- Plan Generated But Not Used (user didn't follow plan)
- Strava Connected But No Activities (user has no data)
- Settings Opened But Not Saved (user confused)
```

---

### **Phase 3: Build Events Dashboard (1 hour)**

Create an admin page to view all tracked events.

**File:** `src/pages/admin/AnalyticsDashboard.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BarChart, Users, Activity, TrendingUp } from 'lucide-react';

const AnalyticsDashboard = () => {
  const [events, setEvents] = useState([]);
  
  // Fetch from PostHog API or your own backend
  useEffect(() => {
    // Load event data
  }, []);
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">127</div>
            <p className="text-sm text-gray-500">+12 this week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Plans Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">89</div>
            <p className="text-sm text-gray-500">70% conversion</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg Session Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8m 34s</div>
            <p className="text-sm text-gray-500">+2m vs last week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Return Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">42%</div>
            <p className="text-sm text-gray-500">Users come back</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border-b">
                <span className="font-medium">{event.name}</span>
                <span className="text-sm text-gray-500">{event.count} times</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
```

---

## Critical Metrics for Beta Testing

### **1. Activation Metrics (Did they get value?)**
- ✅ Strava connected
- ✅ First plan generated
- ✅ First activity matched
- ⏱️ Time to first value (<10 minutes ideal)

### **2. Engagement Metrics (Are they using it?)**
- 📊 Daily Active Users (DAU)
- 📊 Weekly Active Users (WAU)
- 📊 Sessions per user per week
- 📊 Features used per session

### **3. Retention Metrics (Do they come back?)**
- 📊 Day 1 retention (came back next day)
- 📊 Day 7 retention (came back after a week)
- 📊 Day 30 retention (still using after a month)

### **4. Drop-off Metrics (Where do they quit?)**
- 🚨 Signup started but not completed
- 🚨 Strava connect clicked but not completed
- 🚨 Plan generation started but abandoned
- 🚨 Dashboard visited but no action taken

---

## What to Track for Each User Journey

### **New User Onboarding**
```
1. Landing Page Viewed
2. Signup Started
3. Account Created
4. Strava Connect Clicked
5. Strava Connected ✅ (ACTIVATION!)
6. Profile Setup Started
7. Profile Setup Completed
8. Dashboard Viewed
9. First Plan Started
10. First Plan Generated ✅ (VALUE!)
```

**Drop-off points to watch:**
- Between step 2-3 (signup form issues?)
- Between step 4-5 (Strava auth confusing?)
- Between step 9-10 (plan generation too slow?)

### **Returning User Engagement**
```
1. Login
2. Dashboard Viewed
3. Today's Workout Viewed
4. Session Completed ✅ (ENGAGEMENT!)
5. Activity Matched ✅ (ENGAGEMENT!)
6. Return Next Day ✅ (RETENTION!)
```

---

## PostHog Features to Use

### **1. Session Recordings** (Most Valuable!)
Watch real users navigate your app:
- See where they get confused
- Identify UI bugs you missed
- Watch them struggle with forms
- See what they click on

**Enable for:**
- First 10 sessions of every new user
- Any session with errors
- Any session where user abandons onboarding

### **2. Feature Flags**
Test features with small groups:
```javascript
if (posthog.isFeatureEnabled('new-plan-ui')) {
  // Show new UI
} else {
  // Show old UI
}
```

**Use for:**
- New AI coach personas
- New plan generation UI
- Team race strategy (when ready)

### **3. Funnels**
Track conversion through key flows:
```
Signup Funnel:
Landing → Signup → Strava → Profile → First Plan
Current: 100% → 80% → 60% → 50% → 40%
Goal: 100% → 90% → 80% → 75% → 70%
```

### **4. Cohort Analysis**
Compare user groups:
- Users who connected Strava vs didn't
- Users who generated plan vs didn't
- Users from week 1 vs week 2

---

## Quick Wins (Do These First)

### **Week 1: Basic Tracking**
1. ✅ Add PostHog (1 hour)
2. ✅ Track critical events (1 hour)
3. ✅ Enable session recordings (5 minutes)
4. ✅ Set up basic dashboard (1 hour)

### **Week 2: Watch & Learn**
1. 👀 Watch 20 session recordings
2. 📊 Identify top 3 drop-off points
3. 🐛 Fix obvious bugs
4. 💡 List UX improvements

### **Week 3: Optimize**
1. 🎯 A/B test fixes for drop-offs
2. 📈 Measure improvement
3. 🔄 Iterate

---

## Events to Add Right Now

Update `src/lib/analytics.js` with these:

```javascript
export const trackMilestone = {
  // Existing events...
  
  // Add these:
  onboardingAbandoned: (step) => 
    trackEvent('Onboarding Abandoned', { step }),
  onboardingCompleted: (duration) => 
    trackEvent('Onboarding Completed', { duration }),
  planGenerationStarted: () => 
    trackEvent('Plan Generation Started'),
  planGenerationAbandoned: (reason) => 
    trackEvent('Plan Generation Abandoned', { reason }),
  sessionCompleted: (sessionType, duration) => 
    trackEvent('Session Completed', { type: sessionType, duration }),
  sessionSkipped: (sessionType, reason) => 
    trackEvent('Session Skipped', { type: sessionType, reason }),
  returnVisit: (daysSinceLastVisit) => 
    trackEvent('Return Visit', { days: daysSinceLastVisit }),
  featureDiscovered: (featureName) => 
    trackEvent('Feature Discovered', { feature: featureName }),
};
```

---

## Cost Breakdown

**Plausible:**
- $9/month for 10k pageviews
- $19/month for 100k pageviews

**PostHog:**
- FREE for <1M events/month
- $0.00045 per event after that
- Session recordings included

**Total for beta (100 users):**
- Plausible: $9/month
- PostHog: $0/month
- **Total: $9/month**

---

## Recommended: Plausible + PostHog

**Why both?**
- Plausible = Simple traffic analytics (show to investors)
- PostHog = Deep product analytics (understand users)
- Both privacy-friendly
- Total cost: $9/month
- Can drop one later if needed

**Alternative: PostHog only**
- Can do everything Plausible does
- Saves $9/month
- But Plausible has nicer public dashboards

---

## Action Plan

**Today (2 hours):**
1. Sign up for PostHog (free)
2. Add PostHog to `analytics.js`
3. Deploy to production
4. Enable session recordings

**This Week:**
1. Watch first 10 user sessions
2. Identify top 3 issues
3. Fix critical bugs
4. Add missing events

**Next Week:**
1. Build analytics dashboard
2. Set up funnels
3. Start A/B testing

---

## Questions to Answer with Analytics

1. **Where do users drop off?**
   - Signup form? Strava auth? Plan generation?

2. **What features do users actually use?**
   - Dashboard? Training plan? Race predictor?

3. **How long until users get value?**
   - Time from signup to first plan generated?

4. **Do users come back?**
   - Day 1, 7, 30 retention rates?

5. **What causes confusion?**
   - Watch session recordings to see struggles

6. **Which users are most engaged?**
   - Cohort analysis by signup date, features used

---

## Summary

**Recommendation:** Add PostHog to existing Plausible setup

**Time:** 2-3 hours total
**Cost:** $9/month (just Plausible)
**Value:** Understand exactly how users behave

**Most Important:**
1. ✅ Session recordings (watch users struggle)
2. ✅ Funnel tracking (find drop-offs)
3. ✅ Event tracking (measure everything)

**Start with:** PostHog session recordings. Watch 10 users and you'll learn more than 100 surveys.
