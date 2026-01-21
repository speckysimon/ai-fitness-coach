/**
 * API Key Loader Service
 * Loads API keys from database instead of .env file
 * Provides fallback to .env for backward compatibility
 */

const aiConfigService = require('./aiConfigService.cjs');

// In-memory cache of decrypted keys
let cachedKeys = {};
let lastLoadTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load all API keys from database
 */
async function loadApiKeys() {
  try {
    console.log('📥 Loading API keys from database...');
    
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.join(__dirname, '../database.sqlite');
    const database = new sqlite3.Database(dbPath);
    
    // Clear cache
    cachedKeys = {};
    
    // Query database directly to get encrypted keys
    const keys = await new Promise((resolve, reject) => {
      database.all(
        `SELECT * FROM api_keys WHERE is_active = 1`,
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
    
    // Close database connection
    database.close();
    
    // Decrypt each key
    for (const key of keys) {
      try {
        // For OAuth providers, decrypt client_secret; for simple keys, decrypt api_key
        const encryptedValue = key.client_secret || key.api_key;
        if (!encryptedValue) {
          console.error(`  ✗ No encrypted value found for ${key.provider}`);
          continue;
        }
        const decryptedKey = aiConfigService.decryptKey(encryptedValue);
        cachedKeys[key.provider] = decryptedKey;
        console.log(`  ✓ Loaded ${key.provider} key`);
      } catch (error) {
        console.error(`  ✗ Failed to decrypt ${key.provider} key:`, error.message);
      }
    }
    
    lastLoadTime = Date.now();
    console.log(`✅ Loaded ${Object.keys(cachedKeys).length} active API keys`);
    
    return cachedKeys;
  } catch (error) {
    console.error('❌ Failed to load API keys from database:', error);
    return {};
  }
}

/**
 * Get API key for a provider
 * Priority: 1. Database (cached), 2. Environment variable
 */
function getApiKey(provider) {
  // Check if cache needs refresh
  if (lastLoadTime && (Date.now() - lastLoadTime > CACHE_TTL)) {
    console.log('⏰ API key cache expired, will reload on next server restart');
  }
  
  // Try database cache first
  if (cachedKeys[provider]) {
    return cachedKeys[provider];
  }
  
  // Fallback to environment variable
  const envKey = getEnvKey(provider);
  if (envKey) {
    console.log(`⚠️  Using .env fallback for ${provider} (database key not found)`);
    return envKey;
  }
  
  console.error(`❌ No API key found for provider: ${provider}`);
  return null;
}

/**
 * Get environment variable key for a provider
 */
function getEnvKey(provider) {
  const envMap = {
    'openai': process.env.OPENAI_API_KEY,
    'gemini': process.env.GEMINI_API_KEY,
    'google': process.env.GOOGLE_CLIENT_SECRET,
    'strava': process.env.STRAVA_CLIENT_SECRET,
    'openweather': process.env.OPENWEATHER_API_KEY,
  };
  
  return envMap[provider] || null;
}

/**
 * Refresh cached keys (call after updating keys in admin panel)
 */
async function refreshKeys() {
  console.log('🔄 Refreshing API keys...');
  return await loadApiKeys();
}

/**
 * Check if a key exists for a provider
 */
function hasKey(provider) {
  return !!getApiKey(provider);
}

/**
 * Get all available providers
 */
function getAvailableProviders() {
  return Object.keys(cachedKeys);
}

/**
 * Get OAuth configuration (all credentials)
 * Returns clientId, clientSecret, redirectUri from database
 */
async function getOAuthConfig(provider) {
  try {
    const config = await aiConfigService.getOAuthConfig(provider);
    return config;
  } catch (error) {
    console.error(`❌ Failed to get OAuth config for ${provider}:`, error.message);
    
    // Fallback to environment variables
    const envConfig = getEnvOAuthConfig(provider);
    if (envConfig) {
      console.log(`⚠️  Using .env fallback for ${provider} OAuth config`);
      return envConfig;
    }
    
    return null;
  }
}

/**
 * Get OAuth config from environment variables (fallback)
 */
function getEnvOAuthConfig(provider) {
  if (provider === 'strava') {
    if (process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET) {
      return {
        provider: 'strava',
        clientId: process.env.STRAVA_CLIENT_ID,
        clientSecret: process.env.STRAVA_CLIENT_SECRET,
        redirectUri: process.env.STRAVA_REDIRECT_URI
      };
    }
  } else if (provider === 'google') {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return {
        provider: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI
      };
    }
  } else if (provider === 'intervals') {
    if (process.env.INTERVALS_CLIENT_ID && process.env.INTERVALS_CLIENT_SECRET) {
      return {
        provider: 'intervals',
        clientId: process.env.INTERVALS_CLIENT_ID,
        clientSecret: process.env.INTERVALS_CLIENT_SECRET,
        redirectUri: process.env.INTERVALS_REDIRECT_URI
      };
    }
  }
  
  return null;
}

/**
 * Get key info (without exposing the actual key)
 */
function getKeyInfo(provider) {
  const key = getApiKey(provider);
  if (!key) return null;
  
  return {
    provider,
    exists: true,
    source: cachedKeys[provider] ? 'database' : 'environment',
    masked: maskKey(key)
  };
}

/**
 * Mask API key for display
 */
function maskKey(key) {
  if (!key || key.length < 12) return '••••••••';
  return key.substring(0, 8) + '•'.repeat(20) + key.substring(key.length - 4);
}

module.exports = {
  loadApiKeys,
  getApiKey,
  getOAuthConfig,
  refreshKeys,
  hasKey,
  getAvailableProviders,
  getKeyInfo,
  maskKey
};
