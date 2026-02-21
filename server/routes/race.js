import express from 'express';
import OpenAI from 'openai';
import { getDb } from '../db.js';

const router = express.Router();

let openai = null;

// Lazy initialization of OpenAI client
const getOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

// Generate AI race plan
router.post('/plan', async (req, res) => {
  try {
    const { routeAnalysis, riderProfile, currentForm, trainingPlan } = req.body;

    if (!routeAnalysis) {
      return res.status(400).json({ error: 'Route analysis is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        details: 'Please add OPENAI_API_KEY to your environment variables'
      });
    }

    const client = getOpenAI();
    if (!client) {
      return res.status(500).json({ 
        error: 'OpenAI client initialization failed',
        details: 'Could not initialize OpenAI client'
      });
    }

    // Build context for AI
    const context = buildRacePlanContext(routeAnalysis, riderProfile, currentForm, trainingPlan);

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert cycling coach creating personalized race strategies. 
Analyze the route, rider profile, current form, and training status to create a detailed race plan.
Focus on pacing strategy, nutrition, key segments, and tactical advice.
Be specific with power targets, heart rate zones, and timing.`
        },
        {
          role: 'user',
          content: context
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const racePlan = parseRacePlan(completion.choices[0].message.content);

    res.status(200).json(racePlan);
  } catch (error) {
    console.error('Error generating race plan:', error);
    res.status(500).json({ 
      error: 'Failed to generate race plan', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

function buildRacePlanContext(routeAnalysis, riderProfile, currentForm, trainingPlan) {
  let context = `Create a detailed race plan for the following event:\n\n`;

  // Route Information
  context += `ROUTE ANALYSIS:\n`;
  context += `- Distance: ${routeAnalysis.distance.toFixed(1)} km\n`;
  context += `- Elevation Gain: ${routeAnalysis.elevation.gain}m\n`;
  context += `- Elevation Loss: ${routeAnalysis.elevation.loss}m\n`;
  context += `- Difficulty: ${routeAnalysis.difficulty.level} (${routeAnalysis.difficulty.score}/100)\n`;
  context += `- Estimated Time: ${routeAnalysis.estimatedTime.formatted}\n\n`;

  if (routeAnalysis.climbs && routeAnalysis.climbs.length > 0) {
    context += `KEY CLIMBS:\n`;
    routeAnalysis.climbs.forEach((climb, i) => {
      context += `${i + 1}. ${climb.name} (Cat ${climb.category})\n`;
      context += `   - Distance: ${climb.distance.toFixed(1)}km at ${climb.avgGradient}% avg gradient\n`;
      context += `   - Elevation: ${climb.elevationGain}m\n`;
      context += `   - Starts at: ${climb.startDistance}km\n`;
    });
    context += `\n`;
  }

  // Rider Profile
  if (riderProfile) {
    context += `RIDER PROFILE:\n`;
    context += `- Type: ${riderProfile.type}\n`;
    context += `- FTP: ${riderProfile.ftp}W\n`;
    if (riderProfile.weight) {
      context += `- Weight: ${riderProfile.weight}kg\n`;
      context += `- Power-to-Weight: ${(riderProfile.ftp / riderProfile.weight).toFixed(2)} W/kg\n`;
    }
    context += `- Strengths: ${riderProfile.strengths || 'Balanced'}\n\n`;
  }

  // Current Form
  if (currentForm) {
    context += `CURRENT FORM:\n`;
    context += `- Readiness Score: ${currentForm.readinessScore}%\n`;
    context += `- Fitness (CTL): ${currentForm.metrics.fitness}\n`;
    context += `- Fatigue (ATL): ${currentForm.metrics.fatigue}\n`;
    context += `- Form (TSB): ${currentForm.metrics.form}\n`;
    context += `- Status: ${currentForm.statusMessage}\n\n`;
  }

  // Training Plan Status
  if (trainingPlan) {
    context += `TRAINING STATUS:\n`;
    context += `- Plan Completion: ${trainingPlan.completion}%\n`;
    context += `- Working Towards: ${trainingPlan.targetRiderType}\n`;
    context += `- Training Alignment: ${trainingPlan.alignmentScore}%\n\n`;
  }

  context += `Please provide a comprehensive race plan including:\n`;
  context += `1. Overall Strategy (pacing approach based on rider type and form)\n`;
  context += `2. Pre-Race Preparation (final days before the event)\n`;
  context += `3. Start Strategy (first 30 minutes)\n`;
  context += `4. Segment-by-Segment Plan (specific power/HR targets for each key section)\n`;
  context += `5. Climb Strategy (how to approach each categorized climb)\n`;
  context += `6. Nutrition Plan (when and what to consume)\n`;
  context += `7. Pacing Zones (power and heart rate targets)\n`;
  context += `8. Contingency Plans (what to do if things don't go as planned)\n`;
  context += `9. Final Push Strategy (last 10km approach)\n\n`;
  context += `Format the response as structured JSON with these sections.`;

  return context;
}

function parseRacePlan(content) {
  try {
    // Try to parse as JSON first
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // If JSON parsing fails, structure the text response
  }

  // Fallback: structure the text response
  return {
    overallStrategy: extractSection(content, 'Overall Strategy', 'Pre-Race Preparation'),
    preRace: extractSection(content, 'Pre-Race Preparation', 'Start Strategy'),
    startStrategy: extractSection(content, 'Start Strategy', 'Segment-by-Segment Plan'),
    segmentPlan: extractSection(content, 'Segment-by-Segment Plan', 'Climb Strategy'),
    climbStrategy: extractSection(content, 'Climb Strategy', 'Nutrition Plan'),
    nutritionPlan: extractSection(content, 'Nutrition Plan', 'Pacing Zones'),
    pacingZones: extractSection(content, 'Pacing Zones', 'Contingency Plans'),
    contingencyPlans: extractSection(content, 'Contingency Plans', 'Final Push Strategy'),
    finalPush: extractSection(content, 'Final Push Strategy', null),
    fullText: content
  };
}

function extractSection(text, startMarker, endMarker) {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return '';

  const contentStart = startIndex + startMarker.length;
  const endIndex = endMarker ? text.indexOf(endMarker, contentStart) : text.length;

  if (endIndex === -1) return text.substring(contentStart).trim();

  return text.substring(contentStart, endIndex).trim();
}

// POST-RACE ANALYSIS ENDPOINTS

// Submit post-race feedback
router.post('/analysis/feedback', async (req, res) => {
  try {
    const { stravaActivityId, feedback } = req.body;
    
    if (!stravaActivityId || !feedback) {
      return res.status(400).json({ error: 'Activity ID and feedback are required' });
    }

    // Store feedback in database (for now, use in-memory or localStorage on client)
    // In production, this would save to a database
    
    res.status(200).json({ 
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Generate AI race analysis
router.post('/analysis/generate', async (req, res) => {
  try {
    const { 
      raceActivity, 
      racePlan, 
      riderProfile, 
      feedback,
      preRaceActivities,
      coachPersona
    } = req.body;

    if (!raceActivity) {
      return res.status(400).json({ error: 'Race activity data is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        details: 'Please add OPENAI_API_KEY to your environment variables'
      });
    }

    const client = getOpenAI();
    if (!client) {
      return res.status(500).json({ 
        error: 'OpenAI client initialization failed'
      });
    }

    // Log request data for debugging
    console.log('Race analysis request received');
    console.log('Coach persona:', coachPersona);
    console.log('Race activity:', raceActivity?.name);
    console.log('Rider profile:', riderProfile?.name);

    // Calculate detailed metrics for data-backed analysis
    let detailedMetrics;
    try {
      detailedMetrics = calculateDetailedMetrics(raceActivity, riderProfile, preRaceActivities);
      console.log('Detailed metrics calculated successfully');
    } catch (metricsError) {
      console.error('Error calculating detailed metrics:', metricsError);
      return res.status(500).json({ 
        error: 'Failed to calculate performance metrics',
        details: metricsError.message
      });
    }

    // Build analysis prompt with coach persona
    let prompt;
    try {
      prompt = buildAnalysisPrompt(raceActivity, racePlan, riderProfile, feedback, preRaceActivities, detailedMetrics, coachPersona);
      console.log('Prompt built successfully, length:', prompt.length);
    } catch (promptError) {
      console.error('Error building prompt:', promptError);
      return res.status(500).json({ 
        error: 'Failed to build analysis prompt',
        details: promptError.message
      });
    }

    // Build system prompt with coach persona - safely handle missing fields
    const coachTone = coachPersona && coachPersona.name ? `
COACH PERSONA - ${coachPersona.name}:
- Tone: ${coachPersona.tone || 'professional'}
- Communication Style: ${coachPersona.description || coachPersona.personality || 'supportive and data-driven'}
- Use this coaching style throughout your analysis` : '';

    const completion = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a professional cycling coach analyzing race performance.${coachTone}

IMPORTANT RULES:
1. ALWAYS back up your statements with specific data from the metrics provided
2. When mentioning fatigue, cite the actual TSS numbers and taper ratio
3. When discussing pacing, reference the power variability and intensity factor
4. When talking about effort distribution, cite the zone distribution percentages
5. DO NOT repeat what the athlete told you - analyze the DATA and provide NEW insights
6. Keep bullet points SHORT (10-12 words max) but DATA-RICH
7. Always respond with valid JSON only

Your analysis should reveal insights the athlete might not have noticed by looking at the raw data.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const analysisText = completion.choices[0].message.content.trim();
    
    // Parse JSON response
    let analysis;
    try {
      const jsonText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonText);
      
      // Add detailed metrics for frontend visualization
      analysis.detailedMetrics = detailedMetrics;
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      // Fallback response
      analysis = {
        overallAssessment: analysisText,
        whatWentWell: ["Performance data analyzed"],
        whatDidntGoWell: ["Unable to parse detailed analysis"],
        keyInsights: ["Review race data for patterns"],
        recommendations: ["Continue training consistently"],
        trainingFocus: ["Maintain current approach"],
        performanceScore: 75,
        pacingScore: 75,
        executionScore: 75,
        tacticalScore: 75,
        detailedMetrics
      };
    }

    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error generating race analysis:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate analysis',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Calculate detailed metrics for data-backed analysis
function calculateDetailedMetrics(raceActivity, riderProfile, preRaceActivities) {
  const metrics = {
    power: {},
    pacing: {},
    zones: {},
    preRace: {}
  };

  const ftp = riderProfile?.ftp || 250;

  // Power Analysis
  if (raceActivity.avgPower && raceActivity.normalizedPower) {
    metrics.power.average = Math.round(raceActivity.avgPower);
    metrics.power.normalized = Math.round(raceActivity.normalizedPower);
    metrics.power.intensityFactor = (raceActivity.normalizedPower / ftp).toFixed(2);
    metrics.power.variabilityIndex = (raceActivity.normalizedPower / raceActivity.avgPower).toFixed(2);
    metrics.power.percentOfFTP = Math.round((raceActivity.avgPower / ftp) * 100);
  }

  // Pacing Analysis
  if (raceActivity.avgPower && raceActivity.normalizedPower) {
    const vi = raceActivity.normalizedPower / raceActivity.avgPower;
    if (vi < 1.05) {
      metrics.pacing.quality = 'Excellent - Very steady effort';
      metrics.pacing.score = 95;
    } else if (vi < 1.10) {
      metrics.pacing.quality = 'Good - Mostly consistent';
      metrics.pacing.score = 80;
    } else if (vi < 1.15) {
      metrics.pacing.quality = 'Fair - Some surges';
      metrics.pacing.score = 65;
    } else {
      metrics.pacing.quality = 'Poor - Very variable effort';
      metrics.pacing.score = 45;
    }
  }

  // Zone Distribution (estimated from power data)
  if (raceActivity.avgPower && ftp) {
    const avgPercent = (raceActivity.avgPower / ftp) * 100;
    // Simplified zone estimation based on average power
    if (avgPercent < 55) {
      metrics.zones.primary = 'Zone 2 (Endurance)';
      metrics.zones.intensity = 'Easy';
    } else if (avgPercent < 75) {
      metrics.zones.primary = 'Zone 3 (Tempo)';
      metrics.zones.intensity = 'Moderate';
    } else if (avgPercent < 90) {
      metrics.zones.primary = 'Zone 4 (Threshold)';
      metrics.zones.intensity = 'Hard';
    } else if (avgPercent < 105) {
      metrics.zones.primary = 'Zone 5 (VO2 Max)';
      metrics.zones.intensity = 'Very Hard';
    } else {
      metrics.zones.primary = 'Zone 6+ (Anaerobic)';
      metrics.zones.intensity = 'Maximum';
    }
  }

  // Pre-Race Analysis
  if (preRaceActivities && preRaceActivities.length > 0) {
    const raceDate = new Date(raceActivity.date);
    raceDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Determine race category based on duration
    // Research basis: See TAPER_ANALYSIS_METHODOLOGY.md
    // 
    // Key sources:
    // - Li et al. (2023) PLOS ONE meta-analysis: 41-60% volume reduction optimal for endurance
    // - High North Performance: Shorter events need less taper due to peripheral vs central fatigue
    // - CTS/Rutberg: Criteriums need sharpness maintenance, not deep rest
    // - Bosquet et al. meta-analysis: 8-14 day tapers most effective for cycling
    //
    // Rationale: Longer events cause more central fatigue (takes longer to recover)
    // Shorter events limited by peripheral fatigue (glycogen) which recovers quickly
    
    const raceDurationMinutes = raceActivity.duration ? raceActivity.duration / 60 : 60;
    let raceCategory, taperRelevance, optimalTaperRange;
    
    if (raceDurationMinutes < 45) {
      // Short race: Crits, short TTs, sprints
      // "For shorter or higher intensity events, a taper lasting a week or less is likely 
      // to be more appropriate" - High North Performance
      raceCategory = 'Short (< 45 min)';
      taperRelevance = 'Low';
      optimalTaperRange = { min: 70, max: 100 }; // Minimal taper needed - maintain sharpness
    } else if (raceDurationMinutes < 90) {
      // Medium race: Road races, longer crits
      // Mixed fatigue profile - moderate taper beneficial
      raceCategory = 'Medium (45-90 min)';
      taperRelevance = 'Moderate';
      optimalTaperRange = { min: 60, max: 85 }; // Some taper helpful
    } else if (raceDurationMinutes < 180) {
      // Long race: Gran fondos, stage races
      // "For longer endurance events, athletes will often benefit from a slightly longer 
      // taper of perhaps 12 days" - High North Performance
      raceCategory = 'Long (1.5-3 hours)';
      taperRelevance = 'High';
      optimalTaperRange = { min: 50, max: 70 }; // Significant taper beneficial
    } else {
      // Ultra race: Sportives, ultra-endurance
      // Li et al. meta-analysis: 41-60% volume reduction optimal for endurance events
      // Full taper essential for glycogen supercompensation
      raceCategory = 'Ultra (3+ hours)';
      taperRelevance = 'Critical';
      optimalTaperRange = { min: 40, max: 60 }; // Full taper essential
    }
    
    const totalTSS = preRaceActivities.reduce((sum, a) => sum + (a.tss || 0), 0);
    
    // Week 1 = days 1-7 before race (the week immediately before)
    // Week 2 = days 8-14 before race (two weeks before)
    const week1Activities = preRaceActivities.filter(a => {
      const activityDate = new Date(a.date);
      activityDate.setHours(0, 0, 0, 0);
      const daysBefore = Math.floor((raceDate - activityDate) / (1000 * 60 * 60 * 24));
      return daysBefore >= 1 && daysBefore <= 7;
    });
    
    const week2Activities = preRaceActivities.filter(a => {
      const activityDate = new Date(a.date);
      activityDate.setHours(0, 0, 0, 0);
      const daysBefore = Math.floor((raceDate - activityDate) / (1000 * 60 * 60 * 24));
      return daysBefore >= 8 && daysBefore <= 14;
    });
    
    const lastWeekTSS = week1Activities.reduce((sum, a) => sum + (a.tss || 0), 0);
    const secondWeekTSS = week2Activities.reduce((sum, a) => sum + (a.tss || 0), 0);
    
    // Debug logging
    console.log('Race date:', raceActivity.date);
    console.log('Race duration:', raceDurationMinutes, 'min, Category:', raceCategory);
    console.log('Week 1 activities (days 1-7):', week1Activities.map(a => ({ date: a.date, tss: a.tss })));
    console.log('Week 2 activities (days 8-14):', week2Activities.map(a => ({ date: a.date, tss: a.tss })));
    console.log('Week 1 TSS:', lastWeekTSS, 'Week 2 TSS:', secondWeekTSS);

    metrics.preRace.totalTSS = Math.round(totalTSS);
    metrics.preRace.lastWeekTSS = Math.round(lastWeekTSS);
    metrics.preRace.secondWeekTSS = Math.round(secondWeekTSS);
    // Taper ratio: Week 1 / Week 2 - optimal range depends on race duration
    metrics.preRace.taperRatio = secondWeekTSS > 0 ? Math.round((lastWeekTSS / secondWeekTSS) * 100) : 0;
    metrics.preRace.avgDailyTSS = Math.round(totalTSS / 14);
    
    // Race context
    metrics.preRace.raceCategory = raceCategory;
    metrics.preRace.raceDurationMinutes = Math.round(raceDurationMinutes);
    metrics.preRace.taperRelevance = taperRelevance;
    metrics.preRace.optimalTaperRange = `${optimalTaperRange.min}-${optimalTaperRange.max}%`;

    // Assess taper quality based on race duration context
    const taperRatio = metrics.preRace.taperRatio;
    
    if (taperRatio >= optimalTaperRange.min && taperRatio <= optimalTaperRange.max) {
      metrics.preRace.taperQuality = 'Optimal';
      metrics.preRace.freshnessLevel = 'Fresh';
    } else if (taperRatio < optimalTaperRange.min) {
      // More taper than needed
      if (taperRelevance === 'Low') {
        metrics.preRace.taperQuality = 'Excessive for race type';
        metrics.preRace.freshnessLevel = 'Very Fresh (may lose sharpness)';
      } else {
        metrics.preRace.taperQuality = 'Good - Well Rested';
        metrics.preRace.freshnessLevel = 'Very Fresh';
      }
    } else if (taperRatio <= optimalTaperRange.max + 20) {
      metrics.preRace.taperQuality = 'Moderate';
      metrics.preRace.freshnessLevel = 'Slightly Fatigued';
    } else {
      // Much higher than optimal
      if (taperRelevance === 'Low' || taperRelevance === 'Moderate') {
        metrics.preRace.taperQuality = 'Acceptable for short race';
        metrics.preRace.freshnessLevel = 'Normal training load';
      } else {
        metrics.preRace.taperQuality = 'Poor - Insufficient Taper';
        metrics.preRace.freshnessLevel = 'Fatigued';
      }
    }

    // Last 3 days analysis
    const last3Days = preRaceActivities.filter(a => {
      const daysBefore = Math.floor((new Date(raceActivity.date) - new Date(a.date)) / (1000 * 60 * 60 * 24));
      return daysBefore <= 3 && daysBefore >= 1;
    });
    metrics.preRace.last3DaysTSS = Math.round(last3Days.reduce((sum, a) => sum + (a.tss || 0), 0));
  }

  return metrics;
}

function buildAnalysisPrompt(raceActivity, racePlan, riderProfile, feedback, preRaceActivities, detailedMetrics, coachPersona) {
  // Get rider's first name for personalization
  const riderName = riderProfile?.name?.split(' ')[0] || 'Athlete';
  
  let prompt = `Analyze this race performance and provide actionable insights:\n\n`;

  // Race Activity Data
  prompt += `RACE PERFORMANCE:\n`;
  prompt += `- Name: ${raceActivity.name}\n`;
  prompt += `- Distance: ${(raceActivity.distance / 1000).toFixed(1)} km\n`;
  prompt += `- Duration: ${Math.floor(raceActivity.duration / 60)} minutes\n`;
  prompt += `- Elevation: ${raceActivity.elevation}m\n`;
  
  if (raceActivity.avgPower) {
    prompt += `- Average Power: ${Math.round(raceActivity.avgPower)}W\n`;
  }
  if (raceActivity.normalizedPower) {
    prompt += `- Normalized Power: ${Math.round(raceActivity.normalizedPower)}W\n`;
  }
  if (raceActivity.avgHeartRate) {
    prompt += `- Average HR: ${Math.round(raceActivity.avgHeartRate)} bpm\n`;
  }
  if (raceActivity.maxHeartRate) {
    prompt += `- Max HR: ${Math.round(raceActivity.maxHeartRate)} bpm\n`;
  }
  if (raceActivity.tss) {
    prompt += `- TSS: ${Math.round(raceActivity.tss)}\n`;
  }
  prompt += `\n`;

  // Pre-Race Training Load Analysis
  if (preRaceActivities && preRaceActivities.length > 0) {
    prompt += `PRE-RACE TRAINING LOAD (14 days before race):\n`;
    const totalTSS = preRaceActivities.reduce((sum, a) => sum + (a.tss || 0), 0);
    const avgDailyTSS = totalTSS / 14;
    const lastWeekTSS = preRaceActivities
      .filter(a => {
        const daysBefore = Math.floor((new Date(raceActivity.date) - new Date(a.date)) / (1000 * 60 * 60 * 24));
        return daysBefore <= 7;
      })
      .reduce((sum, a) => sum + (a.tss || 0), 0);
    const secondWeekTSS = totalTSS - lastWeekTSS;
    
    prompt += `- Total TSS (14 days): ${Math.round(totalTSS)}\n`;
    prompt += `- Average Daily TSS: ${Math.round(avgDailyTSS)}\n`;
    prompt += `- Week 2 TSS (days 14-8): ${Math.round(secondWeekTSS)}\n`;
    prompt += `- Week 1 TSS (days 7-1): ${Math.round(lastWeekTSS)}\n`;
    prompt += `- Taper Ratio: ${secondWeekTSS > 0 ? (lastWeekTSS / secondWeekTSS * 100).toFixed(0) : 'N/A'}%\n`;
    
    prompt += `\nPre-Race Activities:\n`;
    preRaceActivities.slice(-7).forEach((activity) => {
      const daysBeforeRace = Math.floor((new Date(raceActivity.date) - new Date(activity.date)) / (1000 * 60 * 60 * 24));
      prompt += `  ${daysBeforeRace} days before: ${activity.name} - ${Math.round(activity.duration / 60)}min, TSS: ${activity.tss || 'N/A'}\n`;
    });
    prompt += `\n`;
  }

  // Race Plan (if available)
  if (racePlan) {
    prompt += `PLANNED STRATEGY:\n`;
    if (racePlan.targetPower) {
      prompt += `- Target Power: ${racePlan.targetPower}W\n`;
    }
    if (racePlan.estimatedTime) {
      prompt += `- Estimated Time: ${racePlan.estimatedTime}\n`;
    }
    if (racePlan.overallStrategy) {
      prompt += `- Strategy: ${racePlan.overallStrategy.substring(0, 200)}...\n`;
    }
    prompt += `\n`;
  }

  // Rider Profile
  if (riderProfile) {
    prompt += `RIDER PROFILE:\n`;
    prompt += `- Name: ${riderName}\n`;
    prompt += `- Type: ${riderProfile.type}\n`;
    prompt += `- FTP: ${riderProfile.ftp}W\n`;
    if (riderProfile.weight) {
      prompt += `- W/kg: ${(riderProfile.ftp / riderProfile.weight).toFixed(2)}\n`;
    }
    prompt += `\n`;
  }

  // Detailed Metrics Analysis
  prompt += `DETAILED PERFORMANCE METRICS:\n`;
  
  if (detailedMetrics.power.average) {
    prompt += `\nPower Analysis:\n`;
    prompt += `- Average Power: ${detailedMetrics.power.average}W (${detailedMetrics.power.percentOfFTP}% of FTP)\n`;
    prompt += `- Normalized Power: ${detailedMetrics.power.normalized}W\n`;
    prompt += `- Intensity Factor (IF): ${detailedMetrics.power.intensityFactor}\n`;
    prompt += `- Variability Index (VI): ${detailedMetrics.power.variabilityIndex}\n`;
  }
  
  if (detailedMetrics.pacing.quality) {
    prompt += `\nPacing Analysis:\n`;
    prompt += `- Pacing Quality: ${detailedMetrics.pacing.quality}\n`;
    prompt += `- Pacing Score: ${detailedMetrics.pacing.score}/100\n`;
  }
  
  if (detailedMetrics.zones.primary) {
    prompt += `\nEffort Distribution:\n`;
    prompt += `- Primary Zone: ${detailedMetrics.zones.primary}\n`;
    prompt += `- Overall Intensity: ${detailedMetrics.zones.intensity}\n`;
  }
  
  if (detailedMetrics.preRace.totalTSS) {
    prompt += `\nPre-Race Fatigue Analysis:\n`;
    prompt += `- 14-Day Total TSS: ${detailedMetrics.preRace.totalTSS}\n`;
    prompt += `- Week 2 TSS (days 14-8): ${detailedMetrics.preRace.secondWeekTSS}\n`;
    prompt += `- Week 1 TSS (days 7-1): ${detailedMetrics.preRace.lastWeekTSS}\n`;
    prompt += `- Taper Ratio: ${detailedMetrics.preRace.taperRatio}% (40-60% is optimal)\n`;
    prompt += `- Taper Quality: ${detailedMetrics.preRace.taperQuality}\n`;
    prompt += `- Freshness Level: ${detailedMetrics.preRace.freshnessLevel}\n`;
    prompt += `- Last 3 Days TSS: ${detailedMetrics.preRace.last3DaysTSS}\n`;
  }
  prompt += `\n`;

  // Race Context
  prompt += `RACE CONTEXT:\n`;
  const racePriority = feedback?.racePriority || 'B';
  const racePlatform = feedback?.racePlatform || 'road';
  const raceDuration = Math.floor(raceActivity.duration / 60);
  
  prompt += `- Priority: ${racePriority} (A=key goal, B=important, C=training)\n`;
  prompt += `- Platform: ${racePlatform}\n`;
  prompt += `- Duration: ${raceDuration} minutes (${detailedMetrics.preRace.raceCategory || 'Medium'})\n`;
  
  // Determine taper relevance based on priority and platform
  let taperRelevance = detailedMetrics.preRace.taperRelevance || 'Moderate';
  if (racePriority === 'C' || (racePlatform === 'zwift' && racePriority !== 'A')) {
    taperRelevance = 'Low';
  } else if (racePriority === 'A' && raceDuration > 90) {
    taperRelevance = 'Critical';
  }
  
  prompt += `- Taper Relevance: ${taperRelevance}\n\n`;

  // Rider Feedback
  if (feedback) {
    prompt += `ATHLETE'S SUBJECTIVE FEEDBACK:\n`;
    prompt += `- Overall Feeling: ${feedback.overallFeeling}/5 stars\n`;
    if (feedback.planAdherence) {
      prompt += `- Plan Adherence: ${feedback.planAdherence}\n`;
    }
    if (feedback.whatWentWell) {
      prompt += `- What Went Well: "${feedback.whatWentWell}"\n`;
    }
    if (feedback.whatDidntGoWell) {
      prompt += `- What Didn't Go Well: "${feedback.whatDidntGoWell}"\n`;
    }
    if (feedback.lessons) {
      prompt += `- Lessons: "${feedback.lessons}"\n`;
    }
    if (feedback.placement) {
      prompt += `- Placement: ${feedback.placement}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Provide a comprehensive analysis in JSON format with these fields:\n`;
  prompt += `{
  "overallAssessment": "2-3 friendly sentences addressing ${riderName} directly about their performance. Use a warm, conversational tone like you're chatting with a friend.",
  "whatWentWell": ["3-4 SHORT bullet points (max 10-12 words each) highlighting strengths"],
  "whatDidntGoWell": ["3-4 SHORT bullet points (max 10-12 words each) noting areas for improvement"],
  "keyInsights": ["3 key observations about the performance"],
  "recommendations": ["5 actionable recommendations for next race"],
  "trainingFocus": ["3 specific training areas to address"],
  "performanceScore": 0-100,
  "pacingScore": 0-100,
  "executionScore": 0-100,
  "tacticalScore": 0-100
}\n\n`;

  prompt += `IMPORTANT TONE GUIDELINES:
- Use ${riderName}'s name in the overallAssessment to make it personal
- Write like a supportive coach talking to a friend - warm, encouraging, honest
- Keep "whatWentWell" and "whatDidntGoWell" CONCISE - no more than 10-12 words per bullet
- Be specific with numbers and data, but conversational in tone
- Focus on actionable insights that feel helpful, not overwhelming

CRITICAL ANALYSIS REQUIREMENTS - TAPER CONTEXT:
${taperRelevance === 'Low' ? `
- TAPER NOT CRITICAL: This is a ${racePriority}-priority ${racePlatform} race (${raceDuration} min)
- DO NOT attribute performance issues to taper/freshness unless athlete explicitly felt flat
- Focus on tactical execution, pacing decisions, and race-specific skills
- Training load is INFORMATIONAL ONLY - not a causal factor for short/training races
- If athlete went too hard early, that's tactical impatience, NOT fatigue
` : taperRelevance === 'Moderate' ? `
- TAPER MODERATELY RELEVANT: ${racePriority}-priority race, ${raceDuration} minutes
- Consider taper as ONE factor among many, not the primary explanation
- Balance taper discussion with tactical and execution factors
- If taper was poor AND athlete felt flat, mention it; otherwise focus on race execution
` : `
- TAPER HIGHLY RELEVANT: This is an ${racePriority}-priority race (${raceDuration} min)
- Analyze pre-race training load carefully - taper quality matters significantly
- Assess fatigue state: Was athlete properly rested (taper ratio ${detailedMetrics.preRace.optimalTaperRange} optimal)?
- Connect dots: If performance was poor and training load was high, mention fatigue as likely factor
- Freshness: Did they arrive fresh or tired? Use TSS patterns to determine this
`}

PLATFORM-SPECIFIC CONTEXT:
${racePlatform === 'zwift' ? `
- ZWIFT DYNAMICS: Acknowledge category mixing, aggressive starts, unrealistic early demands
- Example: "Early race dynamics were distorted by category overlap, increasing cost of initial positioning"
- Overcooked starts are EXPECTED in Zwift - this is tactical, not fitness-related
` : racePlatform === 'gravel' ? `
- GRAVEL RACING: Variable terrain, technical skills, equipment choices matter significantly
- Pacing is less about watts, more about terrain management and recovery between efforts
` : ''}

PACING ANALYSIS - BE SPECIFIC:
- Don't just say "IF 0.76 shows solid effort" - that's descriptive, not evaluative
- Instead: "Overall intensity appropriate, but timing of work distribution more critical than total IF"
- Focus on WHEN power was applied, not just average metrics
- Distinguish between tactical pacing (when to go hard) vs physiological pacing (power distribution)

RECOMMENDATIONS - BE SPECIFIC:
- NOT generic: "Practice pacing strategies"
- INSTEAD specific: "Practice delayed engagement in first 3-5 minutes of ${racePlatform} races"
- NOT generic: "Incorporate race-specific intervals"
- INSTEAD specific: "Train over-under blocks that start below threshold before spikes"
- Link recommendations directly to observed issues in THIS race`;

  return prompt;
}

// ========================================
// RACE ANALYSES DATABASE CRUD ENDPOINTS
// ========================================

// Save race analysis to database
router.post('/analysis', async (req, res) => {
  const { 
    userId, activityId, raceName, raceDate, raceType,
    overallScore, pacingScore, executionScore, tacticalScore,
    analysisData 
  } = req.body;
  
  if (!userId || !activityId || !analysisData) {
    return res.status(400).json({ error: 'User ID, activity ID, and analysis data required' });
  }

  try {
    const db = getDb();
    
    // Check if analysis already exists for this activity
    const existing = db.prepare(`
      SELECT id FROM race_analyses 
      WHERE user_id = ? AND activity_id = ?
    `).get(userId, activityId);
    
    if (existing) {
      // Update existing analysis
      db.prepare(`
        UPDATE race_analyses 
        SET race_name = ?, race_date = ?, race_type = ?,
            overall_score = ?, pacing_score = ?, execution_score = ?, tactical_score = ?,
            analysis_data = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        raceName, raceDate, raceType,
        overallScore, pacingScore, executionScore, tacticalScore,
        JSON.stringify(analysisData),
        existing.id
      );
      
      res.json({ 
        success: true, 
        analysisId: existing.id,
        message: 'Race analysis updated successfully' 
      });
    } else {
      // Insert new analysis
      const result = db.prepare(`
        INSERT INTO race_analyses (
          user_id, activity_id, race_name, race_date, race_type,
          overall_score, pacing_score, execution_score, tactical_score,
          analysis_data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        userId, activityId, raceName, raceDate, raceType,
        overallScore, pacingScore, executionScore, tacticalScore,
        JSON.stringify(analysisData)
      );
      
      res.json({ 
        success: true, 
        analysisId: result.lastInsertRowid,
        message: 'Race analysis saved successfully' 
      });
    }
  } catch (error) {
    console.error('Error saving race analysis:', error.message);
    res.status(500).json({ error: 'Failed to save race analysis' });
  }
});

// Get all race analyses for user
router.get('/analyses/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const db = getDb();
    const analyses = db.prepare(`
      SELECT * FROM race_analyses 
      WHERE user_id = ? 
      ORDER BY race_date DESC
    `).all(userId);
    
    // Parse JSON data
    analyses.forEach(analysis => {
      analysis.analysis_data = JSON.parse(analysis.analysis_data);
    });
    
    res.json({ analyses });
  } catch (error) {
    console.error('Error loading race analyses:', error.message);
    res.status(500).json({ error: 'Failed to load race analyses' });
  }
});

// Get single race analysis
router.get('/analysis/:analysisId', async (req, res) => {
  const { analysisId } = req.params;
  
  try {
    const db = getDb();
    const analysis = db.prepare(`
      SELECT * FROM race_analyses WHERE id = ?
    `).get(analysisId);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Race analysis not found' });
    }
    
    analysis.analysis_data = JSON.parse(analysis.analysis_data);
    
    res.json({ analysis });
  } catch (error) {
    console.error('Error loading race analysis:', error.message);
    res.status(500).json({ error: 'Failed to load race analysis' });
  }
});

// Delete race analysis
router.delete('/analysis/:analysisId', async (req, res) => {
  const { analysisId } = req.params;
  
  try {
    const db = getDb();
    db.prepare('DELETE FROM race_analyses WHERE id = ?').run(analysisId);
    
    res.json({ success: true, message: 'Race analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting race analysis:', error.message);
    res.status(500).json({ error: 'Failed to delete race analysis' });
  }
});

export default router;
