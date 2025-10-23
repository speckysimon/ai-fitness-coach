import OpenAI from 'openai';
import { adaptationEventDb, planAdjustmentDb, workoutComparisonDb } from '../db.js';

class AdaptiveTrainingService {
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
  
  /**
   * Main analysis function - checks if plan needs adjustment
   */
  async analyzeAndAdapt(userId, userData) {
    try {
      console.log(`🤖 Analyzing training for user ${userId}...`);
      console.log('User data received:', JSON.stringify(userData, null, 2));
      
      // 1. Gather all relevant data
      const data = await this.gatherData(userId, userData);
      console.log('Data gathered:', { 
        activitiesCount: data.activities?.length || 0,
        hasPlan: !!data.plan,
        illnessesCount: data.illnesses?.length || 0,
        activeIllnessesCount: data.activeIllnesses?.length || 0
      });
      
      // 2. Detect issues or opportunities
      const issues = await this.detectIssues(data);
      
      console.log(`📊 Detected ${issues.length} issues/opportunities:`, issues);
      
      // 3. If issues found, generate adjustment
      if (issues.length > 0) {
        console.log('Generating AI adjustment...');
        const adjustment = await this.generateAdjustment(data, issues);
        
        // 4. Save adjustment to database
        const adjustmentId = await this.saveAdjustment(userId, adjustment, issues);
        
        console.log(`✅ Adjustment created: ${adjustmentId}`);
        
        return {
          needsAdjustment: true,
          adjustment,
          adjustmentId,
          issues
        };
      }
      
      console.log('✅ No issues detected, plan is on track');
      return { 
        needsAdjustment: false,
        message: 'Training plan is on track' 
      };
      
    } catch (error) {
      console.error('Error in analyzeAndAdapt:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
  
  /**
   * Gather all data needed for analysis
   */
  async gatherData(userId, userData) {
    const {
      recentActivities = [],
      currentPlan = null,
      currentFitness = {},
      upcomingRaces = []
    } = userData;
    
    // Get recent illness/injury events
    const illnesses = adaptationEventDb.getAllForUser(userId, 30);
    const activeIllnesses = adaptationEventDb.getActiveForUser(userId);
    
    // Get workout comparisons
    const comparisons = workoutComparisonDb.getForUser(userId, 14);
    
    return {
      activities: recentActivities,
      plan: currentPlan,
      fitness: currentFitness,
      races: upcomingRaces,
      illnesses,
      activeIllnesses,
      comparisons
    };
  }
  
  /**
   * Detect issues or opportunities that require plan adjustment
   */
  async detectIssues(data) {
    const issues = [];
    
    // 1. Check for active illness/injury
    if (data.activeIllnesses && data.activeIllnesses.length > 0) {
      const illness = data.activeIllnesses[0];
      const daysOff = this.calculateDaysOff(illness);
      
      issues.push({
        type: 'illness',
        severity: illness.severity || 'moderate',
        daysOff,
        category: illness.category,
        startDate: illness.start_date,
        data: illness
      });
    }
    
    // 2. Check for recently completed illness (within last 7 days)
    if (data.illnesses && data.illnesses.length > 0) {
      const recentIllnesses = data.illnesses.filter(illness => {
        if (!illness.end_date) return false; // Skip active ones (already handled)
        
        const endDate = new Date(illness.end_date);
        const now = new Date();
        const daysSinceEnded = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
        
        return daysSinceEnded <= 7; // Within last week
      });
      
      if (recentIllnesses.length > 0) {
        const illness = recentIllnesses[0];
        const daysOff = this.calculateDaysOff(illness);
        
        // Only create issue if significant time off (2+ days)
        if (daysOff >= 2) {
          issues.push({
            type: 'illness',
            severity: illness.severity || 'moderate',
            daysOff,
            category: illness.category,
            startDate: illness.start_date,
            endDate: illness.end_date,
            data: illness
          });
        }
      }
    }
    
    // 2. Check for chronic underperformance
    const underperformance = this.detectUnderperformance(data.activities, data.plan);
    if (underperformance.isSignificant) {
      issues.push({
        type: 'underperformance',
        severity: underperformance.severity,
        pattern: underperformance.pattern,
        data: underperformance
      });
    }
    
    // 3. Check for overreaching (TSB too negative)
    if (data.fitness.tsb && data.fitness.tsb < -20) {
      issues.push({
        type: 'overreaching',
        severity: 'high',
        tsb: data.fitness.tsb,
        data: data.fitness
      });
    }
    
    // 4. Check for opportunity (performing well + fresh)
    const overperformance = this.detectOverperformance(data.activities, data.plan);
    if (overperformance.isSignificant && data.fitness.tsb > 0) {
      issues.push({
        type: 'opportunity',
        severity: 'positive',
        pattern: overperformance.pattern,
        data: overperformance
      });
    }
    
    return issues;
  }
  
  /**
   * Calculate days off from illness/injury
   */
  calculateDaysOff(illness) {
    const start = new Date(illness.start_date);
    const end = illness.end_date ? new Date(illness.end_date) : new Date();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  /**
   * Detect chronic underperformance
   */
  detectUnderperformance(activities, plan) {
    if (!activities || activities.length < 5) {
      return { isSignificant: false };
    }
    
    // Check last 7 days of activities
    const recent = activities.slice(0, 7);
    let underperformCount = 0;
    let totalDeviation = 0;
    
    recent.forEach(activity => {
      if (activity.plannedTss && activity.actualTss) {
        const deviation = ((activity.actualTss - activity.plannedTss) / activity.plannedTss) * 100;
        if (deviation < -10) { // More than 10% under
          underperformCount++;
          totalDeviation += Math.abs(deviation);
        }
      }
    });
    
    const avgDeviation = totalDeviation / recent.length;
    const isSignificant = underperformCount >= 4 && avgDeviation > 15;
    
    return {
      isSignificant,
      severity: avgDeviation > 25 ? 'severe' : 'moderate',
      pattern: `${underperformCount}/${recent.length} workouts underperformed`,
      avgDeviation
    };
  }
  
  /**
   * Detect consistent overperformance
   */
  detectOverperformance(activities, plan) {
    if (!activities || activities.length < 5) {
      return { isSignificant: false };
    }
    
    const recent = activities.slice(0, 7);
    let overperformCount = 0;
    let totalDeviation = 0;
    
    recent.forEach(activity => {
      if (activity.plannedTss && activity.actualTss) {
        const deviation = ((activity.actualTss - activity.plannedTss) / activity.plannedTss) * 100;
        if (deviation > 10) { // More than 10% over
          overperformCount++;
          totalDeviation += deviation;
        }
      }
    });
    
    const avgDeviation = totalDeviation / recent.length;
    const isSignificant = overperformCount >= 5 && avgDeviation > 10;
    
    return {
      isSignificant,
      pattern: `${overperformCount}/${recent.length} workouts exceeded plan`,
      avgDeviation
    };
  }
  
  /**
   * Generate AI-powered plan adjustment
   */
  async generateAdjustment(data, issues) {
    const prompt = this.buildPrompt(data, issues);
    
    console.log('🤖 Calling OpenAI for adjustment recommendation...');
    
    const openai = this.getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert cycling coach specializing in adaptive training.
          Analyze the athlete's data and recommend specific plan adjustments.
          Be conservative with increases, aggressive with recovery when needed.
          Always consider the target race date and current fitness trajectory.
          Provide encouraging, motivational language.
          
          IMPORTANT: You must respond with valid JSON only, no other text.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });
    
    let content = response.choices[0].message.content;
    
    // Clean up the response - remove markdown code blocks if present
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    console.log('Raw AI response:', content);
    
    const adjustment = JSON.parse(content);
    
    console.log('✅ AI adjustment generated:', adjustment);
    
    return adjustment;
  }
  
  /**
   * Build prompt for OpenAI
   */
  buildPrompt(data, issues) {
    const targetRace = data.races && data.races.length > 0 ? data.races[0] : null;
    
    return `
ATHLETE DATA:
Current Fitness (CTL): ${data.fitness.ctl || 'Unknown'}
Current Fatigue (ATL): ${data.fitness.atl || 'Unknown'}
Current Form (TSB): ${data.fitness.tsb || 'Unknown'}

${targetRace ? `TARGET RACE:
Name: ${targetRace.name}
Date: ${targetRace.date}
Days Until: ${targetRace.daysUntil}
Target Peak Fitness: ${targetRace.targetCTL || 'Not set'}
` : 'No target race set'}

CURRENT PLAN:
${data.plan ? `This Week: ${data.plan.thisWeek?.totalTSS || 'Unknown'} TSS
Next Week: ${data.plan.nextWeek?.totalTSS || 'Unknown'} TSS` : 'No active training plan'}

ISSUES DETECTED:
${issues.map(i => `- ${i.type}: ${i.severity}${i.daysOff ? ` (${i.daysOff} days off)` : ''}`).join('\n')}

${data.activities && data.activities.length > 0 ? `RECENT PERFORMANCE (Last ${Math.min(7, data.activities.length)} days):
${data.activities.slice(0, 7).map(a => {
  if (a.plannedTss && a.actualTss) {
    const deviation = ((a.actualTss - a.plannedTss) / a.plannedTss * 100).toFixed(0);
    return `${a.date}: Planned ${a.plannedTss} TSS, Actual ${a.actualTss} TSS (${deviation > 0 ? '+' : ''}${deviation}%)`;
  }
  return `${a.date}: ${a.actualTss || 0} TSS`;
}).join('\n')}` : ''}

TASK:
Generate a specific plan adjustment that:
1. Addresses the detected issues
2. Keeps the athlete on track for their race (if applicable)
3. Prevents injury/burnout
4. Maintains motivation and confidence

Return JSON with this exact structure:
{
  "action": "adjust_plan" | "recovery_week" | "increase_load" | "no_change",
  "changes": [
    {
      "week": "current" | "next" | "+2",
      "adjustment": "specific description of changes"
    }
  ],
  "reasoning": "brief explanation of why you made this decision",
  "raceImpact": {
    "impact": "none" | "minor" | "moderate" | "significant",
    "newPeakFitness": number or null,
    "stillAchievable": boolean,
    "message": "encouraging message about race readiness"
  },
  "userMessage": "friendly, motivational notification to show the user (2-3 sentences)"
}
    `.trim();
  }
  
  /**
   * Save adjustment to database
   */
  async saveAdjustment(userId, adjustment, issues) {
    // Link to the first issue's event if it exists
    const eventId = issues[0]?.data?.id || null;
    
    console.log('💾 Saving adjustment to database...');
    console.log('User ID:', userId);
    console.log('Event ID:', eventId);
    console.log('Adjustment type:', adjustment.action);
    console.log('Changes:', adjustment.changes);
    console.log('Reasoning:', adjustment.reasoning);
    
    const adjustmentId = planAdjustmentDb.create(userId, {
      eventId,
      type: adjustment.action,
      changes: adjustment.changes,
      reasoning: adjustment.reasoning
    });
    
    console.log('✅ Adjustment saved with ID:', adjustmentId);
    
    return adjustmentId;
  }
}

export default new AdaptiveTrainingService();
