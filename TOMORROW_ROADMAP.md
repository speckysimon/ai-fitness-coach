# Tomorrow's Development Roadmap
**Date:** October 4, 2025  
**Focus:** Fix bugs, clean architecture, improve matching

---

## 🎯 Session Goals

### **1. Fix Phantom Matches** (30-45 min)
**Problem:** Oct 1 & Oct 2 showing "Low match (50%)" badges but "No Activities Found" in modal

**Debug Steps:**
1. Add console.log to see exact `automaticMatches` data structure
2. Check what matching algorithm returns for sessions with no activities
3. Identify why `activity` object exists but has no valid `id`
4. Verify the ±2 day window isn't creating phantom matches

**Success Criteria:**
- ✅ No badges on days with zero activities
- ✅ "View Match" only shows when real Strava activity exists
- ✅ Console shows clear matching logic flow

---

## 🧹 2. Fix Technical Debt (High Priority) (2-3 hours)

### **A. Consolidate Token Refresh Logic** (1 hour)
**Problem:** Token refresh code duplicated across Dashboard, FTPHistory, PlanGenerator

**Solution:**
- Create `src/hooks/useStravaAuth.js` custom hook
- Centralize token refresh logic
- Handle token expiration automatically
- Update parent component state properly

**Files to Create:**
```javascript
// src/hooks/useStravaAuth.js
export const useStravaAuth = (stravaTokens) => {
  const refreshAccessToken = async () => { ... }
  const fetchWithAuth = async (url, options) => { ... }
  return { refreshAccessToken, fetchWithAuth }
}
```

**Files to Update:**
- `src/pages/Dashboard.jsx`
- `src/pages/FTPHistory.jsx`
- `src/pages/PlanGenerator.jsx`
- Any other pages using Strava API

---

### **B. Improve Error Handling** (30 min)
**Problem:** Silent failures, unclear error messages

**Solution:**
- Add proper error boundaries
- User-friendly error messages
- Toast notifications instead of alerts
- Graceful degradation when API fails

**Files to Update:**
- `src/pages/PlanGenerator.jsx` - Remove aggressive error handling
- Add `src/components/ErrorBoundary.jsx`
- Add `src/components/Toast.jsx` or use a library

---

### **C. Add Loading States** (30 min)
**Problem:** No feedback when activities are loading

**Solution:**
- Add loading spinners
- Skeleton screens for plan display
- Disable buttons during async operations
- Show "Syncing activities..." messages

**Files to Update:**
- `src/pages/PlanGenerator.jsx`
- `src/components/ui/Spinner.jsx` (create if needed)

---

### **D. Clean Up Console Logs** (15 min)
**Problem:** Too many debug console.logs in production code

**Solution:**
- Remove or comment out debug logs
- Use proper logging levels (dev vs prod)
- Keep only essential logs

**Files to Update:**
- `src/pages/PlanGenerator.jsx`
- `src/lib/activityMatching.js`
- `server/routes/strava.js`

---

## 🎯 3. Fix Matching Logic (1-2 hours)

### **A. Improve Match Score Calculation** (45 min)
**Current Issues:**
- Recovery rides not matching well (too strict on duration)
- Intensity matching needs work
- Date offset not penalizing scores

**Improvements:**
```javascript
// src/lib/activityMatching.js

// 1. Add date offset penalty
if (dateOffset === 1 || dateOffset === -1) {
  score = score * 0.9; // 10% penalty for ±1 day
} else if (dateOffset === 2 || dateOffset === -2) {
  score = score * 0.8; // 20% penalty for ±2 days
}

// 2. Relax duration matching for recovery rides
if (session.type === 'Recovery') {
  // Allow 50% variance instead of 30%
  if (durationDiff <= 0.5) score += 20;
}

// 3. Improve intensity matching
// Use normalized power for better accuracy
// Consider variability index for interval workouts
```

**Files to Update:**
- `src/lib/activityMatching.js`

---

### **B. Lower Match Threshold for Visibility** (15 min)
**Current:** Only show matches ≥60%  
**New:** Show "Low match" for 20-59%, "Good match" for 60%+

**Changes:**
```javascript
// Show any match ≥20%
if (bestScore >= 20) {
  matches[sessionKey] = {
    matched: bestScore >= 60, // Only auto-match if ≥60%
    activity: bestMatch,
    alignmentScore: bestScore,
    // ...
  }
}
```

**Files to Update:**
- `src/lib/activityMatching.js`

---

### **C. Add Match Reason Details** (30 min)
**Enhancement:** Show WHY a match is low

**Examples:**
- "Duration too long (+30 min)"
- "Intensity too high (Zone 4 vs Zone 2)"
- "Done 1 day late"

**Files to Update:**
- `src/lib/activityMatching.js` - Generate detailed reasons
- `src/components/ActivityMatchModal.jsx` - Display reasons

---

## 🌟 4. Stretch Goal: Something Useful (1-2 hours)

### **Option A: Quick Stats Dashboard** (Easy Win)
Add a summary card showing:
- Total training hours this week
- Training load (TSS) this week
- Compliance rate (completed/planned)
- Current streak (consecutive days)

**Files to Create:**
- `src/components/TrainingStats.jsx`

**Files to Update:**
- `src/pages/PlanGenerator.jsx` - Add stats card above plan

---

### **Option B: Export Plan to Calendar (ICS)** (Medium)
Generate `.ics` file for non-Google calendar users

**Features:**
- Download button next to "Add to Calendar"
- Works with Apple Calendar, Outlook, etc.
- Includes all session details

**Files to Create:**
- `src/lib/icsGenerator.js`

**Files to Update:**
- `src/pages/PlanGenerator.jsx` - Add export button

---

### **Option C: Session Notes** (Easy)
Allow users to add notes to completed sessions

**Features:**
- "Add Note" button on completed sessions
- Store in localStorage
- Display notes in session card
- Useful for tracking how sessions felt

**Files to Update:**
- `src/pages/PlanGenerator.jsx` - Add note input
- Update `completedSessions` structure to include notes

---

### **Option D: FTP Calculator** (Medium)
Add a simple FTP calculator based on recent activities

**Features:**
- Analyze last 4 weeks of activities
- Find best 20-min power
- Calculate FTP (95% of 20-min power)
- Show FTP history chart

**Files to Create:**
- `src/lib/ftpCalculator.js`

**Files to Update:**
- `src/pages/FTPHistory.jsx` - Add calculator section

---

## 📊 Success Metrics for Tomorrow

### Must Have (Required)
- [ ] Zero phantom match badges
- [ ] Token refresh consolidated into hook
- [ ] All console.logs cleaned up
- [ ] Loading states added

### Should Have (Important)
- [ ] Match scores improved with penalties
- [ ] Error handling improved
- [ ] Match threshold lowered to 20%

### Nice to Have (Bonus)
- [ ] One stretch goal completed
- [ ] Code comments added
- [ ] README updated

---

## 🚫 Out of Scope for Tomorrow

**Do NOT work on these (save for later):**
- Smart plan regeneration (Phase 2)
- Workout file export (.FIT, .ERG, .ZWO)
- Post-race analysis
- Advanced metrics (CTL, ATL, TSB)
- Weather integration
- New features

**Focus:** Fix what's broken, clean what's messy, improve what's working.

---

## 📝 Notes from Today's Session

### Issues Encountered
1. Token refresh working on Dashboard but failing on PlanGenerator
2. Backend returns `{ success: true, tokens: {...} }` but frontend expected flat structure
3. Activity matching showing badges for non-existent activities
4. Strava activities use `start_date_local` not `date` field

### Fixes Applied
1. ✅ Fixed token response parsing in `refreshAccessToken()`
2. ✅ Added ±2 day window for activity matching
3. ✅ Improved date field handling in matching algorithm
4. ✅ Added "Low match" badges for scores 20-59%
5. ✅ Rounded match percentages to whole numbers
6. ✅ Added Mark Missed functionality with reasons

### Still Broken
1. ❌ Phantom matches on Oct 1 & Oct 2 (50%, 48%)
2. ❌ `activity.id` check not working as expected
3. ❌ Need better validation of activity objects

---

## 🔧 Quick Reference

### Key Files
- **Matching Logic:** `src/lib/activityMatching.js`
- **Plan Generator:** `src/pages/PlanGenerator.jsx`
- **Token Refresh:** Multiple files (needs consolidation)
- **Strava Routes:** `server/routes/strava.js`

### Important Functions
- `matchActivitiesToPlan()` - Main matching algorithm
- `calculateMatchScore()` - Score calculation
- `refreshAccessToken()` - Token refresh (duplicated)
- `loadActivities()` - Fetch Strava activities

### Data Structures
```javascript
// Activity Match Object
{
  matched: boolean,
  activity: { id, name, distance, duration, ... } | null,
  alignmentScore: number,
  dateOffset: number,
  reason: string
}

// Completed Session Object
{
  completed: boolean,
  missed: boolean,
  missedReason: 'Illness' | 'Schedule Conflict' | 'Other',
  automatic: boolean,
  manualOverride: boolean,
  activity: object | null,
  alignmentScore: number
}
```

---

## ⏰ Time Budget

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Fix Phantom Matches | 30-45 min | P0 |
| Consolidate Token Refresh | 1 hour | P0 |
| Improve Error Handling | 30 min | P1 |
| Add Loading States | 30 min | P1 |
| Clean Console Logs | 15 min | P1 |
| Improve Match Scores | 45 min | P1 |
| Lower Match Threshold | 15 min | P2 |
| Add Match Reasons | 30 min | P2 |
| Stretch Goal | 1-2 hours | P3 |
| **TOTAL** | **5-6 hours** | - |

---

**Last Updated:** October 3, 2025, 9:39 PM  
**Next Session:** October 4, 2025  
**Status:** Ready to execute

---

## 💡 Remember

1. **Fix first, then build** - Don't add features until bugs are fixed
2. **Clean code matters** - Future you will thank present you
3. **Test as you go** - Refresh page after each change
4. **Commit often** - Small commits with clear messages
5. **One thing at a time** - Don't jump between tasks

**Let's make tomorrow productive! 🚀**
