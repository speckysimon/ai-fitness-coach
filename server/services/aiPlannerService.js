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

  async generateTrainingPlan({ activities, goals, constraints, currentMetrics, userProfile }) {
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

  buildPlanPrompt({ activities, goals, constraints, ftp, loadMetrics, trends, userProfile }) {
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

    return `Create a ${goals.duration || 4}-week training plan for an athlete preparing for a ${goals.eventType} event.

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
- Duration: ${goals.duration || 4} weeks

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
   - Plan must be exactly ${goals.duration || 4} weeks long
   - Final week (Week ${goals.duration || 4}) MUST be a taper week with 40-50% reduced volume
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
}

export const aiPlannerService = new AIPlannerService();
