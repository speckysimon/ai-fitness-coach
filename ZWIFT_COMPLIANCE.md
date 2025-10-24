# Zwift Trademark Compliance Review

**Date:** October 24, 2025  
**Status:** ⚠️ NEEDS ATTENTION

---

## 🔍 Current Usage

### Where We Reference Zwift

1. **TodaysWorkout.jsx** - Zwift workout recommendations
2. **SessionDetail.jsx** - Zwift workout suggestions
3. **SessionHoverModal.jsx** - Zwift workout recommendations
4. **Dashboard.jsx** - Zwift activity icon (orange "Z")
5. **AllActivities.jsx** - Zwift activity icon (orange "Z")
6. **ChangelogPage.jsx** - Feature descriptions mentioning Zwift

### How We Use It

- **Workout Recommendations:** Suggesting Zwift workouts by name (e.g., "The Gorby", "DIRT", "Zwift 101")
- **Activity Icons:** Orange "Z" icon for Zwift activities
- **Text References:** "Zwift" mentioned in descriptions and instructions

---

## ⚠️ Potential Issues

### 1. Trademark Usage Without Permission
- We use "Zwift" trademark throughout the app
- We use an orange "Z" that could be confused with Zwift branding
- We reference specific Zwift workout names

### 2. No Official API
- Zwift doesn't have a public API
- We're not using any Zwift data/integration
- We're just recommending their workouts

### 3. No Attribution/Disclaimer
- No disclaimer that we're not affiliated with Zwift
- No trademark attribution (™ or ®)
- Could imply official partnership

---

## ✅ Recommended Actions

### Immediate (Required)

#### 1. Add Trademark Attribution
Add to all pages that mention Zwift:

```jsx
// Add this disclaimer wherever Zwift is mentioned
<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
  Zwift® is a registered trademark of Zwift, Inc. 
  RiderLabs is not affiliated with, endorsed by, or sponsored by Zwift, Inc.
</p>
```

#### 2. Update Text References
Change all instances to include trademark symbol:

```jsx
// Before
"Zwift Workout Recommendation"

// After
"Zwift® Workout Recommendation"
```

#### 3. Add Disclaimer to Terms of Service
Add section about third-party trademarks:

```markdown
## Third-Party Trademarks

Zwift® is a registered trademark of Zwift, Inc. 
RiderLabs is not affiliated with, endorsed by, or sponsored by Zwift, Inc.

All workout recommendations are suggestions only and are not official 
Zwift workouts. Users should verify workout availability in the Zwift 
platform independently.
```

#### 4. Change Icon Design
Replace the orange "Z" with something less brand-specific:

```jsx
// Option 1: Generic indoor icon
<Monitor className="w-5 h-5 text-orange-600" />

// Option 2: Text-based indicator
<span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
  Virtual
</span>

// Option 3: Keep "Z" but add disclaimer
<div className="relative">
  <div className="text-orange-600 font-bold text-lg">Z</div>
  <span className="text-[8px] text-gray-400">™</span>
</div>
```

---

## 📋 Implementation Checklist

### High Priority (Do Now)

- [ ] Add trademark symbol (®) to all "Zwift" mentions
- [ ] Add disclaimer to TodaysWorkout.jsx
- [ ] Add disclaimer to SessionDetail.jsx
- [ ] Add disclaimer to SessionHoverModal.jsx
- [ ] Update Terms of Service with third-party trademark section
- [ ] Consider changing the orange "Z" icon

### Medium Priority (Do Soon)

- [ ] Review all workout name references
- [ ] Add "not affiliated" disclaimer to footer
- [ ] Update Privacy Policy if needed
- [ ] Consider reaching out to Zwift for permission

### Low Priority (Nice to Have)

- [ ] Contact Zwift legal team for official guidance
- [ ] Request permission to use trademark
- [ ] Explore official partnership opportunities

---

## 🎯 Recommended Approach

### Option 1: Minimal Compliance (Safest)
1. Add ® symbol to all Zwift mentions
2. Add clear "not affiliated" disclaimers
3. Keep workout recommendations as "suggestions"
4. Change icon to generic indoor/virtual indicator

### Option 2: Fair Use (Moderate Risk)
1. Add ® symbol and disclaimers
2. Keep current usage as "nominative fair use"
3. Clearly state we're recommending, not providing official content
4. Keep icon but add ™ symbol

### Option 3: Seek Permission (Best Long-term)
1. Contact Zwift legal/partnerships team
2. Request permission to use trademark
3. Explore potential partnership
4. Get official guidelines

---

## 📝 Sample Disclaimer Text

### For Workout Recommendation Sections

```jsx
<div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
  <p className="text-xs text-gray-600 dark:text-gray-400">
    <strong>Disclaimer:</strong> Zwift® is a registered trademark of Zwift, Inc. 
    RiderLabs is not affiliated with, endorsed by, or sponsored by Zwift, Inc. 
    Workout recommendations are suggestions only. Please verify workout availability 
    in the Zwift platform.
  </p>
</div>
```

### For Footer (Global)

```jsx
<p className="text-xs text-gray-500 dark:text-gray-400">
  Zwift® is a registered trademark of Zwift, Inc. 
  Strava® is a registered trademark of Strava, Inc. 
  RiderLabs is not affiliated with, endorsed by, or sponsored by these companies.
</p>
```

---

## ⚖️ Legal Considerations

### Fair Use Defense
We may have a fair use defense because:
- ✅ We're referencing Zwift for identification purposes
- ✅ We're not selling Zwift products
- ✅ We're not implying official partnership
- ✅ We're providing information/recommendations

### Potential Issues
- ⚠️ Orange "Z" could be too similar to Zwift branding
- ⚠️ Workout names might be copyrighted
- ⚠️ Could be seen as implying endorsement

### Best Practice
- ✅ Add clear disclaimers
- ✅ Use ® symbol
- ✅ State "not affiliated"
- ✅ Consider reaching out to Zwift

---

## 🚀 Quick Fix (15 Minutes)

### Immediate Changes to Make

1. **Add to TodaysWorkout.jsx** (after Zwift recommendation section):
```jsx
<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
  Zwift® is a registered trademark of Zwift, Inc. Not affiliated with RiderLabs.
</p>
```

2. **Update all "Zwift" text to "Zwift®"** (find & replace)

3. **Add to Terms of Service:**
```markdown
### Third-Party Trademarks
Zwift® is a registered trademark of Zwift, Inc. RiderLabs is not affiliated 
with, endorsed by, or sponsored by Zwift, Inc.
```

4. **Add to Footer/Settings:**
```jsx
<p className="text-xs text-gray-500">
  Third-party trademarks are property of their respective owners.
</p>
```

---

## 📞 Contact Information

If we want to reach out to Zwift:
- **Email:** legal@zwift.com (typical for legal inquiries)
- **Developer Contact:** developers@zwift.com
- **General:** support@zwift.com

---

## 🎯 Recommendation

**IMMEDIATE ACTION REQUIRED:**

1. ✅ Add ® symbol to all Zwift mentions (5 min)
2. ✅ Add disclaimers to workout recommendation sections (10 min)
3. ✅ Update Terms of Service (5 min)
4. ✅ Consider changing the orange "Z" icon (10 min)

**Total Time:** ~30 minutes to be compliant

**Risk Level:**
- Current: ⚠️ Medium (using trademark without attribution)
- After fixes: ✅ Low (proper attribution and disclaimers)

---

## 📋 Summary

**Current Status:** Using Zwift trademark without proper attribution

**Required Actions:**
1. Add ® symbol
2. Add "not affiliated" disclaimers
3. Update Terms of Service
4. Consider changing icon

**Timeline:** 30 minutes to implement

**Priority:** High (should do before public launch)

---

**Let me know if you want me to implement these changes now!**
