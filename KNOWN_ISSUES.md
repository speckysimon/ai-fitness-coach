# Known Issues & Bugs

**Last Updated:** November 7, 2025

This document tracks outstanding bugs and issues that need to be fixed in RiderLabs.

---

## 🎨 1. Inconsistent Theme Application

**Status:** Partially implemented, not fully integrated  
**Priority:** High  
**Complexity:** Medium

### Issues:
- Theme system exists in database (`theme_configs` table)
- Admin panel exists (`ThemeConfigPage.jsx`) for managing themes
- `themeService.js` exists but **not connected to frontend**
- CSS custom properties defined but **not dynamically loaded**
- Colors still hardcoded in Tailwind classes throughout app

### What's Missing:
- Frontend doesn't load active theme from database on app start
- No theme initialization in `App.jsx` or main entry point
- CSS variables not being injected into DOM
- Components not using CSS variables (still using hardcoded Tailwind)

### Files Involved:
- `src/lib/themeService.js` - Service exists but unused
- `src/pages/admin/ThemeConfigPage.jsx` - Admin UI works
- `server/routes/themeConfigs.cjs` - API works
- Need to add theme loading to `src/App.jsx` or `src/main.jsx`

### To Fix:
1. Import and initialize theme service in App.jsx
2. Load active theme on app mount
3. Apply theme CSS variables to DOM
4. Convert hardcoded colors to CSS variables (gradual migration)

---

## 🌙 2. Changelog Page Dark Mode

**Status:** Not fixed  
**Priority:** Medium  
**Complexity:** Low

### Issues:
- Header text: `text-gray-900` (no dark mode)
- Description text: `text-gray-600` (no dark mode)
- Card section headers: `text-gray-900` (no dark mode)
- List item text: `text-gray-700` (no dark mode)
- Footer text: `text-gray-500` (no dark mode)

### Lines to Fix in `ChangelogPage.jsx`:
- Line 398: `<h1 className="text-3xl font-bold text-gray-900 ...`
- Line 402: `<p className="text-gray-600 mt-2">`
- Line 419: `<span className="text-sm text-gray-500">`
- Line 425: `<h4 className="font-semibold text-gray-900 ...`
- Line 431: `<li ... className="text-sm text-gray-700 ...`
- Line 442: `<h4 className="font-semibold text-gray-900 ...`
- Line 448: `<li ... className="text-sm text-gray-700 ...`
- Line 459: `<h4 className="font-semibold text-gray-900 ...`
- Line 465: `<li ... className="text-sm text-gray-700 ...`
- Line 479: `<div className="text-center text-sm text-gray-500 ...`

### Pattern to Apply:
- `text-gray-900` → `text-gray-900 dark:text-gray-100`
- `text-gray-700` → `text-gray-700 dark:text-gray-300`
- `text-gray-600` → `text-gray-600 dark:text-gray-400`
- `text-gray-500` → `text-gray-500 dark:text-gray-400`

---

## 🌙 3. Admin Panel Dark Mode

**Status:** Not implemented  
**Priority:** Low  
**Complexity:** High

### Issues:
- Entire admin panel lacks dark mode support
- All admin pages use light mode colors only
- Admin layout doesn't have dark mode toggle
- Similar issues to main Changelog page but across all admin pages

### Files Affected:
- `src/pages/admin/AdminChangelog.jsx`
- `src/pages/admin/AdminDashboard.jsx`
- `src/pages/admin/AdminLayout.jsx`
- `src/pages/admin/UserManagement.jsx`
- `src/pages/admin/AdminUsers.jsx`
- `src/pages/admin/AIConfigPage.jsx`
- `src/pages/admin/GlobalSettings.jsx`
- `src/pages/admin/ThemeConfigPage.jsx`
- `src/pages/admin/CoachPersonasPage.jsx`

### To Fix:
1. Add dark mode toggle to AdminLayout
2. Apply dark mode classes to all admin components
3. Test all admin pages in dark mode
4. Update admin-specific styles

---

## 🏆 4. Race Activity Badges Dark Mode

**Status:** Needs audit  
**Priority:** Medium  
**Complexity:** Low

### Issue:
Race badges use light backgrounds without dark mode variants:
- `bg-yellow-100 text-yellow-700` (no dark variant)
- `bg-green-100 text-green-700` (no dark variant)

### Pages to Audit:
- Dashboard.jsx (upcoming workout card)
- Calendar.jsx (race activities)
- AllActivities.jsx (race tags)
- PostRaceAnalysis.jsx (race list)

### Pattern to Apply:
- `bg-yellow-100 text-yellow-700` → `bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300`
- `bg-green-100 text-green-700` → `bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`

---

## 🏷️ 5. Type Badges Dark Mode

**Status:** Needs audit  
**Priority:** Medium  
**Complexity:** Medium

### Issue:
Activity type badges and session type badges use light backgrounds without dark variants throughout the app.

### Common Patterns Missing Dark Mode:
- `bg-green-100 text-green-700` (Recovery)
- `bg-blue-100 text-blue-700` (Endurance)
- `bg-yellow-100 text-yellow-700` (Tempo)
- `bg-orange-100 text-orange-700` (Threshold)
- `bg-red-100 text-red-700` (VO2Max)
- `bg-purple-100 text-purple-700` (Sprint)

### Files to Audit:
- Dashboard.jsx
- TodaysWorkout.jsx
- Calendar.jsx
- AllActivities.jsx
- PlanGenerator.jsx
- RaceDayPredictor.jsx

### Pattern to Apply:
Add dark mode variants to all badge styles:
- `bg-{color}-100 text-{color}-700` → `bg-{color}-100 dark:bg-{color}-900/30 text-{color}-700 dark:text-{color}-300`

---

## 📊 6. Chart Text Visibility in Dark Mode

**Status:** Needs testing  
**Priority:** Low  
**Complexity:** Low

### Issue:
Recharts library text (axis labels, tooltips) may not be visible in dark mode.

### Files to Test:
- Dashboard.jsx (Training Volume, TSS charts)
- PerformanceMetrics.jsx (FTP history chart)
- Form.jsx (Fitness & Form chart, TSS area chart)
- WeeklyReport.jsx (Zone distribution pie chart, Efficiency line chart)

### To Fix:
- Add custom tick styles for dark mode
- Update tooltip styles for dark mode
- Test all charts in dark mode

---

## 🔄 7. Token Refresh Error Handling

**Status:** Inconsistent  
**Priority:** Medium  
**Complexity:** Medium

### Issue:
Token refresh error handling is inconsistent across pages. Some pages handle 401/403 gracefully, others don't.

### Pages with Good Error Handling:
- Dashboard.jsx ✅
- PerformanceMetrics.jsx ✅
- Form.jsx ✅

### Pages Needing Improvement:
- AllActivities.jsx
- Calendar.jsx
- WeeklyReport.jsx
- PostRaceAnalysis.jsx

### To Fix:
1. Standardize token refresh logic
2. Create reusable token refresh hook
3. Implement consistent error messages
4. Add re-authentication flow

---

## 📱 8. Mobile Navigation Menu

**Status:** Needs improvement  
**Priority:** Low  
**Complexity:** Low

### Issue:
Mobile navigation menu (hamburger) could be improved:
- No smooth animations
- Menu items could have better touch targets
- No visual feedback on active page

### To Fix:
1. Add slide-in animation
2. Increase touch target sizes
3. Add active page indicator
4. Consider bottom navigation for mobile

---

## 🔔 9. Notification System

**Status:** Not implemented  
**Priority:** Low  
**Complexity:** High

### Issue:
No notification system for:
- Workout reminders
- Plan completion milestones
- Race day reminders
- FTP test recommendations

### To Implement:
1. Browser notifications API
2. Email notifications (backend)
3. User preferences for notifications
4. Notification history/center

---

## 🔍 10. Search Functionality

**Status:** Limited  
**Priority:** Low  
**Complexity:** Medium

### Issue:
Search is limited to:
- All Activities page (basic filter)
- User Management (admin only)

### Missing Search:
- Global search across all pages
- Training plan search
- Race search
- Settings search

### To Implement:
1. Global search component
2. Search index
3. Keyboard shortcuts (Cmd+K)
4. Search results page

---

## Summary

**High Priority:**
1. Theme System Integration

**Medium Priority:**
2. Changelog Dark Mode
4. Race Badges Dark Mode
5. Type Badges Dark Mode
7. Token Refresh Standardization

**Low Priority:**
3. Admin Panel Dark Mode
6. Chart Text Dark Mode
8. Mobile Navigation
9. Notification System
10. Search Functionality

---

**Note:** This is an internal document. For public-facing known issues, see the Known Issues page in the app.
