# Improved Coach Personas Implementation Plan

## Overview
Add behavioral fields to Coach admin (DB + UI) to create behaviourally constrained coaching logic that goes beyond just tone/personality differences.

## Implementation Steps

### 1. Add Behavioral Fields to Coach Admin (DB + UI)

**Add enums:**
- `bias` (push|balance|protect|contextual)
- `loadTolerance` (low|med|high)
- `fatigueSensitivity` (high|med|low)
- `planAdherence` (strict|flexible|adaptive)
- `feedbackStyle` (direct|balanced|supportive) - **Optional but very useful**

**Note on feedbackStyle:** This governs how blunt/soft the coach is when delivering bad news (separate from bias/tone). Tone alone won't do it reliably.

Keep your existing tone/personality fields as "voice", not decision logic.

### 2. Create a Single Backend "Coach Profile" Loader

**`getCoachProfile(coachId)`** returns:
```javascript
{
  name,
  tone,
  personalityText,
  behaviour: {
    bias,
    loadTolerance,
    fatigueSensitivity,
    planAdherence,
    feedbackStyle
  }
}
```

Cache it (short TTL) so every feature can reuse it cheaply.

### 3. Implement `buildCoachRules()` (Code-Generated Rules from Enums)

Convert behaviour enums into a compact block of deterministic instructions (no free-text).

**Output both structured and text:**

1. **Compact instruction block for the LLM** (text):
   - Priorities
   - Red flags
   - What to do when signals conflict
   - How to treat athlete requests

2. **Small object for internal use** (structured):
   ```javascript
   {
     recommendationBias,
     escalationAllowed,
     recoveryStrictness
   }
   ```

This lets you enforce a couple of guardrails without relying on the model.

### 4. Refactor Prompts to Use a Common Wrapper

Create `wrapWithCoachContext({ coachProfile, taskPrompt })`

**Wrapper order:**
1. Coach Rules
2. Voice/Tone
3. Athlete Context
4. Task

### 5. Update `generateTrainingPlan()` to Inject Coach Rules

- Pass `coachProfile` into `buildPlanPrompt()`
- Insert `buildCoachRules()` output near the top of the system prompt (before athlete context)

### 6. Update `adjustPlanFromRequest()` Next (Highest Impact)

- Same injection: coach rules first
- **Don't fully remove athlete priority — change it to a rule:**

**Athlete Request Handling by planAdherence:**
- **strict**: Comply only if it doesn't violate recovery / overload rules
- **flexible**: Comply with minimal disruption
- **adaptive**: Re-plan the microcycle around the request

This keeps it realistic and prevents "Nigel ignores user requests always" or "Sam always says yes".

### 7. Update `analyzeWorkout()` Third

Use the same coach wrapper so grading/execution feedback matches persona behaviour.

### 8. Add a Lightweight, Deterministic "Week Assessment" Helper (Optional but Strong)

**`assessWeek(metrics)`** returns labels:
- `loadTrend`
- `riskFlags`
- `completionRateBand`

Feed labels into prompts so coaches start from the same facts but judge them differently.

### 9. Regression Test Pass

Do one regression test pass with identical inputs across 3 coaches:
- Same week → Nigel/Jordan/Sam outputs should diverge in decisions, not just tone
- Lock this as a repeatable test case

**Define what "diverge" means with objective acceptance criteria:**

- **Nigel (strict/direct)**: Must include at least one accountability statement when compliance < 80%
- **Sam (flexible/supportive)**: Must recommend reduction when fatigue flag present
- **Jordan (analytical/balanced)**: Must reference trend/ratio when loadTrend=up

Otherwise you'll get "different wording" and think it's working when it's not.

### 10. Only Then Revisit Weekly Report / Dashboard Copy

Now the UI text will naturally become more consistent and "coach-like" because the underlying behaviour is real.

## Benefits

- **Behaviourally Constrained Coaching Logic**: Coaches make different decisions, not just sound different
- **Reusable Profile System**: Single source of truth for coach behavior
- **Consistent Experience**: All features use same coach logic
- **Testable**: Can verify coaches behave differently with same inputs
- **Scalable**: Easy to add new coaches or modify existing ones
