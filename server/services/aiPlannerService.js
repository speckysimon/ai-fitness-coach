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

  async generateTrainingPlan({ activities, goals, constraints, currentMetrics }) {
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

  buildPlanPrompt({ activities, goals, constraints, ftp, loadMetrics, trends }) {
    const recentActivities = activities.slice(0, 10).map(a => ({
      date: a.date,
      type: a.type,
      duration: Math.round(a.duration / 60),
      distance: Math.round(a.distance / 1000),
    }));

    return `Create a ${goals.duration || 4}-week training plan for an athlete with the following profile:

CURRENT FITNESS:
- FTP: ${ftp || 'Unknown'} watts
- Current week load: ${loadMetrics.currentWeek.tss} TSS, ${loadMetrics.currentWeek.time}h
- 4-week average: ${loadMetrics.fourWeekAverage.tss} TSS, ${loadMetrics.fourWeekAverage.time}h
- Load ratio: ${loadMetrics.loadRatio}

RECENT ACTIVITIES (last 10):
${JSON.stringify(recentActivities, null, 2)}

GOALS:
- Event: ${goals.eventName || 'General fitness'}
- Date: ${goals.eventDate || 'No specific date'}
- Type: ${goals.eventType || 'Endurance'}
- Priority: ${goals.priority || 'Medium'}

CONSTRAINTS:
- Available days per week: ${constraints?.daysPerWeek || 5}
- Max hours per week: ${constraints?.maxHoursPerWeek || 10}
- Indoor/outdoor preference: ${constraints?.preference || 'Both'}

Generate a structured training plan with:
1. Weekly overview (volume, intensity distribution)
2. Individual sessions for each week with:
   - Day of week
   - Session type (Endurance, Tempo, Threshold, VO2max, Recovery, Rest)
   - Duration (minutes)
   - Target zones/power/HR
   - Description and key points
3. Progression rationale
4. Adaptation notes

Return as JSON with structure:
{
  "planSummary": "...",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "...",
      "totalHours": 8,
      "sessions": [
        {
          "day": "Monday",
          "type": "Recovery",
          "duration": 60,
          "title": "Easy Spin",
          "description": "...",
          "targets": "Zone 1-2, <65% FTP",
          "indoor": false
        }
      ]
    }
  ],
  "notes": "..."
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
      const isRecoveryWeek = (w + 1) % 4 === 0;
      const weekSessions = [];
      
      for (let d = 0; d < daysPerWeek; d++) {
        const sessionType = sessionTypes[d % sessionTypes.length];
        const duration = isRecoveryWeek ? sessionType.duration * 0.7 : sessionType.duration;
        
        weekSessions.push({
          day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d],
          type: sessionType.type,
          duration: Math.round(duration),
          title: `${sessionType.type} Ride`,
          description: sessionType.description,
          targets: ftp ? `${Math.round(ftp * 0.75)}-${Math.round(ftp * 0.95)}W` : 'Moderate effort',
          indoor: false,
        });
      }

      planWeeks.push({
        weekNumber: w + 1,
        focus: isRecoveryWeek ? 'Recovery' : 'Build',
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
