/**
 * Token Tracking Service
 * Handles logging and retrieving token usage statistics
 * Uses better-sqlite3 via adminDb helper (migrated from sqlite3)
 */

const adminDb = require('../adminDb.cjs');

/**
 * Log token usage for an AI request
 */
const logTokenUsage = ({ 
  modelProvider, 
  modelName, 
  featureName, 
  promptTokens, 
  completionTokens,
  requestType = null,
  userId = null 
}) => {
  return new Promise((resolve, reject) => {
    try {
      const totalTokens = promptTokens + completionTokens;
      
      const result = adminDb.run(
        `INSERT INTO token_usage_logs 
         (model_provider, model_name, feature_name, prompt_tokens, completion_tokens, total_tokens, request_type, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [modelProvider, modelName, featureName, promptTokens, completionTokens, totalTokens, requestType, userId]
      );
      
      resolve({ id: result.lastInsertRowid, totalTokens });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Get token usage statistics
 */
const getTokenUsageStats = () => {
  return new Promise((resolve, reject) => {
    try {
      // Get total, 7-day, and today usage
      const stats = adminDb.get(
        `SELECT 
          SUM(total_tokens) as total,
          SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN total_tokens ELSE 0 END) as last7Days,
          SUM(CASE WHEN created_at > datetime('now', 'start of day') THEN total_tokens ELSE 0 END) as today
         FROM token_usage_logs`
      );
      
      // Get usage by model for cost calculation
      const byModel = adminDb.all(
        `SELECT 
          model_provider,
          model_name,
          SUM(prompt_tokens) as total_prompt_tokens,
          SUM(completion_tokens) as total_completion_tokens,
          SUM(total_tokens) as total_tokens,
          SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN prompt_tokens ELSE 0 END) as monthly_prompt_tokens,
          SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN completion_tokens ELSE 0 END) as monthly_completion_tokens
         FROM token_usage_logs
         GROUP BY model_provider, model_name`
      );
      
      resolve({
        total: stats.total || 0,
        last7Days: stats.last7Days || 0,
        today: stats.today || 0,
        byModel: byModel || []
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Get monthly cost breakdown
 */
const getMonthlyCost = async () => {
  return new Promise((resolve, reject) => {
    try {
      const results = adminDb.all(
        `SELECT 
          tul.model_provider,
          tul.model_name,
          SUM(CASE WHEN tul.created_at > datetime('now', '-30 days') THEN tul.prompt_tokens ELSE 0 END) as monthly_prompt_tokens,
          SUM(CASE WHEN tul.created_at > datetime('now', '-30 days') THEN tul.completion_tokens ELSE 0 END) as monthly_completion_tokens,
          amp.input_price_per_1m,
          amp.output_price_per_1m,
          amp.model_label
         FROM token_usage_logs tul
         LEFT JOIN ai_model_pricing amp 
           ON tul.model_provider = amp.model_provider 
           AND tul.model_name = amp.model_name
         GROUP BY tul.model_provider, tul.model_name`
      );
      
      let totalCost = 0;
      const breakdown = results.map(row => {
        const inputCost = (row.monthly_prompt_tokens / 1000000) * (row.input_price_per_1m || 0);
        const outputCost = (row.monthly_completion_tokens / 1000000) * (row.output_price_per_1m || 0);
        const modelCost = inputCost + outputCost;
        totalCost += modelCost;
        
        return {
          modelProvider: row.model_provider,
          modelName: row.model_name,
          modelLabel: row.model_label,
          promptTokens: row.monthly_prompt_tokens,
          completionTokens: row.monthly_completion_tokens,
          inputCost: inputCost.toFixed(2),
          outputCost: outputCost.toFixed(2),
          totalCost: modelCost.toFixed(2)
        };
      });
      
      resolve({
        totalMonthlyCost: totalCost.toFixed(2),
        breakdown
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Get all available models with pricing
 */
const getAvailableModels = () => {
  return new Promise((resolve, reject) => {
    try {
      const models = adminDb.all(
        `SELECT * FROM ai_model_pricing WHERE is_available = 1 ORDER BY model_provider, model_name`
      );
      
      resolve(models);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Update model pricing
 */
const updateModelPricing = ({ modelProvider, modelName, modelLabel, inputPrice, outputPrice, isAvailable = 1 }) => {
  return new Promise((resolve, reject) => {
    try {
      const result = adminDb.run(
        `INSERT INTO ai_model_pricing 
         (model_provider, model_name, model_label, input_price_per_1m, output_price_per_1m, is_available, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(model_provider, model_name) 
         DO UPDATE SET 
           model_label = excluded.model_label,
           input_price_per_1m = excluded.input_price_per_1m,
           output_price_per_1m = excluded.output_price_per_1m,
           is_available = excluded.is_available,
           last_updated = CURRENT_TIMESTAMP`,
        [modelProvider, modelName, modelLabel, inputPrice, outputPrice, isAvailable]
      );
      
      resolve({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  logTokenUsage,
  getTokenUsageStats,
  getMonthlyCost,
  getAvailableModels,
  updateModelPricing
};
