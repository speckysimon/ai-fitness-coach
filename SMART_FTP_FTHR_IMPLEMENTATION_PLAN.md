# Smart FTP/FTHR Calculation & Form Page Fix - Implementation Plan

## 🎯 Objectives

1. **Implement training-load-aware FTP/FTHR calculation**
2. **Fix Form & Fitness page graphs not displaying data**

---

## 📋 Current Issues Identified

### **Issue 1: Form & Fitness Page - No Graph Data**

**Root Cause:**
- CTL/ATL calculated from scratch with no historical baseline
- Exponentially weighted averages need 42+ days of history to stabilize
- Starting from zero makes first 6 weeks of data meaningless

**Current Code Problem:**
```javascript
// Line 174-180 in Form.jsx
const prevATL = i < timeRange - 1 ? dailyData[dailyData.length - 1]?.atl || 0 : 0;
const atl = prevATL + atlDecay * (dailyTSS - prevATL);

const prevCTL = i < timeRange - 1 ? dailyData[dailyData.length - 1]?.ctl || 0 : 0;
const ctl = prevCTL + ctlDecay * (dailyTSS - prevCTL);
```

**Problem:** Starts from 0, needs historical baseline

### **Issue 2: FTP Calculation - Not Training-Load Aware**

**Current:** Simple 6-week best effort
**Needed:** Consider training gaps, CTL trends, consistency

---

## 🔧 Solution 1: Fix Form & Fitness Page

### **Approach: Calculate CTL/ATL with Proper Historical Baseline**

```javascript
const processFormData = async (activities, tokensToUse) => {
  // 1. Get ALL activities (or at least 90 days) for proper baseline
  const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
  
  const allActivitiesResponse = await fetch(
    `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${ninetyDaysAgo}&per_page=200`
  );
  const allActivities = await allActivitiesResponse.json();
  
  // 2. Calculate CTL/ATL from 90 days ago to today
  const dailyData = [];
  const today = startOfDay(new Date());
  
  // Start from 90 days ago to build proper baseline
  for (let i = 89; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayActivities = allActivities.filter(a => {
      const activityDate = format(new Date(a.date), 'yyyy-MM-dd');
      return activityDate === dateStr;
    });
    
    const dailyTSS = dayActivities.reduce((sum, a) => sum + calculateTSS(a, ftp), 0);
    
    // Exponentially weighted averages with proper history
    const atlDecay = 2 / (7 + 1);
    const prevATL = dailyData.length > 0 ? dailyData[dailyData.length - 1].atl : 0;
    const atl = prevATL + atlDecay * (dailyTSS - prevATL);
    
    const ctlDecay = 2 / (42 + 1);
    const prevCTL = dailyData.length > 0 ? dailyData[dailyData.length - 1].ctl : 0;
    const ctl = prevCTL + ctlDecay * (dailyTSS - prevCTL);
    
    const tsb = ctl - atl;
    
    dailyData.push({
      date: dateStr,
      dateLabel: format(date, 'MMM d'),
      tss: dailyTSS,
      atl: Math.round(atl * 10) / 10,
      ctl: Math.round(ctl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      fitness: Math.round(ctl),
      fatigue: Math.round(atl),
      form: Math.round(tsb),
    });
  }
  
  // 3. Return only the requested time range for display
  const displayData = dailyData.slice(-timeRange);
  setFormData(displayData);
  setCurrentMetrics(displayData[displayData.length - 1]);
};
```

---

## 🔧 Solution 2: Smart FTP/FTHR Calculation

### **New Service: smartMetricsService.js**

```javascript
class SmartMetricsService {
  
  /**
   * Calculate FTP with training load awareness
   */
  calculateSmartFTP(activities, lastKnownFTP = null) {
    // 1. Analyze training context
    const context = this.analyzeTrainingContext(activities);
    
    console.log('[Smart FTP] Context:', {
      ctlTrend: context.ctlTrend,
      weeklyTSS: context.weeklyTSS,
      hasGaps: context.hasRecentGap,
      hardEfforts: context.hardEfforts
    });
    
    // 2. Determine calculation window based on context
    let windowDays = 42; // Default 6 weeks
    
    if (context.hasRecentGap) {
      windowDays = 28; // 4 weeks if recent gap
      console.log('[Smart FTP] Recent training gap detected, using 4-week window');
    } else if (context.ctlChange < -0.15) {
      windowDays = 28; // 4 weeks if CTL declining
      console.log('[Smart FTP] CTL declining, using 4-week window');
    }
    
    // 3. Find hard efforts in adaptive window
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    
    const recentActivities = activities.filter(a => 
      new Date(a.date) >= cutoffDate && a.avgPower > 0
    );
    
    const hardEfforts = this.findHardEfforts(recentActivities);
    
    // 4. Handle case: No hard efforts but training continues
    if (hardEfforts.length < 3 && context.trainingConsistent) {
      console.log('[Smart FTP] No hard efforts, but training consistent');
      return {
        ftp: lastKnownFTP,
        confidence: 'medium',
        method: 'maintained_by_ctl',
        message: `Training load stable (${Math.round(context.weeklyTSS)} TSS/week). FTP likely maintained.`,
        recommendation: 'Do a 20-min test to confirm current FTP',
        context
      };
    }
    
    // 5. Handle case: No hard efforts and reduced training
    if (hardEfforts.length < 3 && !context.trainingConsistent) {
      const estimatedDecline = Math.min(Math.abs(context.ctlChange) * 0.7, 0.15);
      console.log('[Smart FTP] Reduced training, estimating decline:', estimatedDecline);
      
      return {
        ftp: lastKnownFTP ? Math.round(lastKnownFTP * (1 - estimatedDecline)) : null,
        confidence: 'low',
        method: 'estimated_decline',
        message: `Training load declined ${Math.round(Math.abs(context.ctlChange) * 100)}%. Estimated FTP decline.`,
        recommendation: 'Do a 20-min test when training resumes',
        context
      };
    }
    
    // 6. Normal calculation from hard efforts
    return this.calculateFromHardEfforts(hardEfforts, context);
  }
  
  /**
   * Analyze training context (CTL, gaps, consistency)
   */
  analyzeTrainingContext(activities) {
    const last6Weeks = this.filterByDays(activities, 42);
    const last12Weeks = this.filterByDays(activities, 84);
    
    // Calculate CTL
    const currentCTL = this.calculateCTL(last6Weeks);
    const previous6WeeksCTL = this.calculateCTL(
      last12Weeks.filter(a => {
        const daysAgo = (new Date() - new Date(a.date)) / (1000 * 60 * 60 * 24);
        return daysAgo >= 42 && daysAgo < 84;
      })
    );
    
    const ctlChange = previous6WeeksCTL > 0 
      ? (currentCTL - previous6WeeksCTL) / previous6WeeksCTL 
      : 0;
    
    // Detect training gaps
    const gaps = this.detectGaps(last6Weeks);
    const hasRecentGap = gaps.some(g => g.days > 14);
    
    // Find hard efforts
    const hardEfforts = this.findHardEfforts(last6Weeks);
    
    // Calculate weekly TSS
    const weeklyTSS = this.calculateWeeklyTSS(last6Weeks);
    
    return {
      currentCTL: Math.round(currentCTL),
      previous6WeeksCTL: Math.round(previous6WeeksCTL),
      ctlChange: Math.round(ctlChange * 100) / 100,
      ctlTrend: ctlChange < -0.10 ? 'declining' : 
                ctlChange > 0.10 ? 'improving' : 'stable',
      hasRecentGap,
      gaps,
      hardEfforts: hardEfforts.length,
      weeklyTSS: Math.round(weeklyTSS),
      trainingConsistent: !hasRecentGap && weeklyTSS > 200
    };
  }
  
  /**
   * Calculate CTL (Chronic Training Load) - 42-day exponentially weighted average
   */
  calculateCTL(activities) {
    if (activities.length === 0) return 0;
    
    // Sort by date
    const sorted = activities.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let ctl = 0;
    const decay = 2 / (42 + 1);
    
    sorted.forEach(activity => {
      const tss = this.calculateTSS(activity);
      ctl = ctl + decay * (tss - ctl);
    });
    
    return ctl;
  }
  
  /**
   * Detect training gaps (>7 days)
   */
  detectGaps(activities) {
    if (activities.length < 2) return [];
    
    const sorted = activities.sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / (1000 * 60 * 60 * 24);
      
      if (daysBetween > 7) {
        gaps.push({
          start: sorted[i-1].date,
          end: sorted[i].date,
          days: Math.round(daysBetween)
        });
      }
    }
    
    return gaps;
  }
  
  /**
   * Find hard efforts (20-60 min at high intensity)
   */
  findHardEfforts(activities) {
    return activities.filter(a => {
      if (!a.avgPower || a.avgPower < 100) return false;
      if (a.duration < 1200 || a.duration > 3600) return false; // 20-60 min
      
      // High power relative to duration
      const power = a.normalizedPower || a.avgPower;
      return power > 200; // Minimum threshold
    });
  }
  
  /**
   * Calculate weekly TSS average
   */
  calculateWeeklyTSS(activities) {
    if (activities.length === 0) return 0;
    
    const totalTSS = activities.reduce((sum, a) => sum + this.calculateTSS(a), 0);
    const daysSpan = (new Date() - new Date(Math.min(...activities.map(a => new Date(a.date))))) / (1000 * 60 * 60 * 24);
    const weeks = daysSpan / 7;
    
    return weeks > 0 ? totalTSS / weeks : 0;
  }
  
  /**
   * Calculate TSS for an activity
   */
  calculateTSS(activity, ftp = null) {
    if (!activity.duration) return 0;
    
    const durationHours = activity.duration / 3600;
    
    // Power-based TSS
    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return Math.round(durationHours * intensityFactor * intensityFactor * 100);
    }
    
    // HR-based estimation
    if (activity.avgHeartRate) {
      const estimatedIntensity = activity.avgHeartRate / 170;
      return Math.round(durationHours * estimatedIntensity * estimatedIntensity * 100);
    }
    
    // Duration-based fallback
    const typeMultipliers = {
      'Ride': 1.0, 'VirtualRide': 1.0, 'Run': 1.2, 'Workout': 0.8, 'default': 0.7
    };
    const multiplier = typeMultipliers[activity.type] || typeMultipliers.default;
    return Math.round(durationHours * 60 * multiplier);
  }
  
  /**
   * Calculate FTP from hard efforts
   */
  calculateFromHardEfforts(hardEfforts, context) {
    if (hardEfforts.length === 0) return { ftp: null, confidence: 'none' };
    
    // Sort by power descending
    const sorted = hardEfforts.sort((a, b) => 
      (b.normalizedPower || b.avgPower) - (a.normalizedPower || a.avgPower)
    );
    
    // Take top 3
    const topEfforts = sorted.slice(0, Math.min(3, sorted.length));
    const avgPower = topEfforts.reduce((sum, a) => sum + (a.normalizedPower || a.avgPower), 0) / topEfforts.length;
    const avgDuration = topEfforts.reduce((sum, a) => sum + a.duration, 0) / topEfforts.length;
    
    // Duration-based multiplier (research-backed)
    let multiplier = 0.95; // Default for 20-30 min
    if (avgDuration >= 3000) multiplier = 1.00; // 50-60 min
    else if (avgDuration >= 2400) multiplier = 0.99; // 40-50 min
    else if (avgDuration >= 1800) multiplier = 0.98; // 30-40 min
    
    const ftp = Math.round(avgPower * multiplier);
    
    return {
      ftp,
      confidence: topEfforts.length >= 3 ? 'high' : 'medium',
      method: 'hard_efforts',
      effortsUsed: topEfforts.length,
      avgDuration: Math.round(avgDuration / 60),
      context
    };
  }
  
  filterByDays(activities, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return activities.filter(a => new Date(a.date) >= cutoff);
  }
}

export const smartMetricsService = new SmartMetricsService();
```

---

## 📊 Implementation Steps

### **Step 1: Fix Form & Fitness Page (Priority 1)**

1. Update `processFormData` to fetch 90 days of activities
2. Calculate CTL/ATL from day 1 with proper baseline
3. Display only requested time range
4. Add loading state for longer calculation

### **Step 2: Create Smart Metrics Service (Priority 2)**

1. Create `/server/services/smartMetricsService.js`
2. Implement CTL calculation
3. Implement gap detection
4. Implement adaptive window logic

### **Step 3: Update FTP Endpoint (Priority 3)**

1. Add `/api/analytics/smart-ftp` endpoint
2. Use smart metrics service
3. Return context and confidence

### **Step 4: Update FTHR Service (Priority 4)**

1. Keep 12-week window for FTHR
2. Add training load context
3. Similar smart logic for FTHR

---

## ✅ Expected Results

### **Form & Fitness Page:**
- ✅ Graphs display properly
- ✅ CTL/ATL values realistic
- ✅ TSB (Form) calculated correctly
- ✅ All time ranges work (6w, 12w, 24w)

### **Smart FTP:**
- ✅ Detects training gaps
- ✅ Adjusts window based on CTL
- ✅ Maintains FTP if training consistent
- ✅ Estimates decline if training reduced
- ✅ Provides confidence levels

### **Smart FTHR:**
- ✅ Uses 12-week window
- ✅ More stable than FTP
- ✅ Training-load aware
- ✅ Confidence levels

---

## 🎯 Next Steps

1. **Implement Form & Fitness fix first** (immediate user value)
2. **Create smart metrics service** (foundation)
3. **Update FTP calculation** (use smart service)
4. **Update FTHR calculation** (use smart service)
5. **Test thoroughly** with real data

This is a significant enhancement that will make the app much smarter and more accurate!
