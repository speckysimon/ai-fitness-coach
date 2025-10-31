# Token Logging Integration Guide

## Quick Start: Add Token Logging to AI Calls

This guide shows you exactly where and how to add token logging to your existing AI service calls.

## Step 1: Import the Service

At the top of any file making AI calls:

```javascript
const tokenTrackingService = require('./tokenTrackingService.cjs');
```

## Step 2: Log After Each AI Call

### Pattern

```javascript
// 1. Make AI call
const response = await openai.chat.completions.create({...});

// 2. Extract usage data
const usage = response.usage;

// 3. Log it
await tokenTrackingService.logTokenUsage({
  modelProvider: 'openai',  // or 'gemini'
  modelName: config.model_name,  // e.g., 'gpt-4-turbo'
  featureName: 'feature_name',  // e.g., 'training_plan_generation'
  promptTokens: usage.prompt_tokens,
  completionTokens: usage.completion_tokens,
  requestType: 'optional_type',  // optional
  userId: userId  // optional
});
```

## Step 3: Integration Examples

### Example 1: Training Plan Generation

**File:** `server/services/aiPlannerService.js`

**Before:**
```javascript
const generatePlan = async (userData) => {
  const response = await openai.chat.completions.create({
    model: config.model_name,
    messages: [/* ... */],
    temperature: config.temperature,
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

**After:**
```javascript
const tokenTrackingService = require('./tokenTrackingService.cjs');

const generatePlan = async (userData, userId = null) => {
  const response = await openai.chat.completions.create({
    model: config.model_name,
    messages: [/* ... */],
    temperature: config.temperature,
  });
  
  // Log token usage
  await tokenTrackingService.logTokenUsage({
    modelProvider: 'openai',
    modelName: config.model_name,
    featureName: 'training_plan_generation',
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    requestType: 'plan_generation',
    userId: userId
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

### Example 2: Plan Adjustment

**File:** `server/services/aiPlannerService.js`

```javascript
const adjustPlanFromRequest = async (currentPlan, request, userId = null) => {
  const response = await openai.chat.completions.create({
    model: config.model_name,
    messages: [/* ... */],
  });
  
  // Log token usage
  await tokenTrackingService.logTokenUsage({
    modelProvider: 'openai',
    modelName: config.model_name,
    featureName: 'plan_adjustment',
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    requestType: 'adjustment',
    userId: userId
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

### Example 3: Workout Analysis

**File:** `server/services/aiPlannerService.js`

```javascript
const analyzeWorkout = async (plannedSession, actualActivity, userId = null) => {
  const response = await openai.chat.completions.create({
    model: config.model_name,
    messages: [/* ... */],
  });
  
  // Log token usage
  await tokenTrackingService.logTokenUsage({
    modelProvider: 'openai',
    modelName: config.model_name,
    featureName: 'workout_analysis',
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    requestType: 'analysis',
    userId: userId
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

### Example 4: Race Analysis

**File:** `server/routes/race.js`

```javascript
router.post('/analysis/generate', async (req, res) => {
  const response = await openai.chat.completions.create({
    model: config.model_name,
    messages: [/* ... */],
  });
  
  // Log token usage
  await tokenTrackingService.logTokenUsage({
    modelProvider: 'openai',
    modelName: config.model_name,
    featureName: 'race_analysis',
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    requestType: 'race_analysis',
    userId: req.user?.id
  });
  
  const analysis = JSON.parse(response.choices[0].message.content);
  res.json({ success: true, analysis });
});
```

## Step 4: Handle Errors

Always wrap token logging in try-catch to prevent failures from breaking your app:

```javascript
try {
  await tokenTrackingService.logTokenUsage({...});
} catch (error) {
  console.error('Failed to log token usage:', error);
  // Continue execution - don't let logging failures break the app
}
```

## Step 5: Gemini Integration

For Gemini API calls:

```javascript
const response = await gemini.generateContent({...});

// Gemini usage format may differ - check their API docs
await tokenTrackingService.logTokenUsage({
  modelProvider: 'gemini',
  modelName: 'gemini-1.5-pro',
  featureName: 'training_plan_generation',
  promptTokens: response.usageMetadata.promptTokenCount,
  completionTokens: response.usageMetadata.candidatesTokenCount,
  userId: userId
});
```

## Feature Names Reference

Use these exact strings for `featureName`:

- `training_plan_generation` - Generating new training plans
- `plan_adjustment` - Adjusting existing plans
- `workout_analysis` - Analyzing completed workouts
- `race_analysis` - Analyzing race performance

These match the feature names in `ai_model_configs` table.

## Testing Token Logging

### 1. Make an AI request
```bash
# Generate a training plan via your app
```

### 2. Check the logs
```bash
sqlite3 server/database.sqlite "SELECT * FROM token_usage_logs ORDER BY created_at DESC LIMIT 5;"
```

### 3. Verify metrics
```bash
# Open admin panel
http://localhost:3000/admin/ai-config

# Check the 4 metric cards
# Should show non-zero values after AI requests
```

## Checklist

- [ ] Import `tokenTrackingService` in AI service files
- [ ] Add logging after each `openai.chat.completions.create()` call
- [ ] Add logging after each Gemini API call
- [ ] Pass `userId` when available
- [ ] Use correct `featureName` values
- [ ] Wrap in try-catch for error handling
- [ ] Test with real AI requests
- [ ] Verify data in database
- [ ] Check admin panel metrics

## Common Issues

### Issue: "Cannot find module tokenTrackingService"
**Solution:** Check import path - use relative path from your file location

### Issue: "response.usage is undefined"
**Solution:** Check API response structure - some models may have different usage formats

### Issue: "Token usage not showing in admin panel"
**Solution:** 
1. Verify data in database: `SELECT * FROM token_usage_logs;`
2. Check API endpoint: `/api/admin/token-usage`
3. Check browser console for errors

### Issue: "Monthly cost is $0.00"
**Solution:** 
1. Verify pricing data: `SELECT * FROM ai_model_pricing;`
2. Run migration if table is empty
3. Check that model names match exactly

## Next Steps

1. Add token logging to all AI service calls
2. Test each feature (plan generation, adjustment, analysis)
3. Monitor metrics in admin panel
4. Set up alerts for high usage (future enhancement)
5. Optimize prompts to reduce token usage (future enhancement)

## Support

If you encounter issues:
1. Check server logs for errors
2. Verify database tables exist
3. Test API endpoints with curl
4. Check admin panel for data display

Happy tracking! 📊
