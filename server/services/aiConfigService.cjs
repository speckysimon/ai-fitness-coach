/**
 * AI Configuration Service
 * Manages AI model configurations and API keys
 * Uses better-sqlite3 via adminDb helper (migrated from sqlite3)
 */

const crypto = require('crypto');
const adminDb = require('../adminDb.cjs');

// Simple encryption for API keys (use proper key management in production)
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
  getConfig(featureName) {
    return new Promise((resolve, reject) => {
      try {
        const config = adminDb.get(
          `SELECT * FROM ai_model_configs WHERE feature_name = ? AND is_active = 1`,
          [featureName]
        );
        
        if (!config) {
          reject(new Error(`No configuration found for ${featureName}`));
        } else {
          resolve({
            ...config,
            parameters: config.parameters ? JSON.parse(config.parameters) : {},
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * List all AI model configurations
   */
  listConfigs() {
    return new Promise((resolve, reject) => {
      try {
        const configs = adminDb.all(
          `SELECT * FROM ai_model_configs ORDER BY feature_name`
        );
        
        resolve(configs.map((config) => ({
          ...config,
          parameters: config.parameters ? JSON.parse(config.parameters) : {},
          isActive: config.is_active === 1,
        })));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Update AI model configuration
   */
  updateConfig(featureName, updates) {
    return new Promise((resolve, reject) => {
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
        return reject(new Error('No valid fields to update'));
      }

      values.push(featureName);

      try {
        const result = adminDb.run(
          `UPDATE ai_model_configs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE feature_name = ?`,
          values
        );
        
        if (result.changes === 0) {
          reject(new Error('Configuration not found'));
        } else {
          resolve({ featureName, ...updates });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Create new AI model configuration
   */
  createConfig(config) {
    return new Promise((resolve, reject) => {
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

      try {
        const result = adminDb.run(
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
            costPer1kTokens
          ]
        );
        
        resolve({ id: result.lastInsertRowid, featureName });
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          reject(new Error('Configuration for this feature already exists'));
        } else {
          reject(err);
        }
      }
    });
  }

  /**
   * Store API key (encrypted)
   * Supports both simple API keys and OAuth credentials
   */
  storeApiKey({ keyName, provider, apiKey, clientId, clientSecret, redirectUri }) {
    return new Promise((resolve, reject) => {
      // For OAuth providers, encrypt the client secret
      // For simple API keys, encrypt the API key
      const encryptedValue = clientSecret ? this.encryptKey(clientSecret) : (apiKey ? this.encryptKey(apiKey) : null);

      if (!encryptedValue) {
        return reject(new Error('Either apiKey or clientSecret must be provided'));
      }

      // Store encrypted value in api_key column (required NOT NULL)
      // For OAuth: store encrypted clientSecret in both api_key and client_secret
      // For simple keys: store encrypted apiKey in api_key column
      try {
        const result = adminDb.run(
          `INSERT OR REPLACE INTO api_keys (provider, api_key, client_id, client_secret, redirect_uri) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            provider, 
            encryptedValue,  // Always store encrypted value here (NOT NULL requirement)
            clientId || null, 
            clientSecret ? encryptedValue : null,  // Duplicate for OAuth
            redirectUri || null
          ]
        );
        
        resolve({ id: result.lastInsertRowid, keyName, provider });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get API key (decrypted)
   */
  getApiKey(keyName) {
    return new Promise((resolve, reject) => {
      try {
        const row = adminDb.get(
          `SELECT * FROM api_keys WHERE provider = ? AND is_active = 1`,
          [keyName]
        );
        
        if (!row) {
          reject(new Error(`API key ${keyName} not found`));
        } else {
          try {
            // api_key or client_secret contains the encrypted value
            const encryptedValue = row.client_secret || row.api_key;
            const decryptedKey = this.decryptKey(encryptedValue);

            resolve({
              keyName: row.provider,
              provider: row.provider,
              apiKey: decryptedKey,
              clientId: row.client_id,
              redirectUri: row.redirect_uri
            });
          } catch (error) {
            reject(new Error('Failed to decrypt API key'));
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get OAuth configuration (all fields, decrypted)
   * Returns clientId, clientSecret, and redirectUri for OAuth providers
   */
  getOAuthConfig(provider) {
    return new Promise((resolve, reject) => {
      try {
        const row = adminDb.get(
          `SELECT * FROM api_keys WHERE provider = ? AND is_active = 1 LIMIT 1`,
          [provider]
        );
        
        if (!row) {
          reject(new Error(`OAuth config for ${provider} not found`));
        } else {
          try {
            const decryptedSecret = this.decryptKey(row.client_secret);
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
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * List API keys (without decrypted values)
   */
  listApiKeys() {
    return new Promise((resolve, reject) => {
      try {
        const keys = adminDb.all(
          `SELECT id, provider, is_active, created_at, updated_at 
           FROM api_keys ORDER BY provider`
        );
        
        resolve(keys.map((key) => ({
          ...key,
          isActive: key.is_active === 1,
        })));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Delete API key
   */
  deleteApiKey(keyName) {
    return new Promise((resolve, reject) => {
      try {
        const result = adminDb.run(
          `DELETE FROM api_keys WHERE provider = ?`,
          [keyName]
        );
        
        if (result.changes === 0) {
          reject(new Error('API key not found'));
        } else {
          resolve({ keyName });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Toggle API key active status
   */
  toggleApiKey(keyName, isActive) {
    return new Promise((resolve, reject) => {
      try {
        const result = adminDb.run(
          `UPDATE api_keys SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = ?`,
          [isActive ? 1 : 0, keyName]
        );
        
        if (result.changes === 0) {
          reject(new Error('API key not found'));
        } else {
          resolve({ keyName, isActive });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get usage statistics
   */
  getUsageStats(days = 30) {
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
