# Adaptive Training Plan Features

## Overview
This document describes the new adaptive training plan features that allow athletes to dynamically adjust their training plans based on real-world circumstances using natural language requests.

## What Was Implemented

### 1. **Adaptive Plan Modal Component** ✅
**File**: `src/components/AdaptivePlanModal.jsx`

A new modal interface that allows athletes to request plan adjustments using natural language. Features:
- Natural language input for adjustment requests
- AI-powered analysis of the request
- Display of proposed changes before applying
- Context-aware suggestions based on completed activities and missed sessions
- Visual feedback for significant changes

**Example Use Cases**:
- "I did a ride today instead of a rest day. Please adjust accordingly."
- "I'm feeling fatigued and need to reduce intensity this week."
- "I missed 3 sessions due to illness. Can you reschedule them?"
- "I have a work trip next week and can only train on weekends."

### 2. **Backend API Endpoint** ✅
**File**: `server/routes/training.js`

New endpoint: `POST /api/training/plan/adjust`

Accepts:
```json
{
  "plan": { /* current training plan */ },
  "activities": [ /* recent activities */ ],
  "completedSessions": { /* completion status */ },
  "adjustmentRequest": "Natural language request",
  "context": { /* additional context */ }
}
```

Returns:
```json
{
  "explanation": "Clear explanation of adjustments",
  "changes": [
    {
      "type": "Session Modification|Rescheduling|etc.",
      "description": "Specific change",
      "sessions": ["Week X, Day Y"]
    }
  ],
  "adjustedPlan": { /* modified plan */ },
  "significantChanges": true/false
}
```

### 3. **AI Service Method** ✅
**File**: `server/services/aiPlannerService.js`

New method: `adjustPlanFromRequest()`

This method:
- Analyzes the current plan state (completion rate, missed sessions)
- Reviews recent activities for context
- Uses GPT-4 to understand the athlete's request
- Generates specific, actionable adjustments
- Maintains training principles (progressive overload, recovery, specificity)
- Marks modified sessions with metadata

### 4. **UI Integration** ✅
**File**: `src/pages/PlanGenerator.jsx`

Added:
- "Adjust Plan" button in the plan header (purple gradient)
- State management for the adaptive modal
- Handler for applying adjustments
- Integration with existing plan storage

## How It Works

### User Flow:
1. Athlete clicks **"Adjust Plan"** button on their training plan
2. Modal opens with a text area for their request
3. Athlete describes what needs to change in natural language
4. AI analyzes:
   - Current plan structure and progress
   - Recent completed activities
   - Missed sessions and reasons
   - The specific request
5. AI generates proposed adjustments with explanations
6. Athlete reviews the changes
7. Athlete can either:
   - Apply the adjustments
   - Go back and edit their request
   - Cancel

### AI Processing:
The AI coach considers:
- **Training principles**: Maintains progressive overload, adequate recovery
- **Context awareness**: Understands recent activities and fatigue
- **Specificity**: Keeps adjustments aligned with event goals
- **Practicality**: Ensures changes are realistic and achievable

### Plan Modifications:
Modified sessions are marked with:
- `modified: true`
- `modificationReason: "Explanation"`

Cancelled sessions are marked with:
- `status: "cancelled"`
- `cancellationReason: "Explanation"`

This allows the UI to visually distinguish adjusted sessions.

## Future Enhancements (Not Yet Implemented)

### 3. **Automatic Rescheduling for Missed Sessions**
When an athlete marks a session as "Missed" with a reason (Illness, Schedule Conflict, Other), the system should:
- Automatically suggest rescheduling options
- Redistribute the missed workload
- Adjust intensity based on the reason (e.g., reduce intensity after illness)
- Prevent overload in catch-up weeks

**Implementation Needed**:
- Add logic in `markSessionMissed()` function
- Create automatic adjustment suggestions
- Prompt user to accept/reject the rescheduling

### 4. **Post-Workout Feedback Loop**
After completing a session, capture how the athlete felt:
- Rate perceived exertion (1-10)
- How did you feel? (Great/Good/Struggled/Exhausted)
- Any issues? (Fatigue, soreness, pain)

Use this data to:
- Adjust upcoming session intensity
- Recommend extra recovery if needed
- Track fatigue trends

**Implementation Needed**:
- Create `PostWorkoutFeedbackModal` component
- Add feedback storage in database
- Integrate feedback into plan adjustment logic

### 5. **Real-Time Load Management**
Automatically adjust plans when:
- Weekly TSS exceeds planned by >20%
- Consecutive high-load weeks detected
- Recovery metrics suggest overtraining
- Recent illness/injury logged

**Implementation Needed**:
- Add monitoring service that runs after each activity sync
- Create automatic adjustment triggers
- Notify athlete of recommended changes

## Technical Details

### Dependencies:
- OpenAI GPT-4 Turbo for natural language understanding
- Existing plan structure and storage
- Activity matching system
- Completion tracking system

### API Rate Limits:
- Each adjustment request makes 1 OpenAI API call
- Estimated cost: ~$0.01-0.03 per adjustment
- Fallback to original plan if API fails

### Error Handling:
- Validates adjusted plan structure
- Falls back to original plan on errors
- Provides user-friendly error messages
- Logs errors for debugging

## Testing Recommendations

### Test Cases:
1. **Simple adjustment**: "Reduce intensity by 10% this week"
2. **Rescheduling**: "Move Tuesday's workout to Wednesday"
3. **Missed sessions**: "I missed 3 workouts due to illness, help me catch up"
4. **Schedule conflict**: "I can't train Monday-Wednesday next week"
5. **Fatigue**: "I'm feeling very tired, need more recovery"
6. **Extra work**: "I did an extra ride today, adjust the plan"

### Edge Cases:
- Empty or very short requests
- Requests that conflict with training principles
- Requests for past weeks
- Multiple simultaneous adjustments

## Usage Examples

### Example 1: Extra Activity
**Request**: "I did a ride today instead of a rest. Please adjust accordingly"

**AI Response**:
- Explanation: "Since you completed an additional ride on your rest day, I've adjusted your plan to ensure adequate recovery. I've converted tomorrow's tempo session to an easy recovery ride and shifted the tempo work to later in the week."
- Changes: Modified 2 sessions in Week 3
- Result: Maintains training load while ensuring recovery

### Example 2: Illness Recovery
**Request**: "I was sick for a week and missed 4 sessions. Help me get back on track"

**AI Response**:
- Explanation: "After illness, it's important to ease back gradually. I've reduced intensity for your first week back by 20% and redistributed the missed key workouts across the next 2 weeks to avoid overload."
- Changes: Modified 6 sessions across Weeks 4-6
- Result: Safe return to training with maintained progression

### Example 3: Schedule Conflict
**Request**: "I have a work trip next week and can only train on weekends"

**AI Response**:
- Explanation: "I've consolidated your key workouts to Saturday and Sunday, combining some elements to maintain training stimulus. Weekday sessions are marked as optional easy spins if you have time."
- Changes: Rescheduled 5 sessions in Week 5
- Result: Maintains training quality despite constraints

## Benefits

### For Athletes:
- ✅ Flexible training that adapts to real life
- ✅ Natural language interface (no complex forms)
- ✅ Maintains training principles automatically
- ✅ Clear explanations of why changes are made
- ✅ Preview changes before applying

### For Coaches:
- ✅ Reduces manual plan adjustments
- ✅ Consistent application of training principles
- ✅ Scales to many athletes
- ✅ Maintains plan quality

### For the Platform:
- ✅ Differentiating feature
- ✅ Increases user engagement
- ✅ Reduces plan abandonment
- ✅ Demonstrates AI value

## Next Steps

1. **Test the feature** with real user scenarios
2. **Gather feedback** on adjustment quality
3. **Implement automatic rescheduling** for missed sessions
4. **Add post-workout feedback** mechanism
5. **Create load management** monitoring
6. **Add adjustment history** tracking
7. **Enable undo/redo** for adjustments

## Notes

- The feature is now live and ready for testing
- Requires OpenAI API key in environment variables
- Works with existing plan structure
- No database schema changes required
- Fully integrated with current UI/UX
