# AI Image Generation Fix - October 31, 2025

## Problem
The AI image generation feature for coach personas was returning **400 Bad Request** errors.

## Root Cause
The `apiKeyLoader.cjs` service was not properly decrypting API keys from the database. 

**The Bug:**
- `aiConfigService.listApiKeys()` only returns metadata (key names, providers, status)
- It does NOT return the actual encrypted or decrypted keys
- `apiKeyLoader.cjs` was trying to access `key.decrypted_key` which doesn't exist
- Result: `cachedKeys['gemini']` was `undefined`
- API endpoint returned 400 error: "Gemini API key not configured"

## Files Fixed

### 1. `/server/services/apiKeyLoader.cjs`
**Changed:** `loadApiKeys()` function

**Before:**
```javascript
const keys = await aiConfigService.listApiKeys();
keys.forEach(key => {
  if (key.is_active) {
    cachedKeys[key.provider] = key.decrypted_key || key.encrypted_key; // ❌ These don't exist!
  }
});
```

**After:**
```javascript
// Query database directly to get encrypted keys
const keys = await new Promise((resolve, reject) => {
  database.all(`SELECT * FROM api_keys WHERE is_active = 1`, [], (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// Decrypt each key properly
for (const key of keys) {
  try {
    const decryptedKey = aiConfigService.decryptKey(key.encrypted_key);
    cachedKeys[key.provider] = decryptedKey;
    console.log(`  ✓ Loaded ${key.provider} key: ${key.key_name}`);
  } catch (error) {
    console.error(`  ✗ Failed to decrypt ${key.provider} key:`, error.message);
  }
}
```

### 2. `/server/routes/imageGeneration.cjs`
**Added:** Enhanced error handling and auto-refresh

**Improvements:**
- Better logging with emoji indicators
- Automatic key refresh if not found in cache
- Extracted image generation logic into `generateImageWithKey()` helper function
- More descriptive error messages
- Shows available providers for debugging

## How It Works Now

1. **Server Startup:**
   - `apiKeyLoader.loadApiKeys()` runs
   - Queries database for all active API keys
   - Decrypts each key using `aiConfigService.decryptKey()`
   - Caches decrypted keys by provider name

2. **Image Generation Request:**
   - Checks cache for Gemini API key
   - If not found, automatically refreshes from database
   - Calls Imagen 3 API with decrypted key
   - Returns generated image URL

3. **Logging:**
   - `🎨 Image generation request received`
   - `🔑 API Key loaded: Yes/No`
   - `🔑 Available providers: [...]`
   - `📡 Calling Imagen 3 API...`
   - `📊 Imagen API response status: 200`
   - `✅ Image generated successfully`
   - `💾 Saving image to: /path/to/file.png`

## Testing
1. Server should auto-restart with nodemon
2. Go to Admin > Coach Personas
3. Click "Generate with AI (Imagen 3)"
4. Enter a prompt
5. Click "Generate Image"
6. Check server console for detailed logs
7. Image should generate successfully

## Prevention
This bug occurred because:
- `listApiKeys()` was designed for admin UI display (doesn't need decrypted keys)
- `apiKeyLoader` incorrectly assumed it would return decrypted keys
- No error was thrown, just silently returned `undefined`

**Solution:** Direct database query with explicit decryption in `apiKeyLoader`.
