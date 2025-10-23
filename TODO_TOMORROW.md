# TODO - Tomorrow's Action Items

**Date:** October 20, 2025  
**Last Updated:** October 19, 2025 @ 3:23pm

---

## ✅ **Completed Today (Oct 19)**

1. ✅ **HR Zone Selector** - Fully implemented with 3/5/7 zone models
2. ✅ **Training Plan Duration Fix** - AI now generates correct number of weeks
3. ✅ **Rider Type Display** - Fixed and visible on Rider Profile
4. ✅ **HR Zone Colors** - All zones showing correct colors
5. ✅ **Coach Notes Timestamp** - Fixed date display
6. ✅ **AI Coach Rebranding** - Renamed from "Training Plan"
7. ✅ **Page Layout Reorganization** - Improved Rider Profile structure

---

## 🎯 **Priority Tasks for Tomorrow**

### 1. **Testing & Quality Assurance** 🔴 HIGH PRIORITY

**Test Today's Implementations:**
- [ ] Test HR Zone Selector with all 3 models (3/5/7 zones)
- [ ] Verify zones recalculate correctly when switching models
- [ ] Test Max HR input for 7-zone model
- [ ] Verify localStorage persistence for zone preferences
- [ ] Test training plan generation with various durations (2, 4, 8, 12 weeks)
- [ ] Confirm correct number of weeks generated
- [ ] Verify taper week is always last week
- [ ] Test on mobile devices
- [ ] Check dark mode compatibility

**Bug Hunting:**
- [ ] Look for any console errors or warnings
- [ ] Test edge cases (no activities, no FTP, etc.)
- [ ] Verify all modals open/close correctly

---

### 2. **Form Predictor Accuracy Review** 🟡 MEDIUM PRIORITY

**Goal:** Review and improve Race Day Form Predictor messaging accuracy

**Current Issues to Check:**
- Are CTL/ATL/TSB calculations accurate?
- Is readiness score formula correct?
- Are taper recommendations appropriate?
- Is messaging clear and actionable?

**Areas to Review:**
1. **Calculation Accuracy**
   - CTL (42-day exponentially weighted average)
   - ATL (7-day exponentially weighted average)
   - TSB (CTL - ATL)
   - Readiness score formula

2. **Messaging Quality**
   - Are recommendations specific enough?
   - Do they match the actual data?
   - Are they actionable?
   - Do they consider context (days to race, current phase)?

3. **Taper Strategy**
   - Are phase recommendations correct?
   - Is timing appropriate?
   - Are volume reductions sensible?

**File:** `/src/pages/RaceDayPredictor.jsx`

**Research:**
- Banister impulse-response model
- Taper strategies (Mujika & Padilla)
- CTL/ATL/TSB validation studies

---

### 3. **Zwift API Integration Research** 🟢 LOW PRIORITY

**Goal:** Research Zwift API integration rules and implement workout/event search based on training plan descriptions

**Objectives:**
1. **Research Zwift API Access**
   - Review Zwift API documentation and terms of service
   - Understand authentication requirements (OAuth, API keys)
   - Check rate limits and usage restrictions
   - Determine if API is publicly available or requires partnership
   - Review Zwift's developer program requirements

2. **Workout Search Feature**
   - Search Zwift workouts by description/keywords
   - Match training plan sessions to Zwift workouts
   - Example: "Find me a Zwift event for today's workout"
   - Filter by duration, intensity, workout type
   - Show upcoming events that match workout profile

3. **Event Search Feature**
   - Search Zwift events by date/time
   - Filter events by category (race, group ride, workout)
   - Match event difficulty to training plan intensity
   - Show events that align with today's training goal

**Research Questions:**
- Is there an official Zwift API?
- What endpoints are available?
- Can we search workouts programmatically?
- Can we access event schedules?
- What are the authentication requirements?
- Are there rate limits?
- Do we need approval/partnership?

**Alternative Approaches (if no official API):**
1. **Web Scraping** (check ToS first!)
   - Scrape ZwiftInsider event calendar
   - Parse Zwift Companion web interface
   - ⚠️ May violate ToS - research carefully

2. **Manual Curated Database**
   - Build database of popular Zwift workouts
   - Map workout types to training plan sessions
   - Update periodically with new workouts

3. **Community Integration**
   - Link to Zwift Workout Database websites
   - Provide search keywords for users to search manually
   - Deep links to Zwift Companion app

**Resources to Check:**
- Zwift API documentation: https://zwift.com/developers (if exists)
- Zwift Companion App API (reverse engineering considerations)
- Third-party Zwift API projects on GitHub
- ZwiftInsider for event schedules
- Zwift Workout Database/Library

---

### 4. **Optional Enhancements** 🟢 LOW PRIORITY

**HR Zone Enhancements:**
- [ ] Add zone distribution chart showing time in each zone
- [ ] Add training recommendations based on selected zone model
- [ ] Add zone comparison view (compare 3 vs 5 vs 7 zones)
- [ ] Add power zone selector (similar to HR zones)

**UI/UX Polish:**
- [ ] Remove debug console.log statements from RiderProfile.jsx
- [ ] Add loading skeletons for better perceived performance
- [ ] Add tooltips for complex metrics
- [ ] Improve mobile responsiveness

**Documentation:**
- [ ] Update README with new features
- [ ] Create user guide for HR zone selector
- [ ] Document training plan generation process

---

## 📋 **Backlog (Future Sprints)**

### **Power Zone Selector**
- Similar to HR zone selector
- 3/5/7 power zone models
- Based on FTP

### **Custom Zone Creation**
- Allow users to create custom zones
- Save multiple zone profiles
- Switch between profiles

### **Training Load Visualization**
- CTL/ATL/TSB charts
- Form tracking over time
- Fatigue/fitness balance

### **Garmin Integration**
- Sync workouts to Garmin
- Pull activities from Garmin Connect
- Two-way sync

### **Workout Library**
- Pre-built workout templates
- Filter by type, duration, intensity
- One-click add to training plan

---

## 🎯 **Success Criteria**

### Tomorrow's Goals:
- [ ] All today's features tested and working
- [ ] No critical bugs found
- [ ] Form Predictor reviewed and documented
- [ ] Zwift API research completed with findings document

### This Week's Goals:
- [ ] HR Zone Selector fully tested and stable
- [ ] Training Plan duration working for all scenarios
- [ ] Form Predictor improvements implemented
- [ ] Zwift integration decision made (yes/no/later)

---

## 📚 **Resources**

### Documentation Created:
- `CHANGELOG.md` - Updated with v2.3.0 release notes
- `HR_ZONE_SELECTOR_PROPOSAL.md` - Complete research document
- `IMPLEMENTATION_SUMMARY_OCT19.md` - Implementation details
- `TODO_TOMORROW.md` - This file

### Key Files:
- `/src/pages/RiderProfile.jsx` - HR zones and rider type
- `/src/pages/PlanGenerator.jsx` - Training plan generation
- `/server/services/fthrService.js` - HR zone calculations
- `/server/services/aiPlannerService.js` - AI plan generation
- `/src/lib/riderAnalytics.js` - Rider type classification

---

## 💤 **End of Day Summary**

**Today's Wins:**
- ✅ Implemented comprehensive HR Zone Selector (3 models)
- ✅ Fixed training plan duration bug
- ✅ Restored rider type display
- ✅ Fixed HR zone colors
- ✅ Improved page layouts
- ✅ Rebranded to "AI Coach"

**Tomorrow's Focus:**
1. 🔴 Test all today's implementations
2. 🟡 Review Form Predictor accuracy
3. 🟢 Research Zwift API integration

**Blockers:** None

**Notes:** 
- HR Zone Selector is feature-complete and ready for user testing
- Training plan duration fix needs real-world testing with various date ranges
- Consider user feedback on zone model preferences

---

**Good night! 😴**
