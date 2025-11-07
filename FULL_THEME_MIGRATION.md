# Full Theme Migration - Color Replacement Map

## Overview
Found 296 blue color instances and 179 status color instances across 47 files.

## Color Replacement Map

### Primary Colors (Blue → Theme Primary)
```
text-blue-600 → text-[var(--color-primary)]
text-blue-500 → text-[var(--color-primary)]
text-blue-400 → text-[var(--color-primary)]/80

bg-blue-600 → bg-[var(--color-primary)]
bg-blue-500 → bg-[var(--color-primary)]
bg-blue-50 → bg-[var(--color-primary)]/10
bg-blue-100 → bg-[var(--color-primary)]/20

border-blue-600 → border-[var(--color-primary)]
border-blue-500 → border-[var(--color-primary)]
border-blue-200 → border-[var(--color-primary)]/30
border-blue-300 → border-[var(--color-primary)]/40

hover:bg-blue-700 → hover:bg-[var(--color-primary)]/90
hover:text-blue-700 → hover:text-[var(--color-primary)]/90
hover:border-blue-300 → hover:border-[var(--color-primary)]/40
```

### Dark Mode Primary
```
dark:text-blue-400 → dark:text-[var(--color-primary-dark)]
dark:text-blue-300 → dark:text-[var(--color-primary-dark)]/80
dark:bg-blue-900 → dark:bg-[var(--color-primary-dark)]/20
dark:border-blue-700 → dark:border-[var(--color-primary-dark)]/30
```

### Status Colors

#### Success (Green)
```
text-green-600 → text-[var(--color-success)]
text-green-700 → text-[var(--color-success)]/90
bg-green-50 → bg-[var(--color-success)]/10
bg-green-100 → bg-[var(--color-success)]/20
border-green-200 → border-[var(--color-success)]/30

dark:text-green-400 → dark:text-[var(--color-success-dark)]
dark:bg-green-900 → dark:bg-[var(--color-success-dark)]/20
```

#### Warning (Yellow)
```
text-yellow-600 → text-[var(--color-warning)]
text-yellow-700 → text-[var(--color-warning)]/90
bg-yellow-50 → bg-[var(--color-warning)]/10
bg-yellow-100 → bg-[var(--color-warning)]/20
border-yellow-200 → border-[var(--color-warning)]/30

dark:text-yellow-400 → dark:text-[var(--color-warning-dark)]
dark:bg-yellow-900 → dark:bg-[var(--color-warning-dark)]/20
```

#### Error (Red)
```
text-red-600 → text-[var(--color-error)]
text-red-700 → text-[var(--color-error)]/90
bg-red-50 → bg-[var(--color-error)]/10
bg-red-100 → bg-[var(--color-error)]/20
border-red-200 → border-[var(--color-error)]/30

dark:text-red-400 → dark:text-[var(--color-error-dark)]
dark:bg-red-900 → dark:bg-[var(--color-error-dark)]/20
```

## Files to Update (Priority Order)

### Priority 1: Core Navigation & Layout (High Impact)
1. `src/components/Layout.jsx` - Main navigation
2. `src/components/ThemeSwitcher.jsx` - Theme controls
3. `src/components/ThemeSelector.jsx` - Theme selector

### Priority 2: Main Pages (High Visibility)
4. `src/pages/Dashboard.jsx` (8 blue + 9 status)
5. `src/pages/Landing.jsx` (20 blue + 2 status)
6. `src/pages/PlanGenerator.jsx` (25 blue + 16 status)
7. `src/pages/TodaysWorkout.jsx` (11 blue + 6 status)

### Priority 3: Feature Pages
8. `src/pages/RaceDayPredictor.jsx` (14 blue + 17 status)
9. `src/pages/RiderProfile.jsx` (22 blue + 13 status)
10. `src/pages/Form.jsx` (9 blue + 7 status)
11. `src/pages/PostRaceAnalysis.jsx` (11 blue + 7 status)
12. `src/pages/SeasonPlanner.jsx` (14 blue + 4 status)

### Priority 4: Secondary Pages
13. `src/pages/AllActivities.jsx` (8 blue + 8 status)
14. `src/pages/Calendar.jsx` (4 blue + 2 status)
15. `src/pages/Settings.jsx` (4 blue + 4 status)
16. `src/pages/WeeklyReport.jsx` (7 blue + 7 status)
17. `src/pages/FTPHistory.jsx` (6 blue + 4 status)
18. `src/pages/PerformanceMetrics.jsx` (4 blue + 9 status)
19. `src/pages/RaceAnalytics.jsx` (3 blue + 6 status)
20. `src/pages/QuickRunPage.jsx` (6 blue + 5 status)

### Priority 5: Documentation & Info Pages
21. `src/pages/Methodology.jsx` (22 blue + 10 status)
22. `src/pages/PrivacyPolicy.jsx` (9 blue)
23. `src/pages/TermsOfService.jsx` (4 blue + 2 status)
24. `src/pages/ChangelogPage.jsx` (4 blue + 1 status)

### Priority 6: Auth & Setup
25. `src/pages/Login.jsx` (5 blue + 1 status)
26. `src/pages/ProfileSetup.jsx` (5 blue)
27. `src/pages/Setup.jsx` (2 blue + 4 status)
28. `src/pages/UserProfile.jsx` (9 blue + 4 status)

### Priority 7: Admin Pages
29. `src/pages/admin/AdminDashboard.jsx` (5 blue + 4 status)
30. `src/pages/admin/AdminLayout.jsx` (2 blue)
31. `src/pages/admin/UserManagement.jsx` (2 blue + 1 status)
32. `src/pages/admin/AdminUsers.jsx` (7 blue + 2 status)
33. `src/pages/admin/AIConfigPage.jsx` (5 blue + 2 status)
34. `src/pages/admin/AIPromptsPage.jsx` (2 blue + 1 status)
35. `src/pages/admin/APIKeysPage.jsx` (10 blue + 3 status)
36. `src/pages/admin/CoachPersonasPage.jsx` (7 blue + 6 status)
37. `src/pages/admin/PlanTemplatesPage.jsx` (2 blue + 3 status)
38. `src/pages/admin/ThemeConfigPage.jsx` (1 blue + 4 status)
39. `src/pages/admin/ActivityLogPage.jsx` (5 blue + 2 status)
40. `src/pages/admin/ServicesPage.jsx` (3 blue + 1 status)
41. `src/pages/admin/GlobalSettings.jsx` (2 blue)
42. `src/pages/admin/AdminChangelog.jsx` (3 blue + 1 status)
43. `src/pages/admin/AdminLogin.jsx` (4 blue + 1 status)

## Migration Strategy

### Approach: Systematic File-by-File Replacement

For each file:
1. Read the file
2. Replace all blue colors with primary theme variables
3. Replace all status colors with theme variables
4. Test the file visually
5. Move to next file

### Testing Checklist Per File:
- [ ] Light mode looks correct
- [ ] Dark mode looks correct
- [ ] All 6 themes display properly
- [ ] Hover states work
- [ ] Active states work
- [ ] No visual regressions

## Estimated Time

- **Per file average**: 10-15 minutes
- **Total files**: 43 files
- **Estimated total**: 7-10 hours

## Progress Tracking

Create a checklist as you go:
- [ ] Layout & Navigation (3 files)
- [ ] Main Pages (4 files)
- [ ] Feature Pages (5 files)
- [ ] Secondary Pages (8 files)
- [ ] Documentation (4 files)
- [ ] Auth & Setup (4 files)
- [ ] Admin Pages (15 files)

## Quick Start

I'll begin with the highest impact files first to show immediate visual results.

Starting with:
1. Dashboard.jsx - Most visited page
2. Layout.jsx - Navigation (affects all pages)
3. Landing.jsx - First impression

These 3 files will make themes immediately visible!
