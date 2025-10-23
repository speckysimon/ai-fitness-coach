# Adaptive Training System - Product Specification

**Status:** Planning Phase  
**Priority:** HIGH  
**Estimated Time:** 3-4 weeks  
**Value:** Core Product Differentiator

---

## 🎯 Vision

**Build a fully AI-driven adaptive training system that automatically adjusts your training plan based on:**
- Actual performance vs planned workouts
- Illness/injury periods
- Form & Fitness (CTL, ATL, TSB)
- Life stress & recovery
- Race schedule changes
- Weather conditions
- Equipment availability

**Goal:** Your training plan evolves with you, not against you.

---

## 💡 The Problem

### **Current State (Static Plans)**
- User generates a training plan
- Plan is fixed for 8-12 weeks
- Life happens: illness, work stress, missed workouts
- Plan becomes outdated and unrealistic
- User feels guilty, loses motivation
- Plan is abandoned

### **Desired State (Adaptive Plans)**
- User generates initial training plan
- AI monitors actual performance daily
- Plan automatically adjusts to reality
- User stays on track despite life events
- Motivation maintained
- Goals still achievable

---

## 🧠 Core Concept: The Adaptive Loop

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  1. GENERATE PLAN                               │
│     ↓                                           │
│  2. EXECUTE WORKOUT                             │
│     ↓                                           │
│  3. MEASURE PERFORMANCE                         │
│     ↓                                           │
│  4. ANALYZE DEVIATION                           │
│     ↓                                           │
│  5. AI DECISION: Adjust or Continue?            │
│     ↓                                           │
│  6. UPDATE PLAN (if needed)                     │
│     ↓                                           │
│  7. NOTIFY USER                                 │
│     ↓                                           │
│  Back to step 2 ───────────────────────────────┘
```

---

## 📊 Data Inputs for Adaptation

### **1. Actual Activity Data (from Strava)**
```javascript
{
  planned: {
    type: "Threshold",
    duration: 60,
    tss: 75,
    power: 250,
    date: "2025-10-10"
  },
  actual: {
    type: "Ride",
    duration: 45,      // 15 min shorter
    tss: 55,           // 20 TSS less
    avgPower: 230,     // 20W lower
    date: "2025-10-10",
    completed: true
  },
  deviation: {
    duration: -25%,    // Significant
    tss: -27%,         // Significant
    power: -8%,        // Minor
    severity: "moderate"
  }
}
```

### **2. Illness/Injury Log**
```javascript
{
  id: 1,
  type: "illness",        // or "injury"
  category: "cold",       // cold, flu, injury, fatigue
  severity: "moderate",   // minor, moderate, severe
  startDate: "2025-10-08",
  endDate: "2025-10-12",  // null if ongoing
  daysOff: 4,
  notes: "Head cold, felt weak",
  impactedWorkouts: [
    { date: "2025-10-08", planned: 75, actual: 0 },
    { date: "2025-10-09", planned: 60, actual: 0 },
    { date: "2025-10-10", planned: 90, actual: 0 },
    { date: "2025-10-11", planned: 45, actual: 0 }
  ]
}
```

### **3. Form & Fitness Metrics**
```javascript
{
  date: "2025-10-10",
  ctl: 85,        // Chronic Training Load (Fitness)
  atl: 95,        // Acute Training Load (Fatigue)
  tsb: -10,       // Training Stress Balance (Form)
  rampRate: -5,   // CTL change per week
  trend: "declining",
  status: "fatigued",
  recommendation: "recovery needed"
}
```

### **4. User Feedback (Optional)**
```javascript
{
  date: "2025-10-10",
  feeling: "tired",      // great, good, okay, tired, exhausted
  sleepQuality: 6,       // 1-10
  stress: 7,             // 1-10
  soreness: 5,           // 1-10
  motivation: 4,         // 1-10
  notes: "Busy week at work"
}
```

### **5. Race Schedule**
```javascript
{
  targetRace: {
    name: "Club Championship",
    date: "2025-11-15",
    daysUntil: 36,
    priority: "A",
    status: "on_track"  // on_track, behind, ahead
  }
}
```

---

## 🤖 AI Adaptation Logic

### **Scenario 1: Missed Workout (Illness)**

**Input:**
- Planned: 75 TSS threshold workout
- Actual: 0 TSS (sick day)
- Illness logged: "Cold, moderate severity"
- Days off: 3 days

**AI Analysis:**
```javascript
const analysis = {
  issue: "Illness - 3 consecutive days off",
  ctlImpact: -3.5,  // Estimated CTL loss
  weeklyTssDeficit: 210,  // Missed TSS
  recoveryNeeded: 2,  // Additional recovery days
  planAdjustment: "moderate"
};
```

**AI Decision:**
```javascript
const decision = {
  action: "adjust_plan",
  changes: [
    {
      week: "current",
      adjustment: "Add 2 recovery days, reduce intensity 20%"
    },
    {
      week: "next",
      adjustment: "Gradual ramp-up, start at 80% volume"
    },
    {
      week: "+2",
      adjustment: "Return to normal progression"
    }
  ],
  raceImpact: {
    targetRace: "Club Championship",
    impact: "minor",
    newPeakFitness: 92,  // Down from 95
    stillAchievable: true,
    message: "You can still hit your goal with adjusted plan"
  }
};
```

**User Notification:**
```
🤖 AI Training Adjustment

Your plan has been updated based on your recent illness.

CHANGES:
• This week: 2 extra recovery days added
• Next week: Reduced intensity (80% of original)
• Week after: Back to normal progression

RACE IMPACT:
• Target: Club Championship (Nov 15)
• Status: Still on track ✅
• Adjusted peak fitness: 92 CTL (was 95)

You've got this! Focus on recovery now.

[View Updated Plan]
```

---

### **Scenario 2: Consistently Underperforming**

**Input:**
- Last 7 days: 6 workouts completed
- Average TSS: 15% below planned
- Average power: 10W below target
- TSB: -15 (very fatigued)

**AI Analysis:**
```javascript
const analysis = {
  issue: "Chronic underperformance - overreaching",
  pattern: "7 days of reduced output",
  tsbTrend: "declining",
  riskLevel: "high",
  likelyReason: "accumulated fatigue",
  recommendation: "immediate_recovery"
};
```

**AI Decision:**
```javascript
const decision = {
  action: "recovery_week",
  changes: [
    {
      immediate: "Replace next 3 days with easy rides (Zone 1-2)"
    },
    {
      thisWeek: "Reduce total TSS by 40%"
    },
    {
      nextWeek: "Recovery week (50% normal volume)"
    }
  ],
  reasoning: "Your body needs rest. Pushing through will lead to injury or burnout.",
  expectedOutcome: {
    tsbIn7Days: 5,  // Fresh
    ctlLoss: -2,    // Minimal fitness loss
    longTermGain: "Prevent overtraining, maintain consistency"
  }
};
```

---

### **Scenario 3: Crushing Workouts (Ahead of Plan)**

**Input:**
- Last 7 days: All workouts completed
- Average TSS: 10% above planned
- Average power: 15W above target
- TSB: +5 (fresh and strong)
- Race in 6 weeks

**AI Analysis:**
```javascript
const analysis = {
  issue: "Performing above expectations",
  pattern: "Consistent overperformance",
  tsbTrend: "stable",
  riskLevel: "low",
  opportunity: "accelerate_progression"
};
```

**AI Decision:**
```javascript
const decision = {
  action: "increase_load",
  changes: [
    {
      nextWeek: "Increase TSS by 10%"
    },
    {
      week2: "Add one high-intensity session"
    },
    {
      week3: "Maintain increased load"
    }
  ],
  reasoning: "You're adapting well. Let's capitalize on this fitness.",
  expectedOutcome: {
    peakFitness: 98,  // Up from 95
    raceReadiness: "excellent",
    confidence: "You'll be in the best shape of your life!"
  }
};
```

---

### **Scenario 4: Race Date Changed**

**Input:**
- Original race date: Nov 15 (6 weeks away)
- New race date: Nov 8 (4 weeks away)
- Current CTL: 80
- Target CTL: 95

**AI Analysis:**
```javascript
const analysis = {
  issue: "Race moved up by 7 days",
  timeRemaining: 28,  // days
  currentFitness: 80,
  targetFitness: 95,
  gap: 15,
  feasibility: "challenging but possible"
};
```

**AI Decision:**
```javascript
const decision = {
  action: "compress_plan",
  changes: [
    {
      week1: "High-volume block (500 TSS)"
    },
    {
      week2: "Maintain high volume (480 TSS)"
    },
    {
      week3: "Taper begins (350 TSS)"
    },
    {
      week4: "Race week (200 TSS)"
    }
  ],
  adjustedTarget: {
    peakFitness: 92,  // Realistic given time
    message: "We can get you to 92 CTL - still competitive!"
  },
  warning: "This is an aggressive ramp. Monitor fatigue closely."
};
```

---

## 🏗️ Technical Implementation

### **Database Schema**

```sql
-- Adaptation Events
CREATE TABLE adaptation_events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  event_type TEXT NOT NULL,  -- 'illness', 'injury', 'underperform', 'overperform', 'race_change'
  severity TEXT,  -- 'minor', 'moderate', 'severe'
  start_date DATE NOT NULL,
  end_date DATE,
  data_json TEXT,  -- Full event data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Plan Adjustments
CREATE TABLE plan_adjustments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  plan_id INTEGER,  -- Reference to training plan
  adaptation_event_id INTEGER REFERENCES adaptation_events(id),
  adjustment_type TEXT,  -- 'recovery', 'increase', 'compress', 'extend'
  changes_json TEXT,  -- Detailed changes
  ai_reasoning TEXT,  -- Why AI made this decision
  user_accepted BOOLEAN DEFAULT NULL,  -- User can accept/reject
  applied_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Wellness Log (Optional)
CREATE TABLE wellness_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  feeling TEXT,  -- 'great', 'good', 'okay', 'tired', 'exhausted'
  sleep_quality INTEGER,  -- 1-10
  stress_level INTEGER,  -- 1-10
  soreness INTEGER,  -- 1-10
  motivation INTEGER,  -- 1-10
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Workout Comparisons (Planned vs Actual)
CREATE TABLE workout_comparisons (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  planned_tss REAL,
  actual_tss REAL,
  planned_duration INTEGER,
  actual_duration INTEGER,
  planned_power REAL,
  actual_power REAL,
  deviation_severity TEXT,  -- 'none', 'minor', 'moderate', 'severe'
  strava_activity_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### **API Endpoints**

```javascript
// Log illness/injury
POST /api/adaptation/illness
Body: {
  type: "illness",
  category: "cold",
  severity: "moderate",
  startDate: "2025-10-08",
  endDate: "2025-10-12",
  notes: "Head cold"
}

// Log wellness (optional daily check-in)
POST /api/adaptation/wellness
Body: {
  date: "2025-10-10",
  feeling: "tired",
  sleepQuality: 6,
  stress: 7,
  soreness: 5,
  motivation: 4,
  notes: "Busy week"
}

// Trigger plan analysis
POST /api/adaptation/analyze
Returns: {
  needsAdjustment: true,
  recommendation: {...},
  changes: [...]
}

// Accept/reject AI adjustment
POST /api/adaptation/adjustments/:id/accept
POST /api/adaptation/adjustments/:id/reject

// Get adaptation history
GET /api/adaptation/history
Returns: [
  {
    date: "2025-10-08",
    event: "illness",
    adjustment: "recovery week added",
    impact: "minor"
  }
]
```

---

### **AI Service**

```javascript
// services/adaptiveTrainingService.js

class AdaptiveTrainingService {
  
  async analyzeAndAdapt(userId) {
    // 1. Gather all data
    const data = await this.gatherData(userId);
    
    // 2. Detect issues/opportunities
    const issues = await this.detectIssues(data);
    
    // 3. If issues found, generate adjustment
    if (issues.length > 0) {
      const adjustment = await this.generateAdjustment(data, issues);
      
      // 4. Save adjustment
      await this.saveAdjustment(userId, adjustment);
      
      // 5. Notify user
      await this.notifyUser(userId, adjustment);
      
      return adjustment;
    }
    
    return { status: "no_adjustment_needed" };
  }
  
  async gatherData(userId) {
    // Fetch all relevant data
    const activities = await this.getRecentActivities(userId, 14); // Last 2 weeks
    const plan = await this.getCurrentPlan(userId);
    const fitness = await this.getCurrentFitness(userId);
    const illnesses = await this.getRecentIllnesses(userId, 30);
    const wellness = await this.getRecentWellness(userId, 7);
    const races = await this.getUpcomingRaces(userId);
    
    return { activities, plan, fitness, illnesses, wellness, races };
  }
  
  async detectIssues(data) {
    const issues = [];
    
    // Check for illness/injury
    const activeIllness = data.illnesses.find(i => !i.endDate);
    if (activeIllness) {
      issues.push({
        type: "illness",
        severity: activeIllness.severity,
        daysOff: this.calculateDaysOff(activeIllness)
      });
    }
    
    // Check for chronic underperformance
    const underperformance = this.detectUnderperformance(data.activities);
    if (underperformance.isSignificant) {
      issues.push({
        type: "underperformance",
        severity: underperformance.severity,
        pattern: underperformance.pattern
      });
    }
    
    // Check for overreaching (TSB too negative)
    if (data.fitness.tsb < -20) {
      issues.push({
        type: "overreaching",
        severity: "high",
        tsb: data.fitness.tsb
      });
    }
    
    // Check for opportunity (performing well)
    const overperformance = this.detectOverperformance(data.activities);
    if (overperformance.isSignificant && data.fitness.tsb > 0) {
      issues.push({
        type: "opportunity",
        severity: "positive",
        pattern: overperformance.pattern
      });
    }
    
    return issues;
  }
  
  async generateAdjustment(data, issues) {
    // Build AI prompt
    const prompt = this.buildPrompt(data, issues);
    
    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert cycling coach specializing in adaptive training.
          Analyze the athlete's data and recommend specific plan adjustments.
          Be conservative with increases, aggressive with recovery when needed.
          Always consider the target race date and current fitness trajectory.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const adjustment = JSON.parse(response.choices[0].message.content);
    
    return adjustment;
  }
  
  buildPrompt(data, issues) {
    return `
ATHLETE DATA:
Current Fitness (CTL): ${data.fitness.ctl}
Current Fatigue (ATL): ${data.fitness.atl}
Current Form (TSB): ${data.fitness.tsb}

TARGET RACE:
Name: ${data.races[0]?.name}
Date: ${data.races[0]?.date}
Days Until: ${data.races[0]?.daysUntil}
Target Peak Fitness: ${data.races[0]?.targetCTL}

CURRENT PLAN:
This Week: ${data.plan.thisWeek.totalTSS} TSS
Next Week: ${data.plan.nextWeek.totalTSS} TSS

ISSUES DETECTED:
${issues.map(i => `- ${i.type}: ${i.severity}`).join('\n')}

RECENT PERFORMANCE:
${data.activities.map(a => `
  ${a.date}: Planned ${a.plannedTSS} TSS, Actual ${a.actualTSS} TSS (${a.deviation}%)
`).join('')}

TASK:
Generate a specific plan adjustment that:
1. Addresses the issues
2. Keeps the athlete on track for their race
3. Prevents injury/burnout
4. Maintains motivation

Return JSON with:
{
  "action": "adjust_plan" | "recovery_week" | "increase_load" | "no_change",
  "changes": [
    {
      "week": "current" | "next" | "+2",
      "adjustment": "description"
    }
  ],
  "reasoning": "why you made this decision",
  "raceImpact": {
    "impact": "none" | "minor" | "moderate" | "significant",
    "newPeakFitness": number,
    "stillAchievable": boolean,
    "message": "encouraging message"
  },
  "userMessage": "friendly notification to show user"
}
    `;
  }
}
```

---

## 🎨 User Experience

### **Dashboard Widget: "AI Training Coach"**

```
┌─────────────────────────────────────┐
│  🤖 AI Training Coach                │
├─────────────────────────────────────┤
│                                      │
│  ✅ Plan Status: On Track            │
│                                      │
│  📊 This Week:                       │
│  Planned: 350 TSS                    │
│  Actual: 285 TSS (81%)               │
│                                      │
│  💡 AI Insight:                      │
│  "You're slightly behind this week,  │
│   but your form is improving. Keep   │
│   up the consistency!"               │
│                                      │
│  [View Full Analysis]                │
└─────────────────────────────────────┘
```

---

### **Notification: Plan Adjusted**

```
┌─────────────────────────────────────┐
│  🤖 Your Training Plan Was Updated   │
├─────────────────────────────────────┤
│                                      │
│  REASON:                             │
│  You've been sick for 3 days         │
│                                      │
│  CHANGES:                            │
│  • This week: 2 recovery days added  │
│  • Next week: Reduced to 80% volume  │
│  • Week 3: Back to normal            │
│                                      │
│  RACE IMPACT:                        │
│  Club Championship (Nov 15)          │
│  Status: Still achievable ✅         │
│  Peak fitness: 92 CTL (was 95)       │
│                                      │
│  Focus on recovery now. You've got   │
│  plenty of time to hit your goal!    │
│                                      │
│  [View Updated Plan] [Dismiss]       │
└─────────────────────────────────────┘
```

---

### **Illness/Injury Logging Modal**

```
┌─────────────────────────────────────┐
│  Log Time Off                        │
├─────────────────────────────────────┤
│                                      │
│  Type:                               │
│  ○ Illness  ○ Injury  ○ Other        │
│                                      │
│  Category:                           │
│  [Cold ▼]                            │
│  Options: Cold, Flu, COVID, Injury,  │
│           Fatigue, Work, Family      │
│                                      │
│  Severity:                           │
│  ○ Minor  ● Moderate  ○ Severe       │
│                                      │
│  Dates:                              │
│  Start: [Oct 8, 2025]                │
│  End: [Oct 12, 2025]                 │
│  □ Still ongoing                     │
│                                      │
│  Notes (optional):                   │
│  [Head cold, felt weak and tired]    │
│                                      │
│  ℹ️ AI will automatically adjust     │
│     your training plan                │
│                                      │
│  [Cancel] [Log & Adjust Plan]        │
└─────────────────────────────────────┘
```

---

### **Wellness Check-In (Optional Daily)**

```
┌─────────────────────────────────────┐
│  Daily Check-In                      │
├─────────────────────────────────────┤
│                                      │
│  How are you feeling today?          │
│  😊 😐 😔 😴 😫                       │
│  Great  Okay  Tired  Exhausted       │
│                                      │
│  Sleep Quality: ●●●●●●○○○○ (6/10)    │
│                                      │
│  Stress Level: ●●●●●●●○○○ (7/10)     │
│                                      │
│  Muscle Soreness: ●●●●●○○○○○ (5/10)  │
│                                      │
│  Motivation: ●●●●○○○○○○ (4/10)       │
│                                      │
│  Notes (optional):                   │
│  [Busy week at work, tired]          │
│                                      │
│  [Skip Today] [Submit]               │
└─────────────────────────────────────┘
```

---

## 📈 Success Metrics

### **User Engagement**
- % of users with adaptive training enabled
- Frequency of plan adjustments
- User acceptance rate of AI adjustments
- Wellness check-in completion rate

### **Training Outcomes**
- Plan completion rate (before: 40% → target: 75%)
- Race goal achievement rate
- User-reported satisfaction
- Injury/burnout rate (should decrease)

### **Product Metrics**
- Average CTL at race day (should increase)
- Consistency score (workouts completed)
- Recovery adequacy (TSB trends)

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Week 1)**
- [ ] Database schema
- [ ] Illness/injury logging UI
- [ ] API endpoints
- [ ] Basic detection logic

### **Phase 2: AI Integration (Week 2)**
- [ ] OpenAI prompt engineering
- [ ] Adjustment generation
- [ ] Plan modification logic
- [ ] User notifications

### **Phase 3: Wellness & Refinement (Week 3)**
- [ ] Wellness check-in UI
- [ ] Dashboard widget
- [ ] Adjustment history
- [ ] Testing & iteration

### **Phase 4: Polish & Launch (Week 4)**
- [ ] User onboarding
- [ ] Documentation
- [ ] Beta testing
- [ ] Public launch

---

## 💰 Business Value

### **Competitive Advantage**
- **First AI-adaptive training platform** for cycling
- TrainingPeaks: Static plans
- Zwift: No real-world adaptation
- Wahoo SYSTM: Pre-built plans only

### **User Retention**
- Plans stay relevant → users stay engaged
- Reduces frustration → improves satisfaction
- Personalized experience → emotional connection

### **Monetization**
- **Free tier:** Basic adaptation (illness/injury only)
- **Pro tier ($10/mo):** Full adaptive system + wellness tracking
- **Premium feature** that justifies subscription

---

## 🎯 Next Steps

1. **Validate concept** - Does this solve your problem?
2. **Prioritize features** - What's MVP vs nice-to-have?
3. **Build Phase 1** - Start with illness/injury logging
4. **Test with your data** - Use your own training
5. **Iterate** - Refine AI prompts and logic
6. **Launch** - Roll out to users

---

**This could be THE killer feature that sets your app apart from everything else on the market.**

---

**What do you think? Should we build this?** 🚀
