import { startOfWeek, endOfWeek, isWithinInterval, subWeeks, differenceInDays, startOfDay, subDays } from 'date-fns';
import apiKeyLoaderModule from './apiKeyLoader.cjs';
import OpenAI from 'openai';

const { getApiKey } = apiKeyLoaderModule;

class AnalyticsService {
  // Calculate estimated FTP from recent power data
  calculateFTP(activities) {
    console.log('[FTP Calc] Starting with', activities.length, 'activities');
    
    const powerActivities = activities.filter(a => 
      a.avgPower && a.avgPower > 0 && a.duration >= 1200 // At least 20 min
    );
    console.log('[FTP Calc] Power activities (>=20min):', powerActivities.length);

    if (powerActivities.length === 0) {
      console.log('[FTP Calc] No power activities found, returning null');
      return null;
    }

    // Sort by normalized power (or avg power) descending
    const sortedByPower = powerActivities
      .sort((a, b) => (b.normalizedPower || b.avgPower) - (a.normalizedPower || a.avgPower));

    // Take best 20-60 min effort in last 6 weeks
    const sixWeeksAgo = subWeeks(new Date(), 6);
    const recentPowerActivities = sortedByPower.filter(a => {
      const activityDate = new Date(a.date);
      return activityDate >= sixWeeksAgo;
    });
    console.log('[FTP Calc] Recent power activities (last 6 weeks):', recentPowerActivities.length);
    
    const recentBest = recentPowerActivities.find(a => a.duration >= 1200 && a.duration <= 3600);

    if (recentBest) {
      // FTP is approximately 95% of 20-min power or 100% of 60-min power
      const power = recentBest.normalizedPower || recentBest.avgPower;
      const durationMin = recentBest.duration / 60;
      console.log('[FTP Calc] Found recent best effort:', {
        date: recentBest.date,
        power,
        durationMin: Math.round(durationMin)
      });
      
      if (durationMin <= 30) {
        const ftp = Math.round(power * 0.95);
        console.log('[FTP Calc] Returning FTP (95% of 20-30min):', ftp);
        return ftp;
      } else {
        const ftp = Math.round(power);
        console.log('[FTP Calc] Returning FTP (100% of 30-60min):', ftp);
        return ftp;
      }
    }

    // Fallback: use average of top 3 normalized powers
    console.log('[FTP Calc] No recent 20-60min effort, using fallback (top 3 average)');
    const topThree = sortedByPower.slice(0, 3);
    const avgPower = topThree.reduce((sum, a) => sum + (a.normalizedPower || a.avgPower), 0) / topThree.length;
    const ftp = Math.round(avgPower * 0.95);
    console.log('[FTP Calc] Fallback FTP:', ftp);
    return ftp;
  }

  // Calculate TSS (Training Stress Score) for an activity
  calculateTSS(activity, ftp) {
    if (!activity.duration) return 0;

    const durationHours = activity.duration / 3600;

    // If we have power data and FTP
    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return Math.round(durationHours * intensityFactor * intensityFactor * 100);
    }

    // Estimate from heart rate if available
    if (activity.avgHeartRate) {
      // Rough estimation: assume max HR ~190, threshold HR ~170
      const estimatedIntensity = activity.avgHeartRate / 170;
      return Math.round(durationHours * estimatedIntensity * estimatedIntensity * 100);
    }

    // Fallback: estimate from duration and type
    const typeMultipliers = {
      'Ride': 1.0,
      'VirtualRide': 1.0,
      'Run': 1.2,
      'Workout': 0.8,
      'default': 0.7,
    };

    const multiplier = typeMultipliers[activity.type] || typeMultipliers.default;
    return Math.round(durationHours * 60 * multiplier);
  }

  // Calculate training load metrics
  calculateTrainingLoad(activities, ftp) {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const fourWeeksAgo = subWeeks(now, 4);

    const weekActivities = activities.filter(a => new Date(a.date) >= oneWeekAgo);
    const fourWeekActivities = activities.filter(a => new Date(a.date) >= fourWeeksAgo);

    const weeklyTSS = weekActivities.reduce((sum, a) => sum + this.calculateTSS(a, ftp), 0);
    const weeklyTime = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const weeklyDistance = weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const weeklyElevation = weekActivities.reduce((sum, a) => sum + (a.elevation || 0), 0);

    // Calculate 4-week average
    const avgWeeklyTSS = fourWeekActivities.reduce((sum, a) => sum + this.calculateTSS(a, ftp), 0) / 4;
    const avgWeeklyTime = fourWeekActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 4;

    return {
      currentWeek: {
        tss: Math.round(weeklyTSS),
        time: Math.round(weeklyTime / 3600), // hours
        distance: Math.round(weeklyDistance / 1000), // km
        elevation: Math.round(weeklyElevation),
        activities: weekActivities.length,
      },
      fourWeekAverage: {
        tss: Math.round(avgWeeklyTSS),
        time: Math.round(avgWeeklyTime / 3600),
      },
      loadRatio: avgWeeklyTSS > 0 ? (weeklyTSS / avgWeeklyTSS).toFixed(2) : 0,
    };
  }

  // Get weekly summary
  getWeeklySummary(activities, weekStart) {
    const start = weekStart ? new Date(weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });

    const weekActivities = activities.filter(a => {
      const activityDate = new Date(a.date);
      return isWithinInterval(activityDate, { start, end });
    });

    const totalTime = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalDistance = weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalElevation = weekActivities.reduce((sum, a) => sum + (a.elevation || 0), 0);

    const byType = weekActivities.reduce((acc, a) => {
      const type = a.type || 'Other';
      if (!acc[type]) {
        acc[type] = { count: 0, time: 0, distance: 0 };
      }
      acc[type].count++;
      acc[type].time += a.duration || 0;
      acc[type].distance += a.distance || 0;
      return acc;
    }, {});

    return {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      totalActivities: weekActivities.length,
      totalTime: Math.round(totalTime / 3600), // hours
      totalDistance: Math.round(totalDistance / 1000), // km
      totalElevation: Math.round(totalElevation),
      byType,
    };
  }

  // Get trend analysis over multiple weeks
  getTrends(activities, weeks = 6, ftp = null) {
    const now = new Date();
    const trends = [];
    
    console.log(`[Trends] Calculating trends for ${weeks} weeks with FTP: ${ftp}, activities: ${activities.length}`);

    // Include current incomplete week (i = -1) plus the requested number of complete weeks
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      // For current week, use today as end date; for past weeks, use week end
      const weekEnd = i === 0 ? now : endOfWeek(weekStart, { weekStartsOn: 1 });

      const weekActivities = activities.filter(a => {
        const activityDate = new Date(a.date);
        return isWithinInterval(activityDate, { start: weekStart, end: weekEnd });
      });

      const totalTime = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
      const totalDistance = weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
      const totalElevation = weekActivities.reduce((sum, a) => sum + (a.elevation || 0), 0);
      
      // Calculate TSS for the week
      let totalTSS = 0;
      weekActivities.forEach(a => {
        const activityTSS = this.calculateActivityTSS(a, ftp);
        console.log(`[Trends TSS] ${a.name} (${new Date(a.date).toLocaleDateString()}): ${activityTSS.toFixed(1)} TSS (power: ${a.normalizedPower || a.avgPower || 'none'}, HR: ${a.avgHeartRate || 'none'}, duration: ${Math.round(a.duration/60)}min)`);
        totalTSS += activityTSS;
      });
      console.log(`[Trends TSS] Week ${weekStart.toISOString().split('T')[0]}: ${totalTSS.toFixed(1)} TSS from ${weekActivities.length} activities`);

      trends.push({
        week: (i === 0 ? now : weekStart).toISOString().split('T')[0], // Use today for current week, week start for past weeks
        activities: weekActivities.length,
        time: Math.round(totalTime / 3600),
        distance: Math.round(totalDistance / 1000),
        elevation: Math.round(totalElevation),
        tss: Math.round(totalTSS),
      });
    }

    return trends;
  }
  
  // Calculate TSS for a single activity
  calculateActivityTSS(activity, ftp) {
    if (!activity.duration) return 0;
    
    const durationHours = activity.duration / 3600;
    
    // If we have power data and FTP
    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return durationHours * intensityFactor * intensityFactor * 100;
    }
    
    // Estimate from heart rate if available
    if (activity.avgHeartRate) {
      const estimatedIntensity = activity.avgHeartRate / 170;
      return durationHours * estimatedIntensity * estimatedIntensity * 100;
    }
    
    // Fallback: estimate from duration and type
    const typeMultipliers = {
      'Ride': 1.0,
      'VirtualRide': 1.0,
      'Run': 1.2,
      'Workout': 0.8,
    };
    
    const multiplier = typeMultipliers[activity.type] || 0.7;
    return durationHours * 60 * multiplier;
  }

  // Calculate days until goal event
  daysUntilGoal(goalDate) {
    const now = new Date();
    const goal = new Date(goalDate);
    return differenceInDays(goal, now);
  }

  // Generate AI-powered smart insights based on last 7 days
  async generateAISmartInsights(activities, ftp, riderType, coachPersona) {
    console.log('🧠 [Smart Insights] Generating AI insights for last 7 days');
    
    // Filter activities from last 7 days (using start of day to include full days)
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);
    console.log('📅 [Smart Insights] Date range:', sevenDaysAgo.toISOString(), 'to', today.toISOString());
    
    const recentActivities = activities
      .filter(a => {
        const activityDate = startOfDay(new Date(a.date));
        return activityDate >= sevenDaysAgo && activityDate <= today;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('📊 [Smart Insights] Found', recentActivities.length, 'activities in last 7 days');
    if (recentActivities.length > 0) {
      console.log('📊 [Smart Insights] Activity dates:', recentActivities.map(a => new Date(a.date).toLocaleDateString()));
    }
    
    // Calculate 7-day metrics
    const totalTime = recentActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalDistance = recentActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalElevation = recentActivities.reduce((sum, a) => sum + (a.elevation || 0), 0);
    const totalTSS = recentActivities.reduce((sum, a) => sum + (a.tss || this.calculateActivityTSS(a, ftp)), 0);
    const avgPower = recentActivities.filter(a => a.avgPower).length > 0
      ? recentActivities.filter(a => a.avgPower).reduce((sum, a) => sum + a.avgPower, 0) / recentActivities.filter(a => a.avgPower).length
      : null;
    
    // Calculate consistency (days with activities)
    const daysWithActivities = new Set(recentActivities.map(a => new Date(a.date).toDateString())).size;
    const consistencyPercent = Math.round((daysWithActivities / 7) * 100);
    
    // Check for FTP test recommendation
    const daysSinceLastHardEffort = this.getDaysSinceLastHardEffort(activities);
    
    // Prepare context for AI
    const context = {
      last7Days: {
        activityCount: recentActivities.length,
        totalTimeHours: Math.round(totalTime / 3600 * 10) / 10,
        totalDistanceKm: Math.round(totalDistance / 1000),
        totalElevationM: Math.round(totalElevation),
        totalTSS: Math.round(totalTSS),
        avgPower: avgPower ? Math.round(avgPower) : null,
        daysActive: daysWithActivities,
        consistencyPercent
      },
      ftp,
      riderType: riderType?.type || 'Unknown',
      daysSinceLastHardEffort,
      recentActivities: recentActivities.slice(0, 5).map(a => ({
        date: new Date(a.date).toLocaleDateString(),
        name: a.name,
        duration: Math.round(a.duration / 60),
        distance: a.distance ? Math.round(a.distance / 1000) : null,
        tss: a.tss || Math.round(this.calculateActivityTSS(a, ftp))
      }))
    };
    
    console.log('📈 [Smart Insights] 7-day summary:', context.last7Days);
    
    try {
      // Get OpenAI API key
      const apiKey = await getApiKey('openai');
      if (!apiKey) {
        console.warn('⚠️ [Smart Insights] No OpenAI API key found, returning fallback insights');
        return this.getFallbackInsights(context, coachPersona);
      }
      
      const openai = new OpenAI({ apiKey });
      
      // Create AI prompt with strong persona emphasis
      const coachName = coachPersona?.name || 'Coach Sarah';
      const coachTone = coachPersona?.tone || 'motivational';
      const coachDescription = coachPersona?.description || 'A supportive and encouraging coach';
      const coachCatchphrase = coachPersona?.catchphrase || '';
      
      const prompt = `You are ${coachName}, a ${coachTone} cycling coach.

YOUR COACHING PERSONA:
${coachDescription}
${coachCatchphrase ? `Your catchphrase: "${coachCatchphrase}"` : ''}

CRITICAL: Your coach comment MUST:
1. Be written EXACTLY in the tone described above (${coachTone})
2. DIRECTLY reference the specific numbers from the 7-day performance data
3. Be 1-2 sentences maximum
4. Match your personality completely - no generic praise if you're strict/demanding

ATHLETE'S LAST 7 DAYS PERFORMANCE:
- Activities Completed: ${context.last7Days.activityCount} ${context.last7Days.activityCount === 1 ? 'activity' : 'activities'}
- Training Time: ${context.last7Days.totalTimeHours} hours
- Distance: ${context.last7Days.totalDistanceKm} km
- Total TSS: ${context.last7Days.totalTSS}
- Days Active: ${context.last7Days.daysActive} out of 7 days (${context.last7Days.consistencyPercent}% consistency)
- Average Power: ${context.last7Days.avgPower ? context.last7Days.avgPower + 'W' : 'N/A'}

RECENT ACTIVITIES:
${context.recentActivities.map(a => `- ${a.date}: ${a.name} (${a.duration}min, ${a.distance ? a.distance + 'km,' : ''} ${a.tss} TSS)`).join('\n')}

EXAMPLES OF TONE-APPROPRIATE COMMENTS:

If you're STRICT/DISCIPLINARIAN (like Coach Nigel):
- "${context.last7Days.activityCount} ${context.last7Days.activityCount === 1 ? 'activity' : 'activities'} in 7 days? That's unacceptable. Champions train 5-6 days per week minimum."
- "${context.last7Days.daysActive} days active this week. Not good enough - you need consistency, not excuses."
- "${context.last7Days.totalTSS} TSS is mediocre at best. Where's the intensity? Where's the commitment?"

If you're MOTIVATIONAL/ENCOURAGING:
- "Fantastic! ${context.last7Days.activityCount} ${context.last7Days.activityCount === 1 ? 'activity' : 'activities'} this week shows real dedication. Keep that momentum going!"
- "${context.last7Days.daysActive} days of training! You're building something special here."

If you're ANALYTICAL/DATA-DRIVEN:
- "${context.last7Days.activityCount} sessions totaling ${context.last7Days.totalTSS} TSS represents a ${context.last7Days.totalTSS > 400 ? 'high' : context.last7Days.totalTSS > 250 ? 'moderate' : 'low'} training load this week."
- "Training frequency: ${context.last7Days.consistencyPercent}%. Data suggests ${context.last7Days.consistencyPercent < 50 ? 'increasing consistency should be priority one' : 'maintaining this pattern will yield results'}."

Provide a response in JSON format:
{
  "coachComment": "Your 1-2 sentence comment that MUST reference specific numbers and match your persona tone",
  "insights": [
    {
      "title": "Insight title",
      "message": "Detailed message",
      "priority": "high|medium|low",
      "icon": "Zap|AlertTriangle|TrendingUp|Calendar|Mountain|Trophy|Heart"
    }
  ]
}

Remember: Your comment must sound like YOU (${coachName}, ${coachTone}), not a generic coach. Use the actual numbers!`;

      console.log('🤖 [Smart Insights] Calling OpenAI API...');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert cycling coach providing personalized training insights. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });
      
      const responseText = completion.choices[0].message.content.trim();
      console.log('✅ [Smart Insights] Received AI response');
      
      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ [Smart Insights] Could not parse JSON from AI response');
        return this.getFallbackInsights(context, coachPersona);
      }
      
      const aiInsights = JSON.parse(jsonMatch[0]);
      console.log('🎯 [Smart Insights] Successfully generated AI insights');
      
      return {
        coachComment: aiInsights.coachComment,
        coachName: coachPersona?.name || 'Coach Sarah',
        insights: aiInsights.insights || [],
        metrics: context.last7Days
      };
      
    } catch (error) {
      console.error('❌ [Smart Insights] Error generating AI insights:', error.message);
      return this.getFallbackInsights(context, coachPersona);
    }
  }
  
  // Helper: Get days since last hard effort
  getDaysSinceLastHardEffort(activities) {
    const hardEfforts = activities.filter(a => {
      const tss = a.tss || this.calculateActivityTSS(a, null);
      return tss > 100;
    });
    
    if (hardEfforts.length === 0) return 999;
    
    const mostRecent = hardEfforts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const daysDiff = Math.floor((Date.now() - new Date(mostRecent.date)) / (1000 * 60 * 60 * 24));
    return daysDiff;
  }
  
  // Fallback insights if AI fails
  getFallbackInsights(context, coachPersona) {
    const insights = [];
    
    // Consistency check
    if (context.last7Days.consistencyPercent < 50) {
      insights.push({
        title: 'Improve Consistency',
        message: `You're training ${context.last7Days.consistencyPercent}% of days. Consistency is key to improvement.`,
        priority: 'medium',
        icon: 'Calendar'
      });
    } else {
      insights.push({
        title: 'Great Consistency!',
        message: `${context.last7Days.daysActive} days active this week. Keep up the excellent routine!`,
        priority: 'low',
        icon: 'Trophy'
      });
    }
    
    // FTP test check
    if (context.daysSinceLastHardEffort > 30) {
      insights.push({
        title: 'Time for an FTP Test',
        message: `It's been ${context.daysSinceLastHardEffort} days since your last hard effort. Consider testing your FTP to ensure accurate training zones.`,
        priority: 'high',
        icon: 'Zap'
      });
    }
    
    // Training load check
    if (context.last7Days.totalTSS > 600) {
      insights.push({
        title: 'High Training Load',
        message: `Your weekly TSS is ${context.last7Days.totalTSS}. Consider adding a recovery day to prevent overtraining.`,
        priority: 'high',
        icon: 'AlertTriangle'
      });
    } else if (context.last7Days.totalTSS < 200 && context.last7Days.activityCount > 2) {
      insights.push({
        title: 'Room for More Training',
        message: `Your weekly TSS is ${context.last7Days.totalTSS}. You have capacity to increase training volume.`,
        priority: 'medium',
        icon: 'TrendingUp'
      });
    }
    
    // Persona-specific fallback comments with actual metrics
    const activityWord = context.last7Days.activityCount === 1 ? 'activity' : 'activities';
    
    const coachComments = {
      motivational: `Great work this week! ${context.last7Days.activityCount} ${activityWord} completed with ${context.last7Days.totalTSS} TSS. Keep pushing forward!`,
      analytical: `This week's data: ${context.last7Days.activityCount} sessions, ${context.last7Days.totalTSS} TSS, ${context.last7Days.consistencyPercent}% consistency. ${context.last7Days.totalTSS > 300 ? 'Solid training load.' : 'Room for volume increase.'}`,
      supportive: `You're doing wonderfully! ${context.last7Days.daysActive} active days this week shows real commitment. ${context.last7Days.totalTSS} TSS is progress!`,
      strategic: `Strategic week: ${context.last7Days.activityCount} sessions, ${context.last7Days.totalTSS} TSS, ${context.last7Days.consistencyPercent}% consistency. ${context.last7Days.consistencyPercent >= 70 ? 'Well executed.' : 'Aim for more consistency.'}`,
      encouraging: `Amazing effort! ${context.last7Days.activityCount} ${activityWord} and ${context.last7Days.totalTSS} TSS this week. You're getting stronger every day!`,
      experienced: `${context.last7Days.activityCount} sessions, ${context.last7Days.totalTSS} TSS this week. ${context.last7Days.totalTSS > 350 ? 'Right on track.' : 'Could use more volume.'} Keep at it.`,
      disciplinarian: `${context.last7Days.activityCount} ${activityWord} in 7 days? ${context.last7Days.activityCount < 4 ? "That's not enough. Champions train 5-6 days minimum." : context.last7Days.activityCount >= 5 ? "Acceptable. Now maintain it." : "Needs improvement. No excuses."}`
    };
    
    const tone = coachPersona?.tone || 'motivational';
    
    return {
      coachComment: coachComments[tone] || coachComments.motivational,
      coachName: coachPersona?.name || 'Coach Sarah',
      insights: insights.slice(0, 3),
      metrics: context.last7Days
    };
  }
}

export const analyticsService = new AnalyticsService();
