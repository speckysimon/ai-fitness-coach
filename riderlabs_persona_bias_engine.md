# RiderLabs – Persona Bias Engine & Coaching Architecture

## Purpose

Refactor RiderLabs from a tone-based AI persona system into a deterministic, philosophy-driven coaching engine.

Personas must:
- Influence planning logic
- Influence fatigue response
- Influence race build strategy
- Influence post-ride interpretation
- Influence taper behaviour
- Influence messaging tone

Personas must NOT:
- Alter raw physiological data
- Distort interpretation signals
- Override safety guardrails
- Create inconsistent logic across modules

This document defines the architecture and implementation principles.

---

# Core Philosophy

RiderLabs is a **coaching interpretation layer**, not a data viewer.

Architecture:

```
Raw Streams  
→ Interpretation Engine (deterministic, objective)  
→ Context Layer (phase, fatigue, race proximity)  
→ Persona Bias Engine (stable coaching philosophy)  
→ Planning & Recommendation Decisions  
→ AI Narrative Layer (low token, structured output)
```

Persona modifies reaction thresholds and planning bias — not physiological truth.

---

# Coaching Personas

Three stable philosophies:

## 1. Durability-Focused
Core belief: Long-term aerobic depth is priority.

- Conservative ramp (3–4%)
- Early fatigue intervention
- Longer base phase
- Longer tapers
- Low tolerance for drift
- Emphasis on consolidation weeks

## 2. Balanced Race-Performance (Default)
Core belief: Build durability, layer race specificity intelligently.

- Moderate ramp (4–6%)
- Trend-based fatigue decisions
- Structured intensity layering
- 5–7 day taper
- Moderate drift tolerance
- Emphasis on fatigue resistance

## 3. Aggressive Race-Performance
Core belief: Stimulus drives adaptation; racing sharpness matters.

- Higher ramp (6–8% within safety bounds)
- Higher fatigue tolerance
- More race-pace work
- Shorter tapers
- Later intervention thresholds

---

# Persona Bias Profile (Deterministic Schema)

Each persona is defined as a parameter object:

```ts
CoachBiasProfile {
  driftModerate: number       // Decoupling % threshold for "moderate" warning
  driftHigh: number           // Decoupling % threshold for "high" warning
  viSteady: number            // Variability Index threshold for "steady" effort

  rampMin: number             // Minimum weekly TSS ramp %
  rampMax: number             // Maximum weekly TSS ramp %

  intensityDaysMax: number    // Max high-intensity days per week

  taperDays: {
    min: number               // Minimum taper duration (days)
    max: number               // Maximum taper duration (days)
  }

  fatigueSensitivity: 'high' | 'medium' | 'low'
  missedSessionPolicy: 'protect' | 'resequence' | 'compress'
}
```

---

# Implementation Principles

## 1. Deterministic Decision Points

Persona bias applies at specific decision nodes:

- **Plan Generation**: Ramp rate, intensity distribution, recovery weeks
- **Fatigue Response**: Intervention threshold, recovery prescription
- **Race Build**: Taper length, intensity timing, specificity window
- **Post-Ride Analysis**: Drift interpretation, effort quality assessment
- **Adjustment Logic**: Missed session handling, illness response

## 2. Separation of Concerns

```
Data Layer (objective)
  ↓
Interpretation Layer (deterministic rules)
  ↓
Persona Bias Layer (philosophy-driven thresholds)
  ↓
Decision Layer (planning/recommendations)
  ↓
AI Narrative Layer (tone + explanation)
```

## 3. Safety Guardrails

Persona bias operates **within bounds**:

- Absolute max ramp: 10% (overrides persona)
- Minimum recovery: 1 day per 7 (overrides persona)
- Injury risk flags: Always surface (persona cannot suppress)
- Decoupling >15%: Always flag (persona adjusts response severity)

---

# Current State vs Target State

## Current (Tone-Based)

```js
// Persona only affects AI narrative tone
const coach = getCoachPersona(coachId);
const prompt = `You are ${coach.name}, ${coach.style}. ${coach.personality}`;
// No influence on planning logic
```

## Target (Bias-Driven)

```js
// Persona drives planning decisions
const biasProfile = getCoachBiasProfile(coachId);

// Planning uses bias thresholds
const weeklyRamp = clamp(
  calculateOptimalRamp(athlete),
  biasProfile.rampMin,
  biasProfile.rampMax
);

// Fatigue response uses bias sensitivity
if (fatigueScore > getFatigueThreshold(biasProfile)) {
  applyRecoveryWeek(biasProfile.missedSessionPolicy);
}

// AI narrative reflects decisions made
const narrative = generateNarrative(decisions, coach.tone);
```

---

# Migration Path

## Phase 1: Define Bias Profiles
- Create `coachBiasProfiles.js` with 3 stable profiles
- Map existing persona IDs to bias profiles
- Add bias profile to coach context

## Phase 2: Refactor Planning Logic
- Extract decision thresholds to bias-aware functions
- Replace hardcoded values with bias profile lookups
- Add bias profile parameter to planning service

## Phase 3: Refactor Fatigue & Adjustment Logic
- Move fatigue thresholds to bias profiles
- Update missed session handling
- Update illness/injury response

## Phase 4: Refactor Race Build
- Taper length from bias profile
- Intensity timing from bias profile
- Specificity window from bias profile

## Phase 5: Update AI Narrative Layer
- Reduce AI prompt size (no personality in prompt)
- AI explains decisions already made (not making decisions)
- Tone remains persona-specific

---

# File Structure

```
src/lib/
  coachBiasProfiles.js          # Bias profile definitions
  coachPersonas.js              # UI/tone persona definitions (existing)

server/services/
  planningService.js            # Uses bias profiles for decisions
  fatigueService.js             # Uses bias profiles for thresholds
  racePreparationService.js     # Uses bias profiles for taper/build

server/routes/
  training.js                   # Passes bias profile to services
```

---

# Example: Durability-Focused Bias Profile

```js
export const DURABILITY_FOCUSED = {
  id: 'durability',
  name: 'Durability-Focused',
  
  driftModerate: 3.5,    // Flag drift at 3.5% (conservative)
  driftHigh: 6.0,        // High warning at 6%
  viSteady: 1.05,        // VI must be very steady (<1.05)
  
  rampMin: 3,            // Min 3% weekly increase
  rampMax: 4,            // Max 4% weekly increase
  
  intensityDaysMax: 2,   // Max 2 hard days per week
  
  taperDays: {
    min: 7,              // Minimum 7-day taper
    max: 14              // Up to 14-day taper
  },
  
  fatigueSensitivity: 'high',
  missedSessionPolicy: 'protect'  // Protect recovery, don't compress
};
```

---

# Testing Strategy

## Unit Tests
- Bias profile application at decision nodes
- Safety guardrail enforcement
- Threshold calculations

## Integration Tests
- Full plan generation with each bias profile
- Fatigue response scenarios
- Missed session handling

## Validation
- Compare plans generated with different bias profiles
- Verify safety bounds never violated
- Confirm AI narrative matches decisions

---

# Success Criteria

1. **Deterministic**: Same input + same bias profile = same plan
2. **Transparent**: User can see which bias influenced which decision
3. **Safe**: Safety guardrails always enforced
4. **Consistent**: Bias applies uniformly across all modules
5. **Maintainable**: Clear separation between data, logic, bias, and narrative
