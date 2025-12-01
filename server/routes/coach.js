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
- Occasionally use your catchphrase when appropriate
- CRITICAL: When analyzing data, ALWAYS start or end your response with a bulleted list of the specific data points you used (e.g., specific activities, metrics like FTP/HR, or user goals). Format it like this:
  "**Data Used:**
  *   Activity: [Activity Name] on [Date]
  *   Metric: FTP [Value]
  *   Goal: [Goal Name]"`;

    // Load user preferences if session token is available
    if (context?.userId || req.headers.authorization) {
      try {
        const sessionToken = req.headers.authorization?.replace('Bearer ', '');
        if (sessionToken) {
          const { db } = await import('../db.js');

          // Get user from session
          const session = await new Promise((resolve, reject) => {
            db.get('SELECT user_id FROM sessions WHERE token = ?', [sessionToken], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });

          if (session) {
            // Load user preferences
            const prefs = await new Promise((resolve, reject) => {
              db.get('SELECT * FROM user_preferences WHERE user_id = ?', [session.user_id], (err, row) => {
                if (err) reject(err);
                else resolve(row || {});
              });
            });

            // Add user context to system prompt
            if (prefs.ftp || prefs.long_term_goal) {
              systemPrompt += `\n\nATHLETE PROFILE:`;
              if (prefs.ftp) {
                systemPrompt += `\n- Current FTP: ${prefs.ftp}W`;
              }
              if (prefs.long_term_goal) {
                systemPrompt += `\n- Long-term goal: ${prefs.long_term_goal}`;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading user context:', err);
        // Continue without user context
      }
    }

    let userMessage = message;

    // Add recent activities context if provided
    if (context?.recentActivities && context.recentActivities.length > 0) {
      systemPrompt += `\n\nRECENT ACTIVITIES (Last ${context.recentActivities.length} workouts):`;
      context.recentActivities.forEach((activity, idx) => {
        systemPrompt += `\n${idx + 1}. ${activity.date}: ${activity.name} (${activity.type})`;
        systemPrompt += `\n   - Distance: ${activity.distance}km, Duration: ${activity.duration}min`;
        if (activity.avgPower > 0) {
          systemPrompt += `\n   - Avg Power: ${activity.avgPower}W`;
        }
        if (activity.normalizedPower > 0) {
          systemPrompt += `, Normalized: ${activity.normalizedPower}W`;
        }
        if (activity.avgHeartRate > 0) {
          systemPrompt += `\n   - Avg HR: ${activity.avgHeartRate} bpm`;
        }
        if (activity.tss > 0) {
          systemPrompt += `\n   - TSS: ${activity.tss}`;
        }
        if (activity.elevation > 0) {
          systemPrompt += `\n   - Elevation: ${activity.elevation}m`;
        }
      });

      // Add FTP estimation guidance
      systemPrompt += `\n\nFTP ESTIMATION GUIDANCE:
- When asked about FTP, analyze the ACTUAL power data from recent rides above
- For steady rides (60+ min), FTP is typically 95% of normalized power
- For mixed/interval rides, look at sustained efforts
- The stored FTP value may be outdated - prioritize recent ride data
- Show your reasoning: "Based on [specific ride data], I estimate..."
- Be conservative - it's better to slightly underestimate than overestimate`;
    }

    // Add current FTP if provided (but note it may be outdated)
    if (context?.currentFtp) {
      systemPrompt += `\n\nStored FTP (may be outdated): ${context.currentFtp}W
NOTE: This is the athlete's previously recorded FTP. When estimating current FTP, rely on ACTUAL power data from recent rides shown above, not this stored value.`;
    }

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
