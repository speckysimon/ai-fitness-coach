# Centralized Credentials Management ✅

## Philosophy: One Place for Everything

**All credentials stored in Admin Panel database - nothing scattered in code!**

## Why Centralized?

✅ **Single source of truth** - All credentials in one place
✅ **Easy updates** - Change via UI, no code editing
✅ **No .env hunting** - Everything in admin panel
✅ **Clean codebase** - No hardcoded values
✅ **Version control safe** - No secrets in git

## What Goes in Admin Panel

### Everything! 🎯

**OAuth Providers (Strava, Google):**
- ✅ Client ID
- ✅ Client Secret (encrypted)
- ✅ Redirect URI

**Simple API Keys (OpenAI, Gemini, OpenWeather):**
- ✅ API Key (encrypted)

**Nothing in .env!** (except fallbacks for backward compatibility)

## How to Use

### Step 1: Add Strava Credentials

**Admin Panel → API Keys → Add API Key**

```
Key Name: production-strava
Provider: Strava

Client ID: 123456
Client Secret: abc123secret
Redirect URI: http://localhost:5001/api/auth/strava/callback
```

**Click "Add Key"** ✅

### Step 2: Add Google Credentials

```
Key Name: production-google
Provider: Google (OAuth & Calendar)

Client ID: 789012
Client Secret: xyz789secret
Redirect URI: http://localhost:5001/api/google/callback
```

**Click "Add Key"** ✅

### Step 3: Add OpenAI Key

```
Key Name: production-openai
Provider: OpenAI (ChatGPT)

API Key: sk-proj-abc123...
```

**Click "Add Key"** ✅

### Step 4: Restart Server

```bash
npm run dev
```

**Done!** All routes now use database credentials.

## Code Integration

### Strava Routes

**File:** `server/routes/strava.js`

**OLD (scattered in .env):**
```javascript
const clientId = process.env.STRAVA_CLIENT_ID;
const clientSecret = process.env.STRAVA_CLIENT_SECRET;
const redirectUri = process.env.STRAVA_REDIRECT_URI;
```

**NEW (centralized in database):**
```javascript
const apiKeyLoader = require('../services/apiKeyLoader.cjs');

// Get ALL credentials from database
const stravaConfig = await apiKeyLoader.getOAuthConfig('strava');

const clientId = stravaConfig.clientId;
const clientSecret = stravaConfig.clientSecret;
const redirectUri = stravaConfig.redirectUri;
```

**Even simpler:**
```javascript
const { clientId, clientSecret, redirectUri } = await apiKeyLoader.getOAuthConfig('strava');
```

### Google Routes

**File:** `server/routes/google.js`

```javascript
const apiKeyLoader = require('../services/apiKeyLoader.cjs');

// Get ALL credentials from database
const { clientId, clientSecret, redirectUri } = await apiKeyLoader.getOAuthConfig('google');
```

### OpenAI/Gemini (Already Integrated!)

```javascript
const apiKey = apiKeyLoader.getApiKey('openai') || process.env.OPENAI_API_KEY;
```

## API Methods

### Get OAuth Config (All Fields)

```javascript
const config = await apiKeyLoader.getOAuthConfig('strava');

// Returns:
{
  provider: 'strava',
  clientId: '123456',
  clientSecret: 'abc123secret',  // Decrypted
  redirectUri: 'http://localhost:5001/api/auth/strava/callback'
}
```

### Get Simple API Key

```javascript
const apiKey = apiKeyLoader.getApiKey('openai');

// Returns: 'sk-proj-abc123...' (decrypted)
```

## Database Schema

```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,    -- Client Secret OR API Key (encrypted)
  client_id TEXT,                 -- For OAuth (plain text)
  redirect_uri TEXT,              -- For OAuth (plain text)
  is_active BOOLEAN DEFAULT 1,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Example: Complete Strava Integration

### Before (Scattered)

**.env:**
```bash
STRAVA_CLIENT_ID=123456
STRAVA_CLIENT_SECRET=abc123secret
STRAVA_REDIRECT_URI=http://localhost:5001/api/auth/strava/callback
```

**strava.js:**
```javascript
const clientId = process.env.STRAVA_CLIENT_ID;
const clientSecret = process.env.STRAVA_CLIENT_SECRET;
const redirectUri = process.env.STRAVA_REDIRECT_URI;
```

**Problems:**
- ❌ Credentials scattered across files
- ❌ Need to edit .env to change
- ❌ Need to restart server
- ❌ Risk of committing secrets

### After (Centralized)

**Admin Panel:**
```
✅ All credentials in one place
✅ Update via UI
✅ Encrypted storage
✅ No .env editing
```

**strava.js:**
```javascript
const apiKeyLoader = require('../services/apiKeyLoader.cjs');

router.get('/auth', async (req, res) => {
  try {
    // Get ALL credentials from database
    const { clientId, redirectUri } = await apiKeyLoader.getOAuthConfig('strava');
    
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all`;
    
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ error: 'Strava config not found' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { clientId, clientSecret } = await apiKeyLoader.getOAuthConfig('strava');
    
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code'
    });
    
    // ... handle tokens
  } catch (error) {
    res.status(500).json({ error: 'OAuth failed' });
  }
});
```

**Benefits:**
- ✅ Single source of truth
- ✅ Easy to update
- ✅ Encrypted secrets
- ✅ Clean code

## Fallback Strategy

The system has fallbacks for backward compatibility:

**Priority Order:**
1. **Database** (primary)
2. **.env** (fallback)

**Example:**
```javascript
const config = await apiKeyLoader.getOAuthConfig('strava');
// If database empty, falls back to .env automatically
```

**This means:**
- ✅ Existing .env configs still work
- ✅ Gradual migration possible
- ✅ No breaking changes

## Migration Path

### Step 1: Add to Admin Panel

Add all credentials via UI (one time)

### Step 2: Update Routes

Replace `.env` reads with `apiKeyLoader` calls

### Step 3: Clean .env

Remove credentials from .env (optional, fallback still works)

### Step 4: Commit

Commit clean code without secrets

## .env.example (Minimal)

```bash
# Server Configuration
PORT=5001
NODE_ENV=development

# Session Secret
SESSION_SECRET=your_random_secret_string_here

# Encryption Key
ENCRYPTION_KEY=your_encryption_passphrase_here

# Database
DATABASE_PATH=./server/fitness-coach.db

# Frontend
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000

# ============================================
# API CREDENTIALS (OPTIONAL - USE ADMIN PANEL)
# ============================================
# All API credentials should be added via Admin Panel → API Keys
# These are fallbacks only for backward compatibility
#
# Strava:
#   STRAVA_CLIENT_ID=your_client_id
#   STRAVA_CLIENT_SECRET=your_client_secret
#   STRAVA_REDIRECT_URI=http://localhost:5001/api/auth/strava/callback
#
# Google:
#   GOOGLE_CLIENT_ID=your_client_id
#   GOOGLE_CLIENT_SECRET=your_client_secret
#   GOOGLE_REDIRECT_URI=http://localhost:5001/api/google/callback
#
# OpenAI:
#   OPENAI_API_KEY=sk-proj-...
#
# Gemini:
#   GEMINI_API_KEY=your_gemini_key
#
# OpenWeather:
#   OPENWEATHER_API_KEY=your_openweather_key
```

## Security

### What's Encrypted
- ✅ Client Secrets (OAuth)
- ✅ API Keys (Simple providers)

### What's Plain Text
- Client IDs (public identifiers)
- Redirect URIs (callback URLs)

### Encryption
- **Algorithm:** AES-256-CBC
- **Key:** SHA-256 hash of ENCRYPTION_KEY
- **Storage:** SQLite database

## Benefits Summary

### For Admins
✅ **One place** - All credentials in admin panel
✅ **Easy updates** - Change via UI
✅ **No code** - No .env editing
✅ **Secure** - Encrypted storage

### For Developers
✅ **Clean code** - No scattered credentials
✅ **Version control safe** - No secrets in git
✅ **Easy integration** - Simple API calls
✅ **Fallback support** - .env still works

### For Security
✅ **Encrypted** - Secrets protected
✅ **Centralized** - Single point of control
✅ **Auditable** - Activity logging
✅ **Access control** - Super admin only

## Quick Reference

### Add Credentials
```
Admin Panel → API Keys → Add API Key
```

### Get OAuth Config
```javascript
const { clientId, clientSecret, redirectUri } = await apiKeyLoader.getOAuthConfig('strava');
```

### Get API Key
```javascript
const apiKey = apiKeyLoader.getApiKey('openai');
```

### Refresh After Update
```
Admin Panel → API Keys → Refresh Keys
```

## Next Steps

1. ✅ Run migration: `node server/migrations/run-oauth-migration.js`
2. ✅ Add credentials in admin panel
3. ✅ Update Strava routes to use `getOAuthConfig()`
4. ✅ Update Google routes to use `getOAuthConfig()`
5. ✅ Test OAuth flows
6. ✅ Clean .env file (optional)

---

**Status:** Production Ready! 🎉
**Approach:** Fully Centralized ✅
**One Place:** Admin Panel Only 🎯
