import express from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { fthrService } from '../services/fthrService.js';
import { smartMetricsService } from '../services/smartMetricsService.js';
import OpenAI from 'openai';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const apiKeyLoader = require('../services/apiKeyLoader.cjs');

const router = express.Router();

// Calculate current FTP/eFTP
router.post('/ftp', async (req, res) => {
  const { activities } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const ftp = analyticsService.calculateFTP(activities);
    res.json({ ftp });
  } catch (error) {
    console.error('Error calculating FTP:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTP' });
  }
});

// Calculate training load metrics
router.post('/load', async (req, res) => {
  const { activities, ftp } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const loadMetrics = analyticsService.calculateTrainingLoad(activities, ftp);
    res.json(loadMetrics);
  } catch (error) {
    console.error('Error calculating training load:', error.message);
    res.status(500).json({ error: 'Failed to calculate training load' });
  }
});

// Get weekly summary
router.post('/weekly-summary', async (req, res) => {
  const { activities, weekStart } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const summary = analyticsService.getWeeklySummary(activities, weekStart);
    res.json(summary);
  } catch (error) {
    console.error('Error calculating weekly summary:', error.message);
    res.status(500).json({ error: 'Failed to calculate weekly summary' });
  }
});

// Get trend analysis
router.post('/trends', async (req, res) => {
  const { activities, weeks = 6, ftp } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const trends = analyticsService.getTrends(activities, weeks, ftp);
    res.json(trends);
  } catch (error) {
    console.error('Error calculating trends:', error.message);
    res.status(500).json({ error: 'Failed to calculate trends' });
  }
});

// Calculate FTHR (Functional Threshold Heart Rate)
router.post('/fthr', async (req, res) => {
  const { activities, manualFTHR, zoneModel = '5-zone', maxHR = null } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const fthrData = fthrService.calculateFTHR(activities, manualFTHR);
    
    // If FTHR was calculated, add zones based on selected model
    if (fthrData.fthr) {
      fthrData.zones = fthrService.calculateHRZonesByModel(
        fthrData.fthr,
        zoneModel,
        maxHR
      );
      fthrData.zoneModel = zoneModel; // Return which model was used
    }
    
    res.json(fthrData);
  } catch (error) {
    console.error('Error calculating FTHR:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTHR' });
  }
});

// Get HR trends analysis
router.post('/hr-trends', async (req, res) => {
  const { activities, fthr } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const trends = fthrService.analyzeHRTrends(activities, fthr);
    res.json(trends);
  } catch (error) {
    console.error('Error analyzing HR trends:', error.message);
    res.status(500).json({ error: 'Failed to analyze HR trends' });
  }
});

// Calculate Smart FTP (training-load aware)
router.post('/smart-ftp', async (req, res) => {
  const { activities, lastKnownFTP } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const result = smartMetricsService.calculateSmartFTP(activities, lastKnownFTP);
    res.json(result);
  } catch (error) {
    console.error('Error calculating smart FTP:', error.message);
    res.status(500).json({ error: 'Failed to calculate smart FTP' });
  }
});

// Generate AI-powered smart insights based on last 7 days
router.post('/smart-insights', async (req, res) => {
  const { activities, ftp, riderType, coachPersona } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const insights = await analyticsService.generateAISmartInsights(
      activities,
      ftp,
      riderType,
      coachPersona
    );
    res.json(insights);
  } catch (error) {
    console.error('Error generating smart insights:', error.message);
    res.status(500).json({ error: 'Failed to generate smart insights' });
  }
});

// Answer questions about weekly training using AI
router.post('/ask-coach', async (req, res) => {
  try {
    const { question, activities, weeklyMetrics, ftp, zoneDistribution, efficiencyMetrics, coachPersona } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get OpenAI API key from admin panel
    const openaiKey = apiKeyLoader.getApiKey('openai');
    if (!openaiKey) {
      return res.status(503).json({ error: 'AI service not available. Please configure OpenAI API key in Admin Panel.' });
    }

    // Initialize OpenAI with dynamic key
    const openai = new OpenAI({ apiKey: openaiKey });

    // Prepare context about the week's training
    const activitySummary = activities.map(a => ({
      date: new Date(a.date).toLocaleDateString(),
      name: a.name,
      duration: `${Math.round(a.duration / 60)} min`,
      distance: a.distance ? `${(a.distance / 1000).toFixed(1)} km` : 'N/A',
      tss: a.tss ? Math.round(a.tss) : 'N/A',
      avgPower: a.avgPower ? `${Math.round(a.avgPower)}W` : 'N/A',
      avgHR: a.avgHeartRate ? `${Math.round(a.avgHeartRate)} bpm` : 'N/A'
    }));

    const zoneBreakdown = zoneDistribution ? zoneDistribution.map(z => 
      `${z.name}: ${z.percentage.toFixed(0)}% (${z.time.toFixed(1)}h)`
    ).join(', ') : 'Not available';

    const efficiencySummary = efficiencyMetrics ? 
      `Current: ${efficiencyMetrics.currentEfficiency} W/bpm, Trend: ${efficiencyMetrics.trend}%` : 
      'Not available';

    // Build the AI prompt
    const systemPrompt = `You are ${coachPersona.name}, a ${coachPersona.description}. 
Your coaching style is ${coachPersona.tone}.

You are answering questions about an athlete's training week. Use the provided data to give specific, actionable advice.
Be conversational but professional. Keep responses concise (2-4 paragraphs max).
Reference specific numbers from their data when relevant.

IMPORTANT: You are a cycling/fitness coach. Only answer questions related to:
- Training, workouts, and exercise
- Performance metrics (FTP, TSS, heart rate, power, zones)
- Recovery and fatigue management
- Nutrition and hydration for training
- Training plans and periodization
- Cycling technique and tactics

If asked about non-training topics (politics, entertainment, general knowledge, etc.), politely redirect:
"I'm your cycling coach and I'm here to help with your training and performance. Let's focus on your cycling goals! Do you have any questions about this week's training data or how to improve your performance?"`;

    const userPrompt = `ATHLETE'S QUESTION: "${question}"

WEEKLY TRAINING DATA (Last 7 Days):
- Activities: ${weeklyMetrics.activityCount}
- Total Time: ${weeklyMetrics.totalTimeHours} hours
- Total TSS: ${weeklyMetrics.totalTSS}
- Total Distance: ${weeklyMetrics.totalDistance} km
- Average Intensity: ${weeklyMetrics.avgIntensity}
${ftp ? `- Current FTP: ${ftp}W` : ''}

ZONE DISTRIBUTION:
${zoneBreakdown}

AEROBIC EFFICIENCY:
${efficiencySummary}

INDIVIDUAL ACTIVITIES:
${activitySummary.map((a, i) => `${i + 1}. ${a.date} - ${a.name}: ${a.duration}, ${a.distance}, TSS: ${a.tss}, Power: ${a.avgPower}, HR: ${a.avgHR}`).join('\n')}

Please answer the athlete's question based on this data. Be specific and reference their actual numbers.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const answer = completion.choices[0].message.content;

    res.json({ answer });

  } catch (error) {
    console.error('Error in ask-coach:', error);
    res.status(500).json({ 
      error: 'Failed to get coach response',
      details: error.message 
    });
  }
});

export default router;
