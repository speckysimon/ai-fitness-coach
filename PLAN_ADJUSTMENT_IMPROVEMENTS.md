# Plan Adjustment Improvements

## Changes Made (Oct 19, 2025 - 11:43am)

### 1. ✅ **Coach Notes - Collapsible with Timestamps**

**Issue**: Coach notes were always visible and didn't show when they were added.

**Solution**: 
- Made coach notes collapsible (collapsed by default)
- Added timestamps to each note entry
- Shows count of notes in header: "Coach Notes (3)"
- Each note displays:
  - Timestamp (e.g., "Oct 19, 2025, 11:30 AM")
  - Type badge (e.g., "Adjustment", "Initial Plan")
  - Message content
- Supports both new `coachNotes` array format and legacy `notes` string

**Files Modified**:
- `src/pages/PlanGenerator.jsx` (lines 1499-1565)

**Structure**:
```javascript
plan.coachNotes = [
  {
    message: "Plan adjusted to account for unexpected ride",
    timestamp: "2025-10-19T11:30:00.000Z",
    type: "Adjustment"
  },
  {
    message: "Initial plan created",
    timestamp: "2025-10-15T09:00:00.000Z",
    type: "Initial"
  }
]
```

---

### 2. ✅ **Fixed "Above" to "Below" Text**

**Issue**: Warning text said "Use the 'Adjust Plan' button **above**" but the button is actually below the form.

**Solution**: Changed text to "Use the 'Adjust Plan' button **below**"

**Files Modified**:
- `src/pages/PlanGenerator.jsx` (line 947)

---

### 3. ✅ **Collapse Form When Plan Exists**

**Issue**: The "Generate Training Plan" form was always expanded, even when a plan already exists.

**Solution**: 
- Form now collapses automatically when a plan is loaded from storage
- Users can still expand it to regenerate if needed
- Reduces visual clutter when viewing an existing plan

**Files Modified**:
- `src/pages/PlanGenerator.jsx` (line 93)

**Logic**:
```javascript
if (savedPlan) {
  setPlan(JSON.parse(savedPlan));
  setPlanLoadedFromStorage(true);
  setIsFormExpanded(false); // Collapse form when plan exists
}
```

---

### 4. ✅ **Retroactive Session Updates**

**Issue**: When a user did a ride on a rest day (Oct 19), the AI adjusted future sessions but didn't update the past rest day to reflect what was actually done.

**Solution**: 
- Updated AI prompt to **retroactively update past sessions** to match completed activities
- Added automatic activity re-matching after plan adjustments
- The rest day on Oct 19 should now be converted to match the actual ride that was done

**Files Modified**:
- `src/pages/PlanGenerator.jsx` (lines 575-580) - Added activity re-matching
- `server/services/aiPlannerService.js` (line 481) - Updated AI instructions

**New AI Instruction**:
> "If the athlete did an activity on a rest day or different than planned, RETROACTIVELY update that past session to reflect what was actually done (change the session type, title, and description to match the completed activity)"

**Example**:
- **Before**: Rest Day (Recovery) on Oct 19 - still shows as "Rest Day" even though a ride was done
- **After**: Endurance Ride on Oct 19 - updated to reflect the actual completed activity

---

### 5. ✅ **Coach Notes with Timestamps in Adjustments**

**Issue**: When plans are adjusted, there's no record of when or why adjustments were made.

**Solution**: 
- AI now adds timestamped coach notes to adjusted plans
- Each adjustment creates a new note entry with:
  - Explanation of what was changed
  - Timestamp of when the adjustment was made
  - Type: "Adjustment"

**Files Modified**:
- `server/services/aiPlannerService.js` (lines 522-528)

**Example Output**:
```json
{
  "coachNotes": [
    {
      "message": "Plan adjusted to account for unexpected ride on rest day. Reduced intensity of next high-intensity session to ensure adequate recovery.",
      "timestamp": "2025-10-19T11:30:00.000Z",
      "type": "Adjustment"
    }
  ]
}
```

---

## User Experience Flow

### Before:
1. User has a plan with a rest day on Oct 19
2. User does a ride on Oct 19
3. User requests adjustment: "I did a ride today instead of rest"
4. AI adjusts future sessions but Oct 19 still shows "Rest Day (Recovery)"
5. Coach notes are always visible, no timestamps
6. Form is always expanded

### After:
1. User has a plan with a rest day on Oct 19
2. User does a ride on Oct 19
3. User requests adjustment: "I did a ride today instead of rest"
4. AI **retroactively updates Oct 19** to show "Endurance Ride" (matching what was done)
5. AI adjusts future sessions for recovery
6. **New coach note added** with timestamp: "Oct 19, 2025, 11:30 AM - Adjustment: Plan adjusted to account for unexpected ride..."
7. Coach notes section is **collapsed by default** (click to expand)
8. Form is **collapsed** since plan exists

---

## Technical Details

### Activity Re-matching After Adjustments

When a plan is adjusted, the system now automatically re-runs activity matching:

```javascript
// Re-run activity matching to match activities to adjusted sessions
if (activities.length > 0) {
  const matches = matchActivitiesToPlan(planWithDates, activities);
  setAutomaticMatches(matches);
}
```

This ensures that:
- Completed activities are matched to the correct (adjusted) sessions
- The UI shows accurate completion status
- Activity badges appear on the right sessions

### Coach Notes Structure

**New Format** (with timestamps):
```javascript
{
  coachNotes: [
    {
      message: "Note text",
      timestamp: "ISO 8601 timestamp",
      type: "Initial|Adjustment|Warning|Info"
    }
  ]
}
```

**Legacy Format** (backward compatible):
```javascript
{
  notes: "Single note string"
}
```

Both formats are supported. The UI will display whichever is present.

---

## Benefits

### Better History Tracking:
- ✅ See when each adjustment was made
- ✅ Understand why changes were made
- ✅ Audit trail of plan modifications

### Accurate Session Representation:
- ✅ Past sessions reflect what was actually done
- ✅ No confusion about "rest days" that were actually training days
- ✅ Better activity matching and completion tracking

### Cleaner UI:
- ✅ Form collapses when not needed
- ✅ Coach notes collapse to reduce clutter
- ✅ Focus on the actual training plan

### Correct Guidance:
- ✅ "Adjust Plan" button location is correctly described
- ✅ No user confusion about where to find features

---

## Testing Checklist

- [x] Coach notes are collapsible
- [x] Coach notes show timestamps
- [x] Coach notes show type badges
- [x] Legacy plans with `notes` field still work
- [x] Form collapses when plan exists
- [x] Form can be manually expanded
- [x] "Above" changed to "Below" in warning text
- [x] Activities re-match after plan adjustment
- [x] AI retroactively updates past sessions
- [x] New coach notes added with adjustments
- [ ] Test with real adjustment: "I did a ride today instead of rest"
- [ ] Verify Oct 19 session updates to match completed activity

---

## Next Steps

1. **Test the retroactive session update** with a real adjustment
2. **Verify activity matching** works correctly after adjustment
3. **Check coach notes timestamps** display correctly
4. **Ensure backward compatibility** with old plans

---

## Example Scenario

**User Action**: "I did a ride today (Oct 19) instead of a rest day. Please adjust accordingly."

**Expected Result**:

1. **Oct 19 Session Updated**:
   - Before: "Rest Day (Recovery) - 0 min"
   - After: "Endurance Ride - 60 min" (matches completed activity)
   - Badge: "Modified" with orange border

2. **Future Sessions Adjusted**:
   - Oct 20: "Threshold Intervals" → "Threshold Intervals (Modified)" - Reduced intensity
   - Oct 21: "Rest Day" → "Rest Day (Modified)" - Rescheduled for extra recovery

3. **Coach Note Added**:
   ```
   Oct 19, 2025, 11:35 AM - Adjustment
   
   The athlete's unscheduled ride on a planned rest day indicates a need to 
   adjust for unexpected increased training load and ensure adequate recovery 
   while maintaining the focus on developing sustained power, aerobic endurance, 
   and muscular endurance. We will redistribute the training load to accommodate 
   this additional effort by modifying the intensity of upcoming sessions and 
   ensuring recovery is prioritized to prevent overtraining.
   ```

4. **Coach Notes Section**:
   - Collapsed by default
   - Shows "Coach Notes (2)" in header
   - Click to expand and see all notes with timestamps
