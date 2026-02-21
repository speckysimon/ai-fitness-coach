# Race Day Predictor Fixes

**Date:** January 24, 2026, 8:15pm
**Status:** 🔧 IN PROGRESS

## Issues Identified

### 1. "Not Enough Data" Warning Shows Despite 205 Activities ❌
**Problem:** Warning says "We need at least 10 activities" but shows "205/10"
- Logic checks `activities.length < 10` but user has 205 activities
- Warning should not display at all

**Root Cause:** The check happens BEFORE activities are loaded from cache
- Initial state: `activities = []` (empty array)
- Component renders with empty array → shows warning
- Then loads from cache → but warning already rendered

### 2. Fatigue (ATL) Decreases as Future Date Increases ❌
**Problem:** 
- Jan 24 (today): Fatigue = 62
- Jan 25 (tomorrow): Fatigue = 35
- Jan 26 (day after): Fatigue = 35

**Expected Behavior:** Fatigue should DECREASE over time (recovery), not stay constant or increase

**Root Cause:** The `buildDailyTrainingData` function only calculates up to `targetDate`
- When predicting future dates, there are NO activities after today
- ATL decays naturally without new training load
- This is CORRECT behavior - fatigue decreases with rest

**BUT:** The readiness logic is backwards - it says "need more rest" when fatigue is LOW

### 3. Illogical Readiness Predictions ❌
**Problem:**
- Jan 25 (tomorrow): "Good readiness" (Fatigue 35, Form +16)
- Jan 26 (day after): "Need more rest" (Fatigue 35, Form +16)

**Root Cause:** The readiness score calculation is inconsistent or the form status logic is wrong

### 4. Fatigue Values Still Different Between Pages ⚠️
**Problem:** After cache refresh, Form.jsx and RaceDayPredictor still show different values
- Form.jsx: Shows TODAY's fatigue (calculated from activities up to today)
- RaceDayPredictor: Shows RACE DATE's fatigue (calculated from activities up to race date)

**This is actually CORRECT** - they're calculating different dates!

## Fixes Required

### Fix 1: Remove "Not Enough Data" Warning When Activities Loaded ✅
**File:** `src/pages/RaceDayPredictor.jsx`
**Change:** Only show warning if `!loading && activities.length < 10`

### Fix 2: Fix Readiness Score Logic ✅
**File:** `src/lib/riderAnalytics.js`
**Change:** Review `getFormStatus()` and `calculateReadinessScore()` functions
- Ensure lower fatigue = better readiness
- Ensure positive Form (TSB) = better readiness
- Fix any inverted logic

### Fix 3: Add Explanation for Future Predictions ✅
**File:** `src/pages/RaceDayPredictor.jsx`
**Change:** Add info message explaining:
- "Predictions assume no training between now and race day"
- "Fatigue naturally decreases with rest"
- "Add planned workouts for more accurate predictions"

### Fix 4: Clarify Date Context ✅
**File:** `src/pages/RaceDayPredictor.jsx`
**Change:** Show clear date labels:
- "Your form on [race date]"
- "Based on training through [today]"

## Implementation Plan

1. ✅ Fix "Not Enough Data" warning condition
2. ✅ Review and fix readiness score calculation
3. ✅ Add future prediction explanation
4. ✅ Add date context labels
5. ✅ Test with real data

## Technical Details

### ATL/CTL Calculation (CORRECT)
```javascript
// For future dates with no activities:
// Day 1 (today): ATL = 62 (based on last 7 days of training)
// Day 2 (tomorrow): ATL = 62 + (2/8) * (0 - 62) = 46.5 (decays with no training)
// Day 3: ATL = 46.5 + (2/8) * (0 - 46.5) = 34.9 (continues to decay)
```

This is CORRECT - fatigue decreases when you rest!

### Form Status Logic (NEEDS FIX)
Current logic may be:
- TSB > 5: "Optimal" (fresh and ready)
- TSB -10 to 5: "Neutral"
- TSB < -10: "Fatigued"

But readiness score might be inverted or inconsistent.
