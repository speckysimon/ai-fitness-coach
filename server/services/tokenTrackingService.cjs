/**
 * Token Tracking Service
 * Handles logging and retrieving token usage statistics
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');

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
    const db = new sqlite3.Database(dbPath);
    
    const totalTokens = promptTokens + completionTokens;
    
    db.run(
      `INSERT INTO token_usage_logs 
       (model_provider, model_name, feature_name, prompt_tokens, completion_tokens, total_tokens, request_type, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [modelProvider, modelName, featureName, promptTokens, completionTokens, totalTokens, requestType, userId],
      function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, totalTokens });
        }
      }
    );
  });
};

/**
 * Get token usage statistics
 */
const getTokenUsageStats = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Get total, 7-day, and today usage
    db.get(
      `SELECT 
        SUM(total_tokens) as total,
        SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN total_tokens ELSE 0 END) as last7Days,
        SUM(CASE WHEN created_at > datetime('now', 'start of day') THEN total_tokens ELSE 0 END) as today
       FROM token_usage_logs`,
      (err, stats) => {
        if (err) {
          db.close();
          reject(err);
        } else {
          // Get usage by model for cost calculation
          db.all(
            `SELECT 
              model_provider,
              model_name,
              SUM(prompt_tokens) as total_prompt_tokens,
              SUM(completion_tokens) as total_completion_tokens,
              SUM(total_tokens) as total_tokens,
              SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN prompt_tokens ELSE 0 END) as monthly_prompt_tokens,
              SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN completion_tokens ELSE 0 END) as monthly_completion_tokens
             FROM token_usage_logs
             GROUP BY model_provider, model_name`,
            (err, byModel) => {
              db.close();
              if (err) {
                reject(err);
              } else {
                resolve({
                  total: stats.total || 0,
                  last7Days: stats.last7Days || 0,
                  today: stats.today || 0,
                  byModel: byModel || []
                });
              }
            }
          );
        }
      }
    );
  });
};

/**
 * Get monthly cost breakdown
 */
const getMonthlyCost = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(
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
       GROUP BY tul.model_provider, tul.model_name`,
      (err, results) => {
        db.close();
        if (err) {
          reject(err);
        } else {
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
        }
      }
    );
  });
};

/**
 * Get all available models with pricing
 */
const getAvailableModels = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(
      `SELECT * FROM ai_model_pricing WHERE is_available = 1 ORDER BY model_provider, model_name`,
      (err, models) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(models);
        }
      }
    );
  });
};

/**
 * Update model pricing
 */
const updateModelPricing = ({ modelProvider, modelName, modelLabel, inputPrice, outputPrice, isAvailable = 1 }) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.run(
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
      [modelProvider, modelName, modelLabel, inputPrice, outputPrice, isAvailable],
      function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, id: this.lastID });
        }
      }
    );
  });
};

module.exports = {
  logTokenUsage,
  getTokenUsageStats,
  getMonthlyCost,
  getAvailableModels,
  updateModelPricing
};
