import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const apiKeyLoader = require('../services/apiKeyLoader.cjs');
const coachPersonaService = require('../services/coachPersonaService.cjs');

const router = express.Router();

/**
 * AI Coach Chat Endpoint
 * Provides conversational AI coaching with activity context and coach persona
 */
router.post('/chat', async (req, res) => {
  const { message, context, coachId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Get OpenAI API key
    const openaiKey = apiKeyLoader.getApiKey('openai');
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Get coach persona (default to first active if not specified)
    let coach = null;
    if (coachId) {
      coach = await coachPersonaService.getById(coachId);
    }
    if (!coach) {
      const allCoaches = await coachPersonaService.getAll(true);
      coach = allCoaches[0]; // Use first active coach as default
    }

    // Build personalized system prompt with coach persona
    let systemPrompt = `You are ${coach.name}, a ${coach.description}.

YOUR PERSONALITY & COACHING STYLE:
${coach.personality}

YOUR TONE:
${coach.tone}

YOUR CATCHPHRASE (use occasionally to add personality):
"${coach.catchphrase}"

COACHING APPROACH:
${coach.style}

Remember to:
- Address the athlete directly and personally
- Use your unique personality and tone in every response
- Be encouraging but honest
- Provide specific, actionable advice
- Reference the athlete's actual data when giving feedback
- Keep responses conversational and engaging (not robotic)
- Occasionally use your catchphrase when appropriate`;

    let userMessage = message;

    // Add activity context if provided
    if (context?.activity) {
      const activity = context.activity;
      systemPrompt += `\n\nYou are analyzing this specific activity:\n`;
      systemPrompt += `- Activity: ${activity.name}\n`;
      systemPrompt += `- Type: ${activity.type}\n`;
      systemPrompt += `- Date: ${new Date(activity.date).toLocaleDateString()}\n`;
      systemPrompt += `- Duration: ${Math.round(activity.duration / 60)} minutes\n`;
      systemPrompt += `- Distance: ${(activity.distance / 1000).toFixed(2)} km\n`;
      systemPrompt += `- Elevation: ${Math.round(activity.elevation)}m\n`;
      
      if (activity.tss > 0) {
        systemPrompt += `- Training Stress Score (TSS): ${activity.tss}\n`;
      }
      if (activity.avgPower > 0) {
        systemPrompt += `- Average Power: ${Math.round(activity.avgPower)}W\n`;
      }
      if (activity.normalizedPower > 0) {
        systemPrompt += `- Normalized Power: ${Math.round(activity.normalizedPower)}W\n`;
      }
      if (activity.avgHeartRate > 0) {
        systemPrompt += `- Average Heart Rate: ${Math.round(activity.avgHeartRate)} bpm\n`;
      }
      if (activity.avgSpeed > 0) {
        systemPrompt += `- Average Speed: ${(activity.avgSpeed * 3.6).toFixed(1)} km/h\n`;
      }
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return res.status(500).json({ error: 'Failed to get AI response' });
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'No response generated';

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in coach chat:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

export default router;
