import OpenAI from 'openai';
import { analyticsService } from './analyticsService.js';
import { addDays, format } from 'date-fns';

class AIPlannerService {
  constructor() {
    this.openai = null;
  }

  getOpenAI() {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  async generateTrainingPlan({ activities, goals, constraints, currentMetrics, userProfile, raceHistory, trainingPriorities }) {
    // Prepare context for AI
    const ftp = currentMetrics?.ftp || analyticsService.calculateFTP(activities);
    const loadMetrics = analyticsService.calculateTrainingLoad(activities, ftp);
    const trends = analyticsService.getTrends(activities, 4);

    const prompt = this.buildPlanPrompt({
      activities,
      goals,
      constraints,
      ftp,
      loadMetrics,
      trends,
      userProfile,
      raceHistory,
      trainingPriorities,
    });

    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert cycling and running coach with deep knowledge of training periodization, physiology, and adaptive planning. You create structured training plans based on athlete data, goals, and constraints. Always respond with valid JSON.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const planData = JSON.parse(completion.choices[0].message.content);
      return this.formatPlan(planData, goals);
    } catch (error) {
      console.error('OpenAI API error:', error.message);
      // Fallback to rule-based plan
      return this.generateRuleBasedPlan({ activities, goals, constraints, ftp, loadMetrics });
    }
  }

  buildPlanPrompt({ activities, goals, constraints, ftp, loadMetrics, trends, userProfile, raceHistory, trainingPriorities }) {
    const recentActivities = activities.slice(0, 10).map(a => ({
      date: a.date,
      type: a.type,
      duration: Math.round(a.duration / 60),
      distance: Math.round(a.distance / 1000),
    }));

    // Build user profile context
    const profileContext = userProfile ? {
      age: userProfile.age || 'Unknown',
      gender: userProfile.gender || 'Unknown',
      weight: userProfile.weight || 'Unknown',
      height: userProfile.height || 'Unknown',
    } : null;

    // Calculate power-to-weight if available
    const powerToWeight = (ftp && userProfile?.weight) 
      ? (ftp / userProfile.weight).toFixed(2) 
      : null;

    // Build race context if available
    let raceContext = '';
    if (raceHistory && raceHistory.length > 0) {
      const latestRace = raceHistory[0];
      
      raceContext = `
RECENT RACE PERFORMANCE:
- Date: ${latestRace.date}
- Performance Score: ${latestRace.performanceScore}/100
- Pacing Score: ${latestRace.pacingScore}/100 ${latestRace.pacingScore < 75 ? '⚠️ NEEDS IMPROVEMENT' : '✅'}
- Execution Score: ${latestRace.executionScore}/100
- Tactical Score: ${latestRace.tacticalScore}/100

KEY LEARNINGS FROM RACE:
Strengths Confirmed:
${latestRace.whatWentWell.slice(0, 3).map(item => `- ${item}`).join('\n')}

Areas Needing Improvement:
${latestRace.whatDidntGoWell.slice(0, 3).map(item => `- ${item}`).join('\n')}

TRAINING PRIORITIES (from race analysis):
${latestRace.trainingFocus.map(focus => `- ${focus}`).join('\n')}

IMPORTANT INSTRUCTIONS FOR PLAN DESIGN:
1. Design this training plan to specifically address the weaknesses identified in the race analysis
2. Include sessions that target the training focus areas above
3. Maintain and build on confirmed strengths
4. If pacing score was low (< 75), include race simulation sessions with conservative pacing practice
5. Reference the race learnings in session descriptions to help the athlete understand why each session matters

Example session description: "Threshold Endurance Builder - Based on your recent race, you faded in the final 20km. This session builds late-race endurance at 90-95% FTP."
`;
    }

    // Map event type to target rider type and training focus
    const eventTypeMapping = {
      'Endurance': {
        riderType: 'Rouleur',
        focusDescription: 'sustained power over long distances and aerobic endurance',
        keyWorkouts: 'long endurance rides, tempo efforts, and threshold intervals',
        physiologicalGoals: 'aerobic capacity, fat oxidation, and muscular endurance'
      },
      'Gran Fondo': {
        riderType: 'All Rounder',
        focusDescription: 'balanced abilities across all terrains with strong endurance',
        keyWorkouts: 'mixed terrain rides, climbing intervals, tempo work, and long endurance',
        physiologicalGoals: 'versatility, sustained power on climbs and flats, and endurance'
      },
      'Criterium': {
        riderType: 'Sprinter',
        focusDescription: 'explosive power and high-intensity repeated efforts',
        keyWorkouts: 'sprint intervals, VO2max efforts, race simulation, and recovery rides',
        physiologicalGoals: 'anaerobic capacity, sprint power, and quick recovery between efforts'
      },
      'Time Trial': {
        riderType: 'Time Trialist',
        focusDescription: 'sustained threshold power and pacing ability',
        keyWorkouts: 'threshold intervals, tempo efforts, and time trial simulations',
        physiologicalGoals: 'FTP improvement, lactate threshold, and pacing discipline'
      },
      'General Fitness': {
        riderType: 'All Rounder',
        focusDescription: 'overall fitness and health with balanced training',
        keyWorkouts: 'varied endurance rides, moderate intensity work, and recovery',
        physiologicalGoals: 'cardiovascular health, sustainable fitness, and enjoyment'
      },
      'Climbing': {
        riderType: 'Climber',
        focusDescription: 'high power-to-weight ratio and climbing strength',
        keyWorkouts: 'hill repeats, VO2max intervals, sustained climbing efforts, and tempo',
        physiologicalGoals: 'power-to-weight ratio, VO2 max, and climbing efficiency'
      }
    };

    const targetProfile = eventTypeMapping[goals.eventType] || eventTypeMapping['Endurance'];
    
    // Calculate days until event
    const daysUntilEvent = goals.eventDate ? 
      Math.ceil((new Date(goals.eventDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    const planDuration = goals.duration || 4;
    
    return `Create a ${planDuration}-week training plan for an athlete preparing for a ${goals.eventType} event.

CRITICAL: The plan MUST contain EXACTLY ${planDuration} weeks. No more, no less.
${raceContext}
ATHLETE PROFILE & CURRENT FITNESS:
- FTP: ${ftp || 'Unknown'} watts${powerToWeight ? ` (${powerToWeight} W/kg)` : ''}
- Current week load: ${loadMetrics.currentWeek.tss} TSS, ${loadMetrics.currentWeek.time}h
- 4-week average: ${loadMetrics.fourWeekAverage.tss} TSS, ${loadMetrics.fourWeekAverage.time}h
- Load ratio: ${loadMetrics.loadRatio}
- Training consistency: ${trends.consistency || 'Unknown'}${profileContext ? `
- Age: ${profileContext.age} years
- Gender: ${profileContext.gender}
- Weight: ${profileContext.weight} kg
- Height: ${profileContext.height} cm` : ''}

RECENT ACTIVITIES (last 10):
${JSON.stringify(recentActivities, null, 2)}

EVENT GOALS & TARGET PROFILE:
- Event: ${goals.eventName || 'General fitness'}
- Date: ${goals.eventDate || 'No specific date'}${daysUntilEvent ? ` (${daysUntilEvent} days away)` : ''}
- Event Type: ${goals.eventType || 'Endurance'}
- Target Rider Type: ${targetProfile.riderType}
- Training Focus: ${targetProfile.focusDescription}
- Priority: ${goals.priority || 'Medium'}
- Duration: ${planDuration} weeks

TRAINING CONSTRAINTS:
- Available days per week: ${constraints?.daysPerWeek || 5}
- Max hours per week: ${constraints?.maxHoursPerWeek || 10}
- Indoor/outdoor preference: ${constraints?.preference || 'Both'}

CRITICAL REQUIREMENTS FOR ${goals.eventType.toUpperCase()} PREPARATION:

1. RACE-SPECIFIC FOCUS:
   - All workouts must develop ${targetProfile.riderType} characteristics
   - Key workout types: ${targetProfile.keyWorkouts}
   - Physiological adaptations: ${targetProfile.physiologicalGoals}
   - Workouts should simulate race demands and conditions

2. PERIODIZATION:
   - Plan must be EXACTLY ${planDuration} weeks long - generate ${planDuration} week objects
   - Week numbers must be 1 through ${planDuration} (inclusive)
   - Final week (Week ${planDuration}) MUST be a taper week with 40-50% reduced volume
   - Taper week maintains intensity but significantly reduces duration
   - Peak training occurs 2 weeks before event
   - Progression: Base → Build → Peak → Taper

3. WORKOUT SPECIFICITY:
   - Each session must have a clear purpose aligned with ${goals.eventType} demands
   - Include specific power targets, intervals, and rest periods
   - Describe HOW each workout develops race-specific abilities
   - Reference the target rider type (${targetProfile.riderType}) in workout descriptions

4. PROGRESSIVE OVERLOAD:
   - Build from current fitness level (${loadMetrics.fourWeekAverage.tss} TSS/week average)
   - Increase load gradually, respecting the athlete's recent training
   - Include recovery weeks if plan is longer than 4 weeks

Generate a structured training plan with:
1. Weekly overview (volume, intensity distribution, race-specific focus)
2. Individual sessions for each week with:
   - Day of week
   - Session type (Endurance, Tempo, Threshold, VO2Max, Recovery, Rest)
   - Duration (minutes)
   - Target zones/power/HR (be specific with FTP percentages)
   - Title that reflects race-specific purpose
   - Description explaining HOW this develops ${targetProfile.riderType} abilities
   - Specific intervals/structure when applicable
   - Indoor/outdoor recommendation
3. Progression rationale linked to ${goals.eventType} demands
4. Adaptation notes specific to ${targetProfile.riderType} development

Return as JSON with structure:
{
  "planSummary": "Race-specific summary mentioning ${goals.eventType} and ${targetProfile.riderType} development",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "Week focus aligned with ${goals.eventType} preparation",
      "totalHours": 8,
      "sessions": [
        {
          "day": "Monday",
          "type": "Recovery",
          "duration": 60,
          "title": "Race-specific title",
          "description": "Detailed description linking to ${targetProfile.riderType} development",
          "targets": "Specific zones with FTP %",
          "indoor": false
        }
      ]
    }
  ],
  "notes": "Final notes about ${goals.eventType} preparation and ${targetProfile.riderType} characteristics"
}`;
  }

  formatPlan(planData, goals) {
    const startDate = new Date();
    
    // Add dates to sessions
    const weeksWithDates = planData.weeks.map((week, weekIndex) => {
      const sessionsWithDates = week.sessions.map((session, sessionIndex) => {
        const dayOffset = this.getDayOffset(session.day);
        const sessionDate = addDays(startDate, weekIndex * 7 + dayOffset);
        
        return {
          ...session,
          date: sessionDate.toISOString(),
          dateFormatted: format(sessionDate, 'yyyy-MM-dd'),
        };
      });

      return {
        ...week,
        sessions: sessionsWithDates,
      };
    });

    return {
      ...planData,
      weeks: weeksWithDates,
      generatedAt: new Date().toISOString(),
      goals,
    };
  }

  getDayOffset(dayName) {
    const days = {
      'Monday': 0,
      'Tuesday': 1,
      'Wednesday': 2,
      'Thursday': 3,
      'Friday': 4,
      'Saturday': 5,
      'Sunday': 6,
    };
    return days[dayName] || 0;
  }

  // Fallback rule-based plan generator
  generateRuleBasedPlan({ activities, goals, constraints, ftp, loadMetrics }) {
    const weeks = goals.duration || 4;
    const daysPerWeek = constraints?.daysPerWeek || 4;
    const maxHours = constraints?.maxHoursPerWeek || 8;

    const sessionTypes = [
      { type: 'Endurance', duration: 90, description: 'Long steady ride in Zone 2' },
      { type: 'Tempo', duration: 60, description: 'Sustained effort at Zone 3' },
      { type: 'Threshold', duration: 60, description: 'Intervals at FTP (Zone 4)' },
      { type: 'Recovery', duration: 45, description: 'Easy spin in Zone 1' },
    ];

    const planWeeks = [];
    
    for (let w = 0; w < weeks; w++) {
      const isTaperWeek = (w + 1) === weeks; // Last week is taper
      const isRecoveryWeek = (w + 1) % 4 === 0 && !isTaperWeek;
      const weekSessions = [];
      
      for (let d = 0; d < daysPerWeek; d++) {
        const sessionType = sessionTypes[d % sessionTypes.length];
        let duration = sessionType.duration;
        
        // Apply volume reductions
        if (isTaperWeek) {
          duration = duration * 0.5; // 50% reduction for taper
        } else if (isRecoveryWeek) {
          duration = duration * 0.7; // 30% reduction for recovery weeks
        }
        
        weekSessions.push({
          day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d],
          type: sessionType.type,
          duration: Math.round(duration),
          title: isTaperWeek ? `Taper ${sessionType.type}` : `${sessionType.type} Ride`,
          description: isTaperWeek ? `Short ${sessionType.description} - maintaining intensity, reducing volume` : sessionType.description,
          targets: ftp ? `${Math.round(ftp * 0.75)}-${Math.round(ftp * 0.95)}W` : 'Moderate effort',
          indoor: false,
        });
      }

      planWeeks.push({
        weekNumber: w + 1,
        focus: isTaperWeek ? 'Taper - Race Prep' : isRecoveryWeek ? 'Recovery' : 'Build',
        totalHours: Math.round(weekSessions.reduce((sum, s) => sum + s.duration, 0) / 60),
        sessions: weekSessions,
      });
    }

    return this.formatPlan({
      planSummary: `${weeks}-week progressive training plan`,
      weeks: planWeeks,
      notes: 'Rule-based plan. Adjust based on how you feel.',
    }, goals);
  }

  async adaptPlan({ currentPlan, completedActivities, upcomingActivities }) {
    // Analyze compliance and fatigue
    const prompt = `Analyze this training plan adaptation scenario:

CURRENT PLAN WEEK:
${JSON.stringify(currentPlan.currentWeek, null, 2)}

COMPLETED ACTIVITIES THIS WEEK:
${JSON.stringify(completedActivities, null, 2)}

UPCOMING SESSIONS:
${JSON.stringify(upcomingActivities, null, 2)}

Based on actual vs planned training, suggest adaptations to upcoming sessions.
Consider:
- Missed sessions (need to make up or skip?)
- Excessive fatigue (reduce intensity?)
- Ahead of schedule (maintain or increase?)

Return JSON with:
{
  "analysis": "...",
  "recommendations": [
    {
      "sessionId": "...",
      "originalPlan": "...",
      "adaptation": "...",
      "reason": "..."
    }
  ]
}`;

    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert coach analyzing training plan adherence and suggesting adaptations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error.message);
      return {
        analysis: 'Unable to generate AI adaptation at this time.',
        recommendations: [],
      };
    }
  }

  async recommendSession({ recentActivities, targetType, constraints }) {
    const summary = recentActivities.slice(0, 5).map(a => ({
      date: a.date,
      type: a.type,
      duration: Math.round(a.duration / 60),
    }));

    const prompt = `Recommend a specific ${targetType} training session.

RECENT ACTIVITIES:
${JSON.stringify(summary, null, 2)}

CONSTRAINTS:
- Duration: ${constraints?.duration || 60} minutes
- Indoor/Outdoor: ${constraints?.location || 'Either'}

Provide a detailed session with warm-up, main set, cool-down.

Return JSON:
{
  "title": "...",
  "duration": 60,
  "description": "...",
  "structure": [
    {"phase": "Warm-up", "duration": 10, "intensity": "Easy"},
    {"phase": "Main Set", "duration": 40, "intensity": "..."},
    {"phase": "Cool-down", "duration": 10, "intensity": "Easy"}
  ],
  "keyPoints": ["...", "..."]
}`;

    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert coach creating specific training sessions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error.message);
      return {
        title: `${targetType} Session`,
        duration: constraints?.duration || 60,
        description: 'Standard training session',
        structure: [],
        keyPoints: [],
      };
    }
  }

  async adjustPlanFromRequest({ plan, activities, completedSessions, adjustmentRequest, context, userDateTime }) {
    // Analyze current plan state
    const totalSessions = plan.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
    const completedCount = Object.values(completedSessions || {}).filter(s => s?.completed).length;
    const missedCount = Object.values(completedSessions || {}).filter(s => s?.missed).length;
    const completionRate = totalSessions > 0 ? (completedCount / totalSessions * 100).toFixed(1) : 0;

    // Get recent activities for context
    const recentActivities = activities.slice(0, 5).map(a => ({
      date: a.date,
      name: a.name,
      type: a.type,
      duration: Math.round(a.duration / 60),
      distance: Math.round(a.distance / 1000),
      tss: a.tss || 0,
    }));

    // Extract original plan settings
    const originalGoals = plan.goals || {};
    const planDuration = plan.weeks.length;

    // Build detailed prompt for AI
    const prompt = `You are an expert cycling coach helping an athlete adjust their training plan. Analyze the situation and provide specific, actionable adjustments.

ATHLETE'S CURRENT DATE/TIME:
${userDateTime ? `- Current Date: ${userDateTime.date} (${userDateTime.isoDate})
- Current Time: ${userDateTime.time}
- Timezone: ${userDateTime.timezone}

When the athlete refers to "today", "yesterday", or "tomorrow", use this date as reference.` : '- Date/time not provided'}

ORIGINAL PLAN SETTINGS (MUST BE PRESERVED):
- Event Name: ${originalGoals.eventName || 'Not specified'}
- Event Date: ${originalGoals.eventDate || 'Not specified'}
- Event Type: ${originalGoals.eventType || 'Not specified'}
- Priority: ${originalGoals.priority || 'Not specified'}
- Plan Duration: ${planDuration} weeks
- Days per Week: ${originalGoals.daysPerWeek || 'Not specified'}
- Max Hours per Week: ${originalGoals.maxHoursPerWeek || 'Not specified'}

CURRENT PLAN STATE:
- Event: ${plan.planSummary || 'Training plan'}
- Total weeks: ${plan.weeks.length}
- Total sessions: ${totalSessions}
- Completed: ${completedCount} (${completionRate}%)
- Missed: ${missedCount}

RECENT ACTIVITIES (last 5):
${recentActivities.map(a => `- ${a.date}: ${a.name} (${a.duration}min, ${a.distance}km, ${a.tss} TSS)`).join('\n')}

ATHLETE'S REQUEST:
"${adjustmentRequest}"

CONTEXT:
${context ? JSON.stringify(context, null, 2) : 'No additional context'}

INSTRUCTIONS:
1. Understand what the athlete is asking for (e.g., reschedule missed sessions, reduce intensity, accommodate schedule changes, change training days, etc.)
2. **CRITICAL**: If the athlete says they DID an activity (past tense), you MUST update that past session to EXACTLY match what they actually did. DO NOT suggest lighter alternatives or "active recovery" - replace the session with the actual activity they completed. Use the activity data from RECENT ACTIVITIES to get the exact details (duration, distance, TSS).
3. **SCHEDULE CHANGES**: If the athlete requests no training on specific days (e.g., "no training on Mondays"), you MUST:
   - Move those sessions to different days of the week
   - Update the "day" field to the new day name (e.g., "Tuesday", "Thursday")
   - Ensure the new schedule respects rest days and training load distribution
   - **ACTUALLY CHANGE THE DAY FIELD** - do not just mark them as "modified" - actually change the day
4. For past sessions: ACCEPT what was done and update the plan to reflect reality
5. For future sessions: Make adjustments to compensate for the unexpected training load or schedule constraints
6. Analyze the impact on their training progression
7. Explain the reasoning behind each change
8. Ensure the adjustments maintain training principles (progressive overload, recovery, specificity)

Return a JSON object with:
{
  "explanation": "Clear explanation of what you're adjusting and why (2-3 sentences)",
  "changes": [
    {
      "type": "Session Modification|Rescheduling|Intensity Adjustment|Session Cancellation|New Session",
      "description": "Specific change being made",
      "sessions": ["Week X, Day Y", ...]
    }
  ],
  "adjustedPlan": {
    // Return the FULL modified plan structure with all weeks and sessions
    // Keep the same structure as the original plan but with modifications applied
    "planSummary": "...",
    "weeks": [
      {
        "weekNumber": 1,
        "focus": "...",
        "totalHours": X,
        "sessions": [
          {
            "day": "Monday",  // IMPORTANT: Update this to the new day if rescheduling
            "title": "...",
            "type": "Recovery|Endurance|Tempo|Threshold|VO2Max|Intervals",
            "duration": 60,
            "description": "...",
            "targets": "...",
            // DO NOT include "date" field - dates are calculated automatically from the "day" field
            // Add "modified": true and "modificationReason": "..." for changed sessions
            // Add "status": "cancelled" and "cancellationReason": "..." for cancelled sessions
          }
        ]
      }
    ],
    "notes": "...",
    "coachNotes": [
      {
        "message": "Adjustment explanation",
        "timestamp": "2025-10-19T09:30:00.000Z",
        "type": "Adjustment"
      }
    ]
  },
  "significantChanges": true/false  // true if modifying multiple weeks or major changes
}

CRITICAL REQUIREMENTS:
- You MUST return ALL ${planDuration} weeks with ALL sessions
- Maintain the EXACT structure of the original plan (same number of weeks and sessions per week)
- Only modify the content of sessions that need adjustment based on the request
- DO NOT delete or remove any incomplete sessions - they should remain in the plan
- Mark modified sessions with "modified": true and "modificationReason"
- For cancelled sessions, set "status": "cancelled" and "cancellationReason"
- Preserve all existing session data (dates, descriptions, etc.) unless specifically modifying that session
- Ensure training load progression remains sensible
- DO NOT include "coachNotes" in your response - this will be handled separately

EXAMPLE 1 - How to handle past activities:
If athlete says: "I did a ride today instead of a rest day"
And RECENT ACTIVITIES shows: "2025-10-18: Morning Ride (60min, 25km, 45 TSS)"
Then you MUST:
1. Find the rest day on 2025-10-18
2. Change it to: {
   "title": "Morning Ride",
   "type": "Endurance",
   "duration": 60,
   "description": "Steady endurance ride (completed)",
   "modified": true,
   "modificationReason": "Athlete performed unscheduled ride"
}
3. DO NOT change it to "Active Recovery" or suggest lighter alternatives
4. ACCEPT what was done and adjust future sessions accordingly

EXAMPLE 2 - How to handle schedule changes:
If athlete says: "No training on Mondays and Wednesdays from Week 2 onwards"
Then you MUST:
1. Find all Monday and Wednesday sessions in Week 2 and beyond
2. Move them to other days (e.g., Tuesday, Thursday, Saturday, Sunday)
3. Update the "day" field: {
   "day": "Tuesday",  // Changed from "Monday"
   "title": "Progressive Endurance Ride",
   "type": "Endurance",
   "duration": 150,
   "description": "Start at a lower intensity and gradually increase to Zone 3. Adjustment: Rescheduled to fit athlete's availability",
   "modified": true,
   "modificationReason": "Rescheduled from Monday to accommodate athlete's availability"
}
4. Ensure proper rest day distribution and training load balance
5. DO NOT just mark as modified without changing the day`;

    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert cycling and endurance sports coach with deep knowledge of training adaptation, periodization, and athlete management. You help athletes adjust their training plans intelligently based on real-world circumstances while maintaining training principles.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const adjustment = JSON.parse(completion.choices[0].message.content);
      
      // Validate that adjustedPlan has the required structure
      if (!adjustment.adjustedPlan || !adjustment.adjustedPlan.weeks) {
        throw new Error('Invalid adjusted plan structure');
      }

      // Remove coachNotes from adjustedPlan - we'll handle this in the frontend
      // to properly append to existing notes instead of replacing them
      if (adjustment.adjustedPlan.coachNotes) {
        delete adjustment.adjustedPlan.coachNotes;
      }

      return adjustment;
    } catch (error) {
      console.error('OpenAI API error in plan adjustment:', error.message);
      
      // Fallback: return a simple explanation without changes
      return {
        explanation: `I understand you want to adjust your plan. However, I encountered an error processing your request. Please try rephrasing your request or contact support if the issue persists.`,
        changes: [],
        adjustedPlan: plan, // Return original plan unchanged
        significantChanges: false,
      };
    }
  }

  async analyzeWorkout({ plannedSession, actualActivity, athleteComment }) {
    const prompt = `You are an expert cycling coach analyzing an athlete's workout performance.

PLANNED SESSION:
- Title: ${plannedSession.title}
- Type: ${plannedSession.type}
- Duration: ${plannedSession.duration} minutes
- Description: ${plannedSession.description}
${plannedSession.targets ? `- Targets: ${plannedSession.targets}` : ''}

ACTUAL ACTIVITY:
- Name: ${actualActivity.name}
- Duration: ${Math.round(actualActivity.duration / 60)} minutes
- Distance: ${(actualActivity.distance / 1000).toFixed(1)} km
${actualActivity.avgPower ? `- Average Power: ${Math.round(actualActivity.avgPower)}W` : ''}
${actualActivity.normalizedPower ? `- Normalized Power: ${Math.round(actualActivity.normalizedPower)}W` : ''}
${actualActivity.maxPower ? `- Max Power: ${Math.round(actualActivity.maxPower)}W` : ''}
${actualActivity.avgHeartRate ? `- Average HR: ${Math.round(actualActivity.avgHeartRate)} bpm` : ''}
${actualActivity.maxHeartRate ? `- Max HR: ${Math.round(actualActivity.maxHeartRate)} bpm` : ''}
${actualActivity.tss ? `- TSS: ${Math.round(actualActivity.tss)}` : ''}
${actualActivity.elevation ? `- Elevation: ${Math.round(actualActivity.elevation)}m` : ''}

${athleteComment ? `ATHLETE'S FEEDBACK:\n"${athleteComment}"\n` : ''}

Provide a comprehensive analysis covering:

1. WORKOUT QUALITY ASSESSMENT (2-3 sentences):
   - Evaluate the overall quality of the workout based on power/HR numbers
   - Highlight strong points (e.g., "You hit excellent power numbers", "Strong sustained effort", "Good max power output")
   - Comment on workout execution and intensity distribution

2. PLAN ALIGNMENT (1-2 sentences):
   - How well the actual workout matched the planned session
   - If there was deviation, explain what type of training was actually performed (e.g., "Despite the deviation, this was a strong workout targeted more at threshold power rather than the planned endurance ride")

3. ADAPTATION & RECOMMENDATIONS (1 sentence):
   - Whether this indicates good adaptation or if adjustments are needed
   - Any specific recommendations for future sessions

Be encouraging and specific. Use actual numbers when available. If the workout was good but different from plan, acknowledge both the quality AND the deviation.

Also determine:
- deviationLevel: "low" (good match), "medium" (some deviation), or "high" (significant deviation)
- suggestPlanUpdate: true if the deviation suggests the plan should be adjusted, false otherwise
- workoutQuality: "excellent" (outstanding performance), "good" (solid workout), "fair" (acceptable), or "poor" (concerning performance)

Return ONLY a JSON object with this structure:
{
  "analysis": "Your comprehensive 4-6 sentence analysis here",
  "deviationLevel": "low|medium|high",
  "suggestPlanUpdate": true|false,
  "workoutQuality": "excellent|good|fair|poor"
}`;

    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert cycling coach providing concise, actionable workout analysis. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Parse JSON response
      let analysis;
      try {
        // Remove markdown code blocks if present
        const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse AI response:', responseText);
        // Fallback response
        analysis = {
          analysis: responseText,
          deviationLevel: 'medium',
          suggestPlanUpdate: false,
          workoutQuality: 'good'
        };
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing workout:', error);
      throw new Error('Failed to analyze workout');
    }
  }
}

export const aiPlannerService = new AIPlannerService();
