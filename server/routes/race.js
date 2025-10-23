import express from 'express';
import OpenAI from 'openai';

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
    const { stravaActivityId, feedback, racePlanId } = req.body;
    
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
      preRaceActivities 
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

    // Build analysis prompt
    const prompt = buildAnalysisPrompt(raceActivity, racePlan, riderProfile, feedback, preRaceActivities);

    const completion = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a friendly, supportive cycling coach analyzing race performance. 
Write like you're talking to a friend over coffee - warm, encouraging, and conversational.
Use the athlete's name to make it personal. Keep bullet points SHORT and punchy (10-12 words max).
Be specific with data, but keep the tone light and easy to read. Focus on actionable insights.
Always respond with valid JSON only.`
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
        tacticalScore: 75
      };
    }

    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error generating race analysis:', error);
    res.status(500).json({ 
      error: 'Failed to generate analysis',
      details: error.message
    });
  }
});

function buildAnalysisPrompt(raceActivity, racePlan, riderProfile, feedback, preRaceActivities) {
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
    preRaceActivities.slice(-7).forEach((activity, i) => {
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

  // Rider Feedback
  if (feedback) {
    prompt += `ATHLETE'S FEEDBACK:\n`;
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

CRITICAL ANALYSIS REQUIREMENTS:
- ANALYZE PRE-RACE TRAINING LOAD: Look at the TSS data from the 14 days before the race
- ASSESS FATIGUE STATE: Was the athlete properly rested (taper ratio 40-60% is ideal) or carrying fatigue?
- CONNECT DOTS: If performance was poor and training load was high, mention fatigue as a likely factor
- TAPER QUALITY: Comment on whether the taper was appropriate (gradual reduction in volume, maintaining intensity)
- FRESHNESS: Did they arrive at the race fresh or tired? Use TSS patterns to determine this
- RECOMMENDATIONS: If taper was poor, recommend better pre-race preparation for next time`;

  return prompt;
}

export default router;
