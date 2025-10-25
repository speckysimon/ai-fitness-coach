/**
 * Analytics utility for tracking user behavior and product usage
 * Privacy-friendly, GDPR compliant, no cookies
 * 
 * Supports multiple providers:
 * - Plausible (default, privacy-focused)
 * - PostHog (product analytics)
 * - Custom (self-hosted)
 */

const ANALYTICS_CONFIG = {
  enabled: import.meta.env.PROD, // Only in production
  provider: 'plausible', // 'plausible' | 'posthog' | 'custom'
  plausibleDomain: 'riderlabs.io',
  debug: import.meta.env.DEV, // Log events in development
};

/**
 * Initialize analytics
 * Call this once in main.jsx
 */
export function initAnalytics() {
  if (!ANALYTICS_CONFIG.enabled) {
    console.log('[Analytics] Disabled in development');
    return;
  }

  // Plausible is loaded via script tag in index.html
  if (ANALYTICS_CONFIG.provider === 'plausible') {
    console.log('[Analytics] Plausible initialized');
  }
}

/**
 * Track a page view
 * @param {string} path - Page path (e.g., '/dashboard')
 */
export function trackPageView(path) {
  if (ANALYTICS_CONFIG.debug) {
    console.log('[Analytics] Page view:', path);
  }

  if (!ANALYTICS_CONFIG.enabled) return;

  if (ANALYTICS_CONFIG.provider === 'plausible' && window.plausible) {
    window.plausible('pageview', { props: { path } });
  }
}

/**
 * Track a custom event
 * @param {string} eventName - Event name (e.g., 'Plan Generated')
 * @param {object} properties - Event properties
 */
export function trackEvent(eventName, properties = {}) {
  if (ANALYTICS_CONFIG.debug) {
    console.log('[Analytics] Event:', eventName, properties);
  }

  if (!ANALYTICS_CONFIG.enabled) return;

  if (ANALYTICS_CONFIG.provider === 'plausible' && window.plausible) {
    window.plausible(eventName, { props: properties });
  }
}

/**
 * Track user journey milestones
 */
export const trackMilestone = {
  stravaConnected: () => trackEvent('Strava Connected'),
  profileCompleted: () => trackEvent('Profile Completed'),
  firstPlanGenerated: (eventType, duration) => 
    trackEvent('First Plan Generated', { eventType, duration }),
  planGenerated: (eventType, duration, weeksCount) => 
    trackEvent('Plan Generated', { eventType, duration, weeks: weeksCount }),
  planAdjusted: (adjustmentType) => 
    trackEvent('Plan Adjusted', { type: adjustmentType }),
  activityMatched: (matchType, confidence) => 
    trackEvent('Activity Matched', { type: matchType, confidence }),
  activityManuallyLinked: () => trackEvent('Activity Manually Linked'),
  workoutAnalyzed: (deviationLevel) => 
    trackEvent('Workout Analyzed', { deviation: deviationLevel }),
  racePredictionGenerated: (raceType) => 
    trackEvent('Race Prediction Generated', { raceType }),
  raceAnalysisCompleted: (overallScore) => 
    trackEvent('Race Analysis Completed', { score: overallScore }),
  calendarExported: () => trackEvent('Calendar Exported'),
  ftpUpdated: (method) => trackEvent('FTP Updated', { method }),
};

/**
 * Track feature usage
 */
export const trackFeature = {
  dashboardViewed: () => trackEvent('Dashboard Viewed'),
  planViewed: () => trackEvent('Training Plan Viewed'),
  activitiesViewed: () => trackEvent('Activities Viewed'),
  raceAnalyticsViewed: () => trackEvent('Race Analytics Viewed'),
  settingsViewed: () => trackEvent('Settings Viewed'),
  todaysWorkoutViewed: () => trackEvent('Todays Workout Viewed'),
  calendarViewed: () => trackEvent('Calendar Viewed'),
  changelogViewed: () => trackEvent('Changelog Viewed'),
};

/**
 * Track errors and issues
 */
export const trackError = {
  stravaAuthFailed: (error) => 
    trackEvent('Strava Auth Failed', { error: error.message }),
  planGenerationFailed: (error) => 
    trackEvent('Plan Generation Failed', { error: error.message }),
  activityFetchFailed: (error) => 
    trackEvent('Activity Fetch Failed', { error: error.message }),
  apiError: (endpoint, error) => 
    trackEvent('API Error', { endpoint, error: error.message }),
};

/**
 * Track user engagement
 */
export const trackEngagement = {
  sessionStarted: () => trackEvent('Session Started'),
  sessionEnded: (duration) => trackEvent('Session Ended', { duration }),
  feedbackSubmitted: (rating, category) => 
    trackEvent('Feedback Submitted', { rating, category }),
  welcomeModalCompleted: (clicks) => 
    trackEvent('Welcome Modal Completed', { clicks }),
};

/**
 * Track conversion funnel
 */
export const trackFunnel = {
  landingViewed: () => trackEvent('Landing Page Viewed'),
  signupStarted: () => trackEvent('Signup Started'),
  stravaConnectClicked: () => trackEvent('Strava Connect Clicked'),
  stravaConnected: () => trackEvent('Strava Connected'),
  profileSetupStarted: () => trackEvent('Profile Setup Started'),
  profileSetupCompleted: () => trackEvent('Profile Setup Completed'),
  firstPlanStarted: () => trackEvent('First Plan Started'),
  firstPlanCompleted: () => trackEvent('First Plan Completed'),
  firstActivityMatched: () => trackEvent('First Activity Matched'),
};

export default {
  init: initAnalytics,
  trackPageView,
  trackEvent,
  milestone: trackMilestone,
  feature: trackFeature,
  error: trackError,
  engagement: trackEngagement,
  funnel: trackFunnel,
};
