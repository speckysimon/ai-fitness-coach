/**
 * AI Configuration Service
 * Manages AI model configurations and API keys
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Create database connection
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Simple encryption for API keys (use proper key management in production)
// Create a proper 32-byte key from environment variable or default
const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || 'riderlabs-default-encryption-secret-2025';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
const ALGORITHM = 'aes-256-cbc';

class AIConfigService {
  /**
   * Encrypt API key
   */
  encryptKey(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt API key
   */
  decryptKey(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  /**
   * Get AI model configuration by feature
   */
  async getConfig(featureName) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM ai_model_configs WHERE feature_name = ? AND is_active = 1`,
        [featureName],
        (err, config) => {
          if (err) reject(err);
          else if (!config) reject(new Error(`No configuration found for ${featureName}`));
          else {
            resolve({
              ...config,
              parameters: config.parameters ? JSON.parse(config.parameters) : {},
            });
          }
        }
      );
    });
  }

  /**
   * List all AI model configurations
   */
  async listConfigs() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ai_model_configs ORDER BY feature_name`,
        [],
        (err, configs) => {
          if (err) reject(err);
          else {
            resolve(
              configs.map((config) => ({
                ...config,
                parameters: config.parameters ? JSON.parse(config.parameters) : {},
                isActive: config.is_active === 1,
              }))
            );
          }
        }
      );
    });
  }

  /**
   * Update AI model configuration
   */
  async updateConfig(featureName, updates) {
    const allowedFields = [
      'model_provider',
      'model_name',
      'api_key_name',
      'system_prompt',
      'temperature',
      'max_tokens',
      'parameters',
      'is_active',
      'cost_per_1k_tokens',
    ];

    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        if (key === 'parameters') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(updates[key]));
        } else if (key === 'is_active') {
          fields.push(`${key} = ?`);
          values.push(updates[key] ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(featureName);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE ai_model_configs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE feature_name = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else if (this.changes === 0) reject(new Error('Configuration not found'));
          else resolve({ featureName, ...updates });
        }
      );
    });
  }

  /**
   * Create new AI model configuration
   */
  async createConfig(config) {
    const {
      featureName,
      modelProvider,
      modelName,
      apiKeyName,
      systemPrompt,
      temperature = 0.7,
      maxTokens,
      parameters = {},
      costPer1kTokens,
    } = config;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO ai_model_configs 
         (feature_name, model_provider, model_name, api_key_name, system_prompt, 
          temperature, max_tokens, parameters, cost_per_1k_tokens) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          featureName,
          modelProvider,
          modelName,
          apiKeyName,
          systemPrompt,
          temperature,
          maxTokens,
          JSON.stringify(parameters),
          costPer1kTokens,
        ],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('Configuration for this feature already exists'));
            } else {
              reject(err);
            }
          } else {
            resolve({ id: this.lastID, featureName });
          }
        }
      );
    });
  }

  /**
   * Store API key (encrypted)
   * Supports both simple API keys and OAuth credentials
   */
  async storeApiKey({ keyName, provider, apiKey, clientId, clientSecret, redirectUri }) {
    // For OAuth providers, encrypt the client secret
    // For simple API keys, encrypt the API key
    const encryptedKey = clientSecret ? this.encryptKey(clientSecret) : (apiKey ? this.encryptKey(apiKey) : null);

    if (!encryptedKey) {
      throw new Error('Either apiKey or clientSecret must be provided');
    }

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO api_keys (key_name, provider, encrypted_key, client_id, redirect_uri) 
         VALUES (?, ?, ?, ?, ?)`,
        [keyName, provider, encryptedKey, clientId || null, redirectUri || null],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, keyName, provider });
        }
      );
    });
  }

  /**
   * Get API key (decrypted)
   */
  async getApiKey(keyName) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM api_keys WHERE key_name = ? AND is_active = 1`,
        [keyName],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error(`API key ${keyName} not found`));
          else {
            try {
              const decryptedKey = this.decryptKey(row.encrypted_key);
              
              // Update last used timestamp
              db.run(
                `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [row.id]
              );

              resolve({
                keyName: row.key_name,
                provider: row.provider,
                apiKey: decryptedKey,
              });
            } catch (error) {
              reject(new Error('Failed to decrypt API key'));
            }
          }
        }
      );
    });
  }

  /**
   * Get OAuth configuration (all fields, decrypted)
   * Returns clientId, clientSecret, and redirectUri for OAuth providers
   */
  async getOAuthConfig(provider) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM api_keys WHERE provider = ? AND is_active = 1 LIMIT 1`,
        [provider],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error(`OAuth config for ${provider} not found`));
          else {
            try {
              const decryptedSecret = this.decryptKey(row.encrypted_key);
              
              // Update last used timestamp
              db.run(
                `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [row.id]
              );

              resolve({
                provider: row.provider,
                clientId: row.client_id,
                clientSecret: decryptedSecret,
                redirectUri: row.redirect_uri,
              });
            } catch (error) {
              reject(new Error('Failed to decrypt OAuth credentials'));
            }
          }
        }
      );
    });
  }

  /**
   * List API keys (without decrypted values)
   */
  async listApiKeys() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, key_name, provider, is_active, last_used_at, created_at, updated_at 
         FROM api_keys ORDER BY provider, key_name`,
        [],
        (err, keys) => {
          if (err) reject(err);
          else {
            resolve(
              keys.map((key) => ({
                ...key,
                isActive: key.is_active === 1,
              }))
            );
          }
        }
      );
    });
  }

  /**
   * Delete API key
   */
  async deleteApiKey(keyName) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM api_keys WHERE key_name = ?`, [keyName], function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('API key not found'));
        else resolve({ keyName });
      });
    });
  }

  /**
   * Toggle API key active status
   */
  async toggleApiKey(keyName, isActive) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE api_keys SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = ?`,
        [isActive ? 1 : 0, keyName],
        function (err) {
          if (err) reject(err);
          else if (this.changes === 0) reject(new Error('API key not found'));
          else resolve({ keyName, isActive });
        }
      );
    });
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(days = 30) {
    // This would integrate with actual usage tracking
    // For now, return placeholder data
    return {
      totalRequests: 0,
      totalCost: 0,
      byFeature: {},
      byModel: {},
    };
  }
}

module.exports = new AIConfigService();
