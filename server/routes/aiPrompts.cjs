/**
 * AI Prompts Routes
 * Returns the actual prompts used for each AI feature
 */

const express = require('express');
const router = express.Router();

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Simple token verification (you can enhance this)
  try {
    const adminService = require('../services/adminService.cjs');
    const decoded = adminService.verifyToken(token);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * GET /api/admin/ai-prompts
 * Get all AI prompts used in the application
 */
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const prompts = [
      {
        name: 'Training Plan Generation',
        feature: 'Plan Generator',
        endpoint: 'POST /api/training/plan/generate',
        description: 'Generates a complete training plan based on athlete data, goals, and constraints',
        systemPrompt: `You are an expert cycling and running coach with deep knowledge of training periodization, physiology, and adaptive planning. You create structured training plans based on athlete data, goals, and constraints. Always respond with valid JSON.`,
        userPromptTemplate: `Create a {duration}-week training plan for an athlete preparing for a {eventType} event.

ATHLETE PROFILE & CURRENT FITNESS:
- FTP: {ftp} watts ({powerToWeight} W/kg)
- Current week load: {currentWeekTSS} TSS, {currentWeekHours}h
- 4-week average: {fourWeekAvgTSS} TSS, {fourWeekAvgHours}h
- Load ratio: {loadRatio}
- Training consistency: {consistency}
- Age: {age} years
- Gender: {gender}
- Weight: {weight} kg
- Height: {height} cm

RECENT ACTIVITIES (last 10):
{recentActivities}

EVENT GOALS & TARGET PROFILE:
- Event: {eventName}
- Date: {eventDate} ({daysUntilEvent} days away)
- Event Type: {eventType}
- Target Rider Type: {targetRiderType}
- Training Focus: {trainingFocus}
- Priority: {priority}
- Duration: {duration} weeks

TRAINING CONSTRAINTS:
- Available days per week: {daysPerWeek}
- Max hours per week: {maxHoursPerWeek}
- Indoor/outdoor preference: {preference}

Generate a structured training plan with weekly overview and individual sessions.`,
        variables: [
          'duration', 'eventType', 'ftp', 'powerToWeight', 'currentWeekTSS', 'currentWeekHours',
          'fourWeekAvgTSS', 'fourWeekAvgHours', 'loadRatio', 'consistency', 'age', 'gender',
          'weight', 'height', 'recentActivities', 'eventName', 'eventDate', 'daysUntilEvent',
          'targetRiderType', 'trainingFocus', 'priority', 'daysPerWeek', 'maxHoursPerWeek', 'preference'
        ],
        exampleOutput: `{
  "planSummary": "8-week progressive training plan...",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "Base Building",
      "totalHours": 8,
      "sessions": [
        {
          "day": "Monday",
          "type": "Recovery",
          "duration": 60,
          "title": "Easy Spin",
          "description": "...",
          "targets": "Zone 1-2",
          "indoor": false
        }
      ]
    }
  ],
  "notes": "..."
}`
      },
      {
        name: 'Plan Adjustments',
        feature: 'Adaptive Plan Modal',
        endpoint: 'POST /api/training/plan/adjust',
        description: 'Adjusts training plan based on natural language requests from athletes',
        systemPrompt: `You are an expert cycling and endurance sports coach with deep knowledge of training adaptation, periodization, and athlete management. You help athletes adjust their training plans intelligently based on real-world circumstances while maintaining training principles.`,
        userPromptTemplate: `You are an expert cycling coach helping an athlete adjust their training plan.

ATHLETE'S CURRENT DATE/TIME:
- Current Date: {currentDate} ({isoDate})
- Current Time: {currentTime}
- Timezone: {timezone}

ORIGINAL PLAN SETTINGS (MUST BE PRESERVED):
- Event Name: {eventName}
- Event Date: {eventDate}
- Event Type: {eventType}
- Priority: {priority}
- Plan Duration: {planDuration} weeks
- Days per Week: {daysPerWeek}
- Max Hours per Week: {maxHoursPerWeek}

CURRENT PLAN STATE:
- Total weeks: {totalWeeks}
- Total sessions: {totalSessions}
- Completed: {completedCount} ({completionRate}%)
- Missed: {missedCount}

RECENT ACTIVITIES (last 5):
{recentActivities}

ATHLETE'S REQUEST:
"{adjustmentRequest}"

INSTRUCTIONS:
1. Understand what the athlete is asking for
2. If they DID an activity (past tense), update that past session to EXACTLY match what they did
3. For schedule changes, ACTUALLY move sessions to different days (update the "day" field)
4. Maintain training principles
5. Explain reasoning for changes

Return a JSON object with explanation, changes, and the full adjusted plan.`,
        variables: [
          'currentDate', 'isoDate', 'currentTime', 'timezone', 'eventName', 'eventDate',
          'eventType', 'priority', 'planDuration', 'daysPerWeek', 'maxHoursPerWeek',
          'totalWeeks', 'totalSessions', 'completedCount', 'completionRate', 'missedCount',
          'recentActivities', 'adjustmentRequest'
        ],
        exampleOutput: `{
  "explanation": "I've moved your Monday and Wednesday sessions...",
  "changes": [
    {
      "type": "Rescheduling",
      "description": "Moved Monday session to Tuesday",
      "sessions": ["Week 2, Monday"]
    }
  ],
  "adjustedPlan": {
    "planSummary": "...",
    "weeks": [...]
  },
  "significantChanges": true
}`
      },
      {
        name: 'Workout Analysis',
        feature: 'Activity Match Modal',
        endpoint: 'POST /api/training/workout/analyze',
        description: 'Analyzes actual workout performance vs planned session',
        systemPrompt: `You are an expert cycling coach providing concise, actionable workout analysis. Always respond with valid JSON only.`,
        userPromptTemplate: `You are an expert cycling coach analyzing an athlete's workout performance.

PLANNED SESSION:
- Title: {plannedTitle}
- Type: {plannedType}
- Duration: {plannedDuration} minutes
- Description: {plannedDescription}
- Targets: {plannedTargets}

ACTUAL ACTIVITY:
- Name: {actualName}
- Duration: {actualDuration} minutes
- Distance: {actualDistance} km
- Average Power: {avgPower}W
- Normalized Power: {normalizedPower}W
- Max Power: {maxPower}W
- Average HR: {avgHeartRate} bpm
- Max HR: {maxHeartRate} bpm
- TSS: {tss}
- Elevation: {elevation}m

ATHLETE'S FEEDBACK:
"{athleteComment}"

Provide a comprehensive analysis covering:
1. WORKOUT QUALITY ASSESSMENT (2-3 sentences)
2. PLAN ALIGNMENT (1-2 sentences)
3. ADAPTATION & RECOMMENDATIONS (1 sentence)

Return JSON with: analysis, deviationLevel, suggestPlanUpdate, workoutQuality`,
        variables: [
          'plannedTitle', 'plannedType', 'plannedDuration', 'plannedDescription', 'plannedTargets',
          'actualName', 'actualDuration', 'actualDistance', 'avgPower', 'normalizedPower',
          'maxPower', 'avgHeartRate', 'maxHeartRate', 'tss', 'elevation', 'athleteComment'
        ],
        exampleOutput: `{
  "analysis": "You hit excellent power numbers with an average of 245W...",
  "deviationLevel": "low",
  "suggestPlanUpdate": false,
  "workoutQuality": "excellent"
}`
      },
      {
        name: 'Plan Adaptation',
        feature: 'Adaptive Training Service',
        endpoint: 'POST /api/training/plan/adapt',
        description: 'Automatically detects issues and suggests plan adaptations',
        systemPrompt: `You are an expert coach analyzing training plan adherence and suggesting adaptations.`,
        userPromptTemplate: `Analyze this training plan adaptation scenario:

CURRENT PLAN WEEK:
{currentWeek}

COMPLETED ACTIVITIES THIS WEEK:
{completedActivities}

UPCOMING SESSIONS:
{upcomingSessions}

Based on actual vs planned training, suggest adaptations to upcoming sessions.
Consider:
- Missed sessions (need to make up or skip?)
- Excessive fatigue (reduce intensity?)
- Ahead of schedule (maintain or increase?)

Return JSON with analysis and recommendations.`,
        variables: [
          'currentWeek', 'completedActivities', 'upcomingSessions'
        ],
        exampleOutput: `{
  "analysis": "You've missed 2 key sessions this week...",
  "recommendations": [
    {
      "sessionId": "week2-day3",
      "originalPlan": "Threshold Intervals",
      "adaptation": "Reduce to Tempo",
      "reason": "Accumulated fatigue from missed recovery"
    }
  ]
}`
      }
    ];

    res.json({
      success: true,
      prompts
    });
  } catch (error) {
    console.error('Error fetching AI prompts:', error);
    res.status(500).json({ error: 'Failed to fetch AI prompts' });
  }
});

module.exports = router;
