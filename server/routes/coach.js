import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const apiKeyLoader = require('../services/apiKeyLoader.cjs');

const router = express.Router();

/**
 * AI Coach Chat Endpoint
 * Provides conversational AI coaching with activity context
 */
router.post('/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Get OpenAI API key
    const openaiKey = apiKeyLoader.getApiKey('openai');
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Build context-aware prompt
    let systemPrompt = `You are an expert cycling coach with deep knowledge of training physiology, power-based training, and performance optimization. You provide personalized, actionable advice to help athletes improve their performance.

Your coaching style is:
- Evidence-based and scientific
- Encouraging and motivational
- Specific and actionable
- Focused on long-term development`;

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
