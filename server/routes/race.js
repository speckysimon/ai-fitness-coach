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

export default router;
