# 🎯 Current Sprint - November 1, 2025

**Status:** In Progress  
**Focus:** Mobile responsiveness, menu cleanup, dark mode polish, production testing

---

## 🔴 HIGH PRIORITY

### 1. Mobile Responsiveness ⭐ TOP PRIORITY
**Goal:** Make entire site mobile-friendly (320px - 768px viewports)

**Tasks:**
- [ ] Audit all pages on mobile viewport
- [ ] Fix layout issues on small screens
- [ ] Make navigation menu mobile-friendly (hamburger menu?)
- [ ] Ensure touch-friendly buttons (min 44x44px)
- [ ] Test forms on mobile (plan generation, race analysis, login, etc.)
- [ ] Fix charts and graphs for mobile display
- [ ] Ensure modals display properly on small screens
- [ ] Test sidebar on mobile (collapse/expand)
- [ ] Verify all interactive elements work with touch

**Pages to Test:**
- Dashboard
- AI Coach (PlanGenerator)
- All Activities
- Race Day Predictor
- Post-Race Analysis
- FTP History
- Form & Fitness
- Calendar
- Settings
- Profile
- Today's Workout (already mobile-optimized)
- Admin pages

**Key Files:**
- `src/components/Layout.jsx` - Main layout and sidebar
- All page components in `src/pages/`
- `tailwind.config.js` - Responsive breakpoints

---

### 2. Menu Cleanup & Navigation
**Goal:** Reorganize navigation for better UX

**Current Menu Structure (Review Needed):**
```
- Dashboard
- AI Coach
- All Activities
- Race Day Predictor
- Post-Race Analysis
- FTP History
- Form & Fitness
- Calendar
- Today's Workout
- Race Analytics (?)
- Settings
- Admin (if admin)
```

**Questions to Answer:**
- Are there redundant menu items?
- Should features be grouped? (e.g., "Race Tools" → Predictor + Analysis)
- Are icons consistent and clear?
- Is the hierarchy logical?
- Should some items be in a dropdown/submenu?

**Proposed Improvements:**
- Group related features
- Add section headers
- Consider collapsible sections
- Improve icon consistency
- Add tooltips for clarity

**Key File:**
- `src/components/Layout.jsx` - Navigation sidebar

---

### 3. Dark Mode Polish (Proper Implementation)
**Goal:** Comprehensive dark mode audit and WCAG AA compliance

**Status:** Quick fix applied Oct 24, needs proper implementation

**What Was Done (Quick Fix):**
- 8 pages received rapid fixes
- 224+ hardcoded colors replaced
- NOT comprehensive

**What Needs To Be Done:**
- [ ] Systematic audit of ALL pages
- [ ] Test every component in dark mode
- [ ] Ensure WCAG AA contrast compliance (4.5:1 for text, 3:1 for UI)
- [ ] Fix remaining hardcoded colors
- [ ] Test all states (hover, active, disabled, focus)
- [ ] Verify charts/graphs in dark mode
- [ ] Test modals, dropdowns, tooltips
- [ ] Document dark mode color palette

**Pages to Audit:**
- [ ] Dashboard
- [ ] PlanGenerator (AI Coach)
- [ ] AllActivities
- [ ] RaceDayPredictor
- [ ] PostRaceAnalysis
- [ ] Settings
- [ ] Profile
- [ ] Calendar
- [ ] FTPHistory
- [ ] Form
- [ ] TodaysWorkout
- [ ] RaceAnalytics
- [ ] Admin pages (all)
- [ ] Login/Register

**Components to Audit:**
- [ ] Modals
- [ ] Dropdowns
- [ ] Tooltips
- [ ] Charts (Recharts)
- [ ] Cards
- [ ] Buttons (all variants)
- [ ] Forms (inputs, selects, textareas)
- [ ] Tables
- [ ] Badges
- [ ] Alerts

**Tools:**
- Browser DevTools (inspect contrast ratios)
- WCAG Contrast Checker
- Test in both light and dark mode systematically

---

### 4. Training Plan Generation - Production Testing
**Goal:** Verify plan generation works on production

**Status:** Works in development, needs production verification

**Tasks:**
- [ ] Test on production (riderlabs.io)
- [ ] Verify OpenAI API key in production `.env`
- [ ] Test with all event types (Endurance, Criterium, Time Trial, Climbing, Gran Fondo, General Fitness)
- [ ] Test different plan durations (2-16 weeks)
- [ ] Test plan adjustments
- [ ] Check PM2 logs: `pm2 logs riderlabs | grep -i openai`
- [ ] Verify OpenAI API quota and billing
- [ ] Test error handling (what happens if API fails?)
- [ ] Add better error messages to frontend if needed

**Production Environment:**
- URL: https://riderlabs.io
- Server: PM2 managed
- Logs: `pm2 logs riderlabs`
- Config: `.env` file on server

---

## 🟡 MEDIUM PRIORITY

### 5. Manual Activity Edit Bug
**Status:** Not saving (reported Oct 29, 2025)

**Tasks:**
- [ ] Reproduce the bug
- [ ] Check browser console for errors
- [ ] Check network tab for API failures
- [ ] Review `manualActivityService.js`
- [ ] Review `ManualActivityModal.jsx`
- [ ] Test edit flow end-to-end
- [ ] Fix and verify

---

## 📊 Success Criteria

**Mobile Responsiveness:**
- ✅ All pages display correctly on 320px viewport
- ✅ All pages display correctly on 768px viewport
- ✅ Navigation works on mobile
- ✅ Forms are usable on mobile
- ✅ No horizontal scrolling

**Menu Cleanup:**
- ✅ Navigation structure is logical
- ✅ No redundant items
- ✅ Icons are consistent
- ✅ User testing shows improved UX

**Dark Mode:**
- ✅ All pages pass WCAG AA contrast
- ✅ All components work in dark mode
- ✅ No hardcoded colors remain
- ✅ Visual consistency across app

**Production Testing:**
- ✅ Plan generation works on production
- ✅ All event types generate successfully
- ✅ Error handling works properly
- ✅ No console errors

---

## 📝 Notes

**Why Mobile First?**
- Critical for user adoption
- Many athletes check workouts on phone
- Today's Workout page already mobile-optimized
- Rest of app needs to match

**Why Menu Cleanup?**
- Current structure may be confusing
- Too many top-level items
- Grouping related features improves UX
- Easier navigation = better retention

**Why Dark Mode Polish?**
- Previous fix was quick patch
- Production quality requires proper audit
- WCAG compliance is important
- Professional appearance matters

**Why Production Testing?**
- Core feature must work live
- Development ≠ production environment
- API keys may differ
- Catch issues before users do

---

**Last Updated:** November 1, 2025, 6:37am  
**Next Review:** After mobile responsiveness completion
