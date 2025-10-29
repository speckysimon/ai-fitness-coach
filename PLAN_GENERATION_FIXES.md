# Training Plan Generation Fixes

**Date:** October 28, 2025, 7:58pm  
**Status:** ✅ COMPLETE

## Problems Fixed

### 1. **Missing Weeks in Generated Plans**
**Issue:** AI was sometimes returning incomplete plans with missing weeks (e.g., Week 2 but no Week 1)

**Root Cause:** AI prompt wasn't emphatic enough about returning ALL weeks

**Solution:**
- Strengthened AI prompt with **CRITICAL** emphasis
- Added explicit warning: "If you generate fewer than X weeks, the plan will be incomplete and broken"
- Added frontend validation to detect and alert when AI returns wrong number of weeks

### 2. **Form Data Disappearing After Plan Generation**
**Issue:** When regenerating a plan, the original event details (name, date, type, etc.) were lost

**Root Cause:** Form data was never restored from the saved plan's goals

**Solution:**
- Modified `loadPlanFromBackend()` to restore form data from `plan.goals`
- Applies to both localStorage and backend-loaded plans
- Form is now pre-populated with original event details when regenerating

### 3. **Goals Not Saved with Plan**
**Issue:** Original plan parameters weren't stored, so AI couldn't reference them during regeneration

**Root Cause:** Goals object wasn't being saved as part of the plan

**Solution:**
- Added `plan.goals` object when generating new plans
- Stores all original parameters: eventName, eventDate, startDate, eventType, priority, daysPerWeek, maxHoursPerWeek, preference, aiContext, duration
- Goals persist through localStorage and backend storage

## Files Modified

### Frontend
**File:** `src/pages/PlanGenerator.jsx`

**Changes:**
1. **loadPlanFromBackend()** - Lines 108-172
   - Added form data restoration from `plan.goals`
   - Works for both localStorage and backend sources
   
2. **generatePlan()** - Lines 752-763
   - Added `plan.goals` object creation
   - Stores all form data for future regeneration
   
3. **generatePlan()** - Lines 745-749
   - Added validation check for correct number of weeks
   - Alerts user if AI returns incomplete plan

### Backend
**File:** `server/services/aiPlannerService.js`

**Changes:**
1. **buildPlanPrompt()** - Lines 206-213
   - Strengthened PERIODIZATION requirements
   - Added **CRITICAL** emphasis
   - Added explicit warning about incomplete plans
   - Added "DO NOT SKIP ANY WEEKS" instruction

## How It Works Now

### Plan Generation Flow
```
1. User fills form with event details
2. Click "Generate Plan"
3. AI generates plan with all weeks
4. Frontend validates week count
5. Plan saved with goals object
6. Form collapses but data preserved
```

### Plan Regeneration Flow
```
1. User clicks "Regenerate Plan"
2. Form expands with original data pre-filled
3. User can modify or keep original details
4. Click "Generate Plan"
5. AI uses updated parameters
6. New plan generated with all weeks
7. Goals saved again for next time
```

### Data Structure

**Plan Object:**
```javascript
{
  planSummary: "...",
  weeks: [...],
  eventType: "Endurance",
  generatedAt: "2025-10-28T...",
  coachNotes: [...],
  goals: {
    eventName: "Spring Century",
    eventDate: "2025-05-15",
    startDate: "2025-03-01",
    eventType: "Endurance",
    priority: "High Priority",
    daysPerWeek: 5,
    maxHoursPerWeek: 10,
    preference: "Both",
    aiContext: "Focus on climbing",
    duration: 10
  }
}
```

## Testing Checklist

- [x] Generate new plan - goals saved
- [x] Reload page - form data restored
- [x] Regenerate plan - form pre-filled
- [x] AI returns all weeks - validation passes
- [x] AI returns incomplete weeks - user alerted
- [x] Goals persist in localStorage
- [x] Goals persist in backend database

## Benefits

1. **No More Missing Weeks** - AI explicitly told to return all weeks, with validation
2. **Seamless Regeneration** - Form remembers original event details
3. **Data Persistence** - Goals saved with plan for future reference
4. **Better UX** - Users don't have to re-enter event details
5. **Error Detection** - System alerts if AI returns incomplete plan

## Future Enhancements

- Add retry logic if AI returns incomplete plan
- Show diff between original and regenerated plan
- Allow editing goals without full regeneration
- Add "Duplicate Plan" feature using saved goals

---

**Status:** Production Ready ✅  
**Impact:** Critical bug fixes for core feature  
**Testing:** Manual testing complete
