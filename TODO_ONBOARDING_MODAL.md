# Multi-Step Onboarding Modal - TODO

**Priority:** High  
**Estimated Time:** 2-3 hours  
**Date Created:** November 7, 2025

---

## 🎯 Goal

Transform the current single-step onboarding modal into a guided multi-step flow that completes user setup in one seamless experience.

---

## 📋 Current State

**Existing Flow:**
```
Register → Profile Setup → Dashboard → Onboarding Modal → Strava Connection
```

**Problems:**
- ❌ Skips coach selection
- ❌ Skips plan generation
- ❌ Users get lost after Strava connection
- ❌ Low completion rate for critical setup steps

---

## ✅ Desired Flow

**New Multi-Step Modal:**
```
Step 1: Welcome Screen (current)
    ↓
Step 2: Connect Strava
    ↓
Step 3: Choose Your Coach
    ↓
Step 4: Generate First Plan
    ↓
Step 5: Success! → Dashboard
```

---

## 🛠️ Implementation Tasks

### **Task 1: Update OnboardingModal Component** (1 hour)

**File:** `src/components/OnboardingModal.jsx`

- [ ] Add step state management (`currentStep` from 1-5)
- [ ] Add progress indicator (1 of 5, 2 of 5, etc.)
- [ ] Add "Back" button for navigation
- [ ] Add step transitions with animations

**Step 1 - Welcome (Keep Current)**
- [ ] Show benefits cards
- [ ] Primary CTA: "Get Started" → setCurrentStep(2)

**Step 2 - Connect Strava**
- [ ] Same as current modal
- [ ] Primary CTA: "Connect Strava Now" → OAuth flow
- [ ] On OAuth return: setCurrentStep(3)
- [ ] Secondary: "Skip for now" → setCurrentStep(3)

**Step 3 - Choose Your Coach** (NEW)
- [ ] Fetch coach personas from Settings
- [ ] Display 5 coaches with avatars
- [ ] Show personality descriptions
- [ ] Primary CTA: "Choose [Coach Name]" → Save to settings
- [ ] Secondary: "Skip for now" → Default to Coach Alex

**Step 4 - Generate First Plan** (NEW)
- [ ] Simplified plan form:
  - Event type dropdown
  - Event date picker
  - Duration slider (4-12 weeks)
- [ ] Primary CTA: "Generate My Plan" → API call
- [ ] Show loading state with encouraging messages
- [ ] On success: setCurrentStep(5)
- [ ] Secondary: "Skip for now" → setCurrentStep(5)

**Step 5 - Success!** (NEW)
- [ ] Celebration screen (confetti animation)
- [ ] "Your plan is ready!" message
- [ ] Summary of what was completed
- [ ] CTA: "Start Training" → Close modal

---

### **Task 2: Update Dashboard Logic** (30 minutes)

**File:** `src/pages/Dashboard.jsx`

- [ ] Add `onboardingComplete` state
- [ ] Check localStorage for completion status
- [ ] Show modal if incomplete
- [ ] Track completion in analytics

```javascript
const [onboardingComplete, setOnboardingComplete] = useState(() => {
  return localStorage.getItem('onboarding_complete') === 'true';
});
```

---

### **Task 3: Add Onboarding Checklist Widget** (30 minutes)

**File:** `src/components/OnboardingChecklist.jsx` (NEW)

- [ ] Create new component
- [ ] Show progress (X of 4 steps complete)
- [ ] Display checklist with icons:
  - ✅ Profile created
  - ✅ Strava connected
  - ⏳ Choose your coach
  - ⏳ Generate training plan
- [ ] Click items to complete them
- [ ] Show on Dashboard if onboarding incomplete

---

### **Task 4: Analytics Tracking** (15 minutes)

**File:** `src/lib/analytics.js`

- [ ] Add new funnel events:
  - `onboardingWelcomeSeen`
  - `onboardingStravaConnected`
  - `onboardingCoachSelected`
  - `onboardingPlanGenerated`
  - `onboardingCompleted`

---

### **Task 5: Persistence & State Management** (15 minutes)

- [ ] Save onboarding progress to localStorage
- [ ] Track current step
- [ ] Allow resuming from last step
- [ ] Clear on completion

**localStorage keys:**
- `onboarding_step` - Current step (1-5)
- `onboarding_complete` - Boolean
- `onboarding_coach_selected` - Boolean
- `onboarding_plan_generated` - Boolean

---

## 🎨 UI/UX Considerations

### **Progress Indicator**
```
[●]━━━[○]━━━[○]━━━[○]━━━[○]
Step 1 of 5: Welcome
```

### **Step Navigation**
- Back button (except on step 1)
- Skip button (optional steps)
- Next/Continue button
- Close X (dismisses entire modal)

### **Animations**
- Fade in/out between steps
- Slide transitions
- Confetti on completion

---

## 📊 Success Metrics

**Before:**
- 40% connect Strava
- 20% generate plan
- 10% choose coach

**After (Target):**
- 70% complete full onboarding
- 60% have a plan ready
- 50% have chosen a coach

---

## 🚨 Edge Cases to Handle

1. **User closes modal mid-flow**
   - Save progress to localStorage
   - Resume from last step on next visit

2. **Strava OAuth fails**
   - Show error message
   - Allow retry or skip

3. **Plan generation fails**
   - Show error with retry button
   - Allow skip to complete onboarding

4. **User already has Strava/Plan**
   - Skip those steps automatically
   - Only show incomplete steps

---

## 📝 Notes

- Keep current modal as fallback
- Test on mobile (modal should be responsive)
- Add loading states for all async operations
- Ensure accessibility (keyboard navigation, ARIA labels)
- Test with slow network connections

---

## ✅ Definition of Done

- [ ] All 5 steps implemented and functional
- [ ] Progress saved to localStorage
- [ ] Analytics tracking in place
- [ ] Checklist widget shows on Dashboard
- [ ] Mobile responsive
- [ ] Dark mode support
- [ ] Error handling for all steps
- [ ] Tested with real user flow
- [ ] Documentation updated

---

## 🔗 Related Files

- `src/components/OnboardingModal.jsx` - Main modal
- `src/components/OnboardingChecklist.jsx` - Checklist widget (NEW)
- `src/pages/Dashboard.jsx` - Modal trigger
- `src/lib/analytics.js` - Tracking
- `src/pages/Settings.jsx` - Coach selection reference

---

**Start Date:** November 8, 2025  
**Target Completion:** November 8, 2025 (same day)
