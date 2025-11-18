# Fixes and Improvements Tracker

**Date Created**: November 9, 2025, 8:42am
**Status**: Active tracking document

---

## 🐛 Bug Fixes

### High Priority
- [x] **Mobile Menu Overflow**: ✅ NO ISSUE - Already implemented correctly (Nov 9, 2025)
  - Layout.jsx has full mobile menu with hamburger button (lines 56-95)
  - Slide-in sidebar with backdrop overlay
  - Works on mobile (< 1024px), always visible on desktop
  - No fix needed - working as designed

- [ ] **Training Plan Mobile Display Bug**: Plan only shows "Training Goals" section on mobile, but full plan displays in shrunk browser window
  - Location: `PlanGenerator.jsx` (lines 1057-2205)
  - Issue: Mobile devices show only the collapsible form section, not the generated plan below
  - Works correctly: Desktop browser with narrow window
  - Doesn't work: Actual mobile devices
  - Possible causes:
    - CSS media query issue specific to mobile devices
    - JavaScript viewport detection problem
    - Mobile browser rendering difference
    - Height/overflow constraints on mobile
    - Form expansion state (`isFormExpanded`) may be interfering
  - Debug steps:
    - Check if `plan` state exists on mobile
    - Verify `{plan && (<>...</>)}` conditional rendering (line 1498)
    - Test with browser DevTools mobile emulation vs real device
    - Check for CSS `display: none` or `visibility: hidden` on mobile
    - Review any mobile-specific styles affecting the plan cards

### Medium Priority
- [x] **Dashboard Text Overflow**: ✅ FIXED (Nov 9, 2025)
  - Changed metric cards grid from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  - Cards now stack in single column on mobile (< 640px)
  - File: `src/pages/Dashboard.jsx` line 867
  - Prevents text overflow and cramped layout on mobile

- [ ] **Login Page Conflict / Subdomain Migration**: Login page shows when already logged in
  - Issue: Login page accessible/visible even when user is authenticated
  - Possible causes:
    - Route protection not working correctly
    - Session token validation issue
    - Navigation redirect conflict
  - **Solution Options**:
    1. **Move app to app.riderlabs.io subdomain** (cleaner separation)
       - Landing page stays on riderlabs.io
       - App (dashboard, etc.) moves to app.riderlabs.io
       - Requires DNS configuration, subdomain setup
       - Better separation of concerns (marketing vs app)
    2. **Fix route protection** (quicker fix)
       - Add proper auth guards to login route
       - Redirect to dashboard if already logged in
       - Check session token validity on login page mount
  - Files to investigate:
    - `src/App.jsx` - Route configuration
    - `src/pages/Login.jsx` - Login component (lines 1-118)
    - Session token validation logic

- [ ] **Theme Creation Error in Admin Panel**: "Failed to create theme configuration" error
  - Issue: Cannot create new themes via admin panel
  - Suspected cause: Theme system may have been disconnected during database schema changes
  - Related to: Lost all themes in database changes (Nov 8)
  - Missing table: `theme_configs` table needs to be recreated
  - Solution: Apply schema.sql to recreate theme_configs table
  - Files to check:
    - `server/schema.sql` - Verify theme_configs table definition
    - `server/routes/themeConfig.cjs` - Theme API endpoints
    - `src/pages/admin/ThemeConfigPage.jsx` - Admin UI
  - **Status**: Cosmetic fix, marked as "for later"
  - **Priority**: Medium (blocks theme customization but app works with default theme)

- [ ] **Rider Profile Confidence Calculation**: Shows "Insufficient Data" with 0% confidence even when user has activities
  - Location: `src/lib/riderAnalytics.js` (lines 26-41)
  - Current logic: Requires BOTH FTP AND at least 10 activities
  - Issue: If either FTP is missing OR activities < 10, shows "Insufficient Data"
  - User confusion: Screenshot shows user has FTP (212W), FTHR (162 BPM), W/kg (3.12), BMI (24.1) but still shows 0% confidence
  - **User has 200 activities total, 4 in last 2 weeks**
  - Root cause (IDENTIFIED):
    - Power curve calculation requires activities with `avgPower` field
    - If activities don't have power meter data, power curve returns all zeros
    - Classification algorithm needs power data to determine rider type
    - With only 4 recent activities (possibly without power), insufficient data for classification
    - FTP alone isn't enough - needs actual power data from activities
  - Possible fixes:
    - **Better error messaging**: Show specific reason (e.g., "Need power meter data" or "Need more recent activities with power")
    - **Fallback classification**: Use heart rate data if power unavailable
    - **Progressive calculation**: Show partial profile based on available data (HR zones, elevation patterns)
    - **Activity filtering**: Show how many activities have power vs HR only
    - **Manual override**: Allow user to manually select rider type if insufficient power data
    - **Estimated power**: Calculate estimated power from HR and speed for activities without power meters 

### Low Priority
- [ ] 

---

## ✨ Improvements

### UX/UI Enhancements
- [ ] **Drag & Drop Plan Reorganization**: Make plan items within each week drag-n-drop reorganisable
  - Allow users to reorder sessions within a week
  - Consider using react-beautiful-dnd or @dnd-kit/core
  - Update session dates when reordered
  - Preserve completion status during reorder
  - Add visual feedback during drag
  - Save reordered plan to backend

### Performance Optimizations
- [ ] 

### Code Quality
- [ ] 

---

## 📱 Mobile Responsiveness

### Pages Needing Mobile Optimization
- [ ] Landing page
- [ ] Dashboard
- [ ] Training Plan Generator
- [ ] All Activities
- [ ] Race Day Predictor
- [ ] Post-Race Analysis
- [ ] Settings
- [ ] Profile
- [ ] Calendar
- [ ] FTP History
- [ ] Form & Fitness
- [ ] Today's Workout (already mobile-optimized)
- [ ] Race Analytics
- [ ] Methodology

### Mobile-Specific Issues
- [ ] 

---

## 🎨 Dark Mode Polish

**Status**: 95% Complete ✅

### Pages Needing Dark Mode Audit
- [x] Dashboard
- [x] Training Plan Generator
- [x] All Activities
- [x] Race Day Predictor
- [x] Post-Race Analysis
- [x] Settings
- [x] Profile
- [x] Calendar
- [x] FTP History
- [x] Form & Fitness
- [x] Methodology (recently fixed)
- [x] Race Analytics

### Remaining Dark Mode Issues (5%)
- [ ] WCAG AA contrast compliance verification needed
- [ ] Final polish and edge cases
- [ ] Test all modals, dropdowns, tooltips in dark mode
- [ ] Verify chart colors in dark mode across all pages 

---

## 🧹 Menu & Navigation Cleanup

### Current Issues
- [ ] Review navigation structure for redundancy
- [ ] Identify confusing menu items
- [ ] Consider grouping related features
- [ ] Add missing icons
- [ ] Improve menu hierarchy

### Proposed Changes
- [ ] 

---

## 🚀 Feature Enhancements

### Training Plan
- [ ] **Drag & Drop Session Reordering**: Allow users to reorganize sessions within weeks (see UX/UI Enhancements)

### Race Features
- [ ] **Live Tracking Research & Implementation**:
  - Research Strava Live Beacon API
    - Check API availability and access requirements
    - Test lag/latency for real-time tracking
    - Evaluate data refresh rate
    - Review terms of service and usage limits
  - Research Garmin LiveTrack API
    - Compare with Strava Beacon
    - Check integration complexity
    - Evaluate real-time performance
  - Research other alternatives (Wahoo, Hammerhead, etc.)
  - **Use Case**: Track rider position live during races
  - **Goal**: Real-time race monitoring for team coordination
  - **Priority**: Aligns with Club & Team Race Strategy (TIER 1 feature)
  - Document findings and recommend best solution

### Analytics
- [ ] 

### Integrations
- [ ] Live tracking integration (pending research above) 

---

## 🔧 Technical Debt

### Backend
- [ ] 

### Frontend
- [ ] 

### Database
- [ ] 

---

## 📝 Documentation

### Needs Documentation
- [ ] 

### Needs Update
- [ ] 

---

## 🧪 Testing

### Needs Testing
- [ ] Training plan generation on production (riderlabs.io)
- [ ] Verify OpenAI API key configuration
- [ ] Check PM2 logs for errors
- [ ] Test all pages on mobile viewport (320px - 768px)
- [ ] Test navigation menu on mobile
- [ ] Verify forms work on mobile
- [ ] Test charts and graphs on mobile
- [ ] Ensure modals display properly on small screens

---

## 💡 Ideas for Future

### Nice to Have
- [ ] 

### Long-term Vision
- [ ] Club & Team Race Strategy (TIER 1 priority from roadmap)
- [ ] Enhanced Post-Race Analysis with historical database
- [ ] Gamification System
- [ ] Wellness Check-In frontend
- [ ] PWA Enhancement
- [ ] Additional data sources (Garmin, Zwift, TrainerRoad, Wahoo, Polar)

---

## 📊 Current Sprint Focus

Based on retrieved memories, current priorities are:

1. **Mobile Responsiveness** (HIGH PRIORITY)
   - Make entire site responsive for mobile devices
   - Test all pages on mobile viewport
   - Fix layout issues on small screens
   - Ensure touch-friendly buttons

2. **Menu Cleanup & Navigation** (HIGH PRIORITY)
   - Review current navigation structure
   - Identify redundant or confusing menu items
   - Reorganize menu for better UX

3. **Dark Mode Polish** (Needs Proper Implementation)
   - Previous implementation was quick fix, NOT comprehensive
   - Needs full audit of ALL pages
   - WCAG AA contrast compliance required

4. **Production Testing**
   - Training plan generation verification on riderlabs.io
   - Verify OpenAI API key configuration
   - Check PM2 logs for errors

---

## 📋 Notes

- Use this file to track all bugs, improvements, and enhancements
- Mark items as complete with `[x]` when done
- Add dates and details to completed items
- Keep this file updated throughout development sessions
- Reference this file when planning sprints

---

**Last Updated**: November 9, 2025, 8:42am
