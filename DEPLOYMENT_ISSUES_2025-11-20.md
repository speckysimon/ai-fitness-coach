# Deployment Issues - November 20, 2025

## 🐛 Issues Encountered

### 1. **Database Schema Mismatch**
**Problem:** Backend code was using old column names that didn't match the database schema.

**Root Cause:**
- Database schema was updated (migration applied)
- Backend code wasn't updated to match new schema
- Old column names: `key_name`, `encrypted_key`
- New column names: `provider`, `api_key`, `client_id`, `client_secret`

**Files Affected:**
- `server/services/aiConfigService.cjs` ✅ Fixed
- `server/routes/themeConfigs.cjs` ✅ Fixed
- `server/services/apiKeyLoader.cjs` ✅ Fixed
- `src/pages/admin/APIKeysPage.jsx` ✅ Fixed

**Symptoms:**
```
SQLITE_ERROR: table api_keys has no column named key_name
SQLITE_ERROR: no such column: description
```

---

### 2. **Frontend Not Updated After Code Changes**
**Problem:** Browser cached old JavaScript bundle after deployment.

**Root Cause:**
- Vite generates hashed filenames (e.g., `index-CLdz29V5.js`)
- Browser caches these files aggressively
- After `npm run build`, new hash is generated (`index-CJCesYyO.js`)
- Users still loading old cached version

**Symptoms:**
```
DELETE https://riderlabs.io/api/admin/api-keys/undefined 500
```
- Frontend trying to use `key.key_name` (doesn't exist)
- Should use `key.provider`

**Solution:**
- Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
- Or clear browser cache

---

### 3. **API Keys Not Loading (0 keys loaded)**
**Problem:** Server reported `✅ Loaded 0 active API keys` despite keys existing in database.

**Root Cause:**
- `apiKeyLoader.cjs` was trying to decrypt `key.encrypted_key`
- New schema uses `key.api_key` and `key.client_secret`
- Column didn't exist → returned `undefined` → decrypt failed

**Fix:**
```javascript
// OLD (broken):
const decryptedKey = aiConfigService.decryptKey(key.encrypted_key);

// NEW (fixed):
const encryptedValue = key.client_secret || key.api_key;
const decryptedKey = aiConfigService.decryptKey(encryptedValue);
```

---

### 4. **Decryption Errors on Startup**
**Problem:** Server logs filled with decrypt errors:
```
✗ Failed to decrypt openai key: Cannot read properties of undefined (reading 'split')
```

**Root Cause:**
- Server tries to load API keys on startup
- Some keys don't exist or have invalid encryption
- No null checks before calling `.split()` in decryptKey

**Status:** ⚠️ Still present (non-critical, cosmetic issue)

**Future Fix:** Add null check in `aiConfigService.decryptKey()`:
```javascript
decryptKey(encryptedKey) {
  if (!encryptedKey) {
    throw new Error('No encrypted key provided');
  }
  // ... rest of decryption logic
}
```

---

### 5. **Vite Not Found Error**
**Problem:** `npm run build` failed with `sh: 1: vite: not found`

**Root Cause:**
- `node_modules` not installed or incomplete on production
- Missing Vite dependency

**Solution:**
```bash
npm install
npm run build
```

---

## 📊 Timeline of Fixes

1. **Initial Error:** Database schema mismatch (key_name, encrypted_key)
2. **Fix 1:** Updated `themeConfigs.cjs` to use correct columns
3. **Fix 2:** Updated `aiConfigService.cjs` to use correct columns
4. **Fix 3:** Updated `schema.sql` to include missing columns
5. **Fix 4:** Updated `APIKeysPage.jsx` to use `provider` instead of `key_name`
6. **Fix 5:** Updated `apiKeyLoader.cjs` to use `api_key` instead of `encrypted_key`
7. **Deploy:** Git push, npm build, pm2 restart
8. **Browser Issue:** Hard refresh required to load new frontend code

---

## ✅ Current Status

**Working:**
- ✅ Database schema aligned with code
- ✅ API keys loading correctly (3/5 keys)
- ✅ Frontend delete/view functions working
- ✅ No more schema errors in logs

**Remaining Issues:**
- ⚠️ OpenAI and Gemini keys need to be re-added (encryption mismatch)
- ⚠️ Decrypt error logging needs null checks (cosmetic)

---

## 🎓 Lessons Learned

1. **Schema migrations must be paired with code updates**
   - Never deploy a migration without updating all affected code
   - Grep for old column names before deploying

2. **Frontend caching is aggressive**
   - Always test with hard refresh after deployment
   - Consider cache-busting strategies

3. **Database has two files**
   - `server/fitness-coach.db` - Main app database
   - `server/database.sqlite` - Admin database
   - Both need to be considered during migrations

4. **PM2 doesn't always reload code properly**
   - Use `pm2 delete` + `pm2 start` instead of `pm2 restart` for major changes
   - Or use `pm2 reload` with `--update-env`

5. **Error handling needs improvement**
   - Add null checks before operations
   - Better error messages for debugging

---

## 📝 Files Modified (Session Summary)

### Backend Files:
1. `server/routes/themeConfigs.cjs` - Fixed theme_configs column names
2. `server/services/aiConfigService.cjs` - Fixed api_keys column names
3. `server/schema.sql` - Added missing columns to theme_configs
4. `server/services/apiKeyLoader.cjs` - Fixed API key loading logic

### Frontend Files:
1. `src/pages/admin/APIKeysPage.jsx` - Fixed to use provider instead of key_name

### Git Commits:
```
fix: Update APIKeysPage to use provider instead of key_name for new schema
fix: Update apiKeyLoader to use new schema (api_key instead of encrypted_key)
```

---

## 🔍 How to Verify Deployment Success

1. **Check PM2 logs:**
   ```bash
   pm2 logs riderlabs --lines 50
   ```
   - Should see: `✅ Loaded X active API keys` (X > 0)
   - Should NOT see: `SQLITE_ERROR` messages

2. **Check frontend bundle:**
   - Open DevTools → Network tab
   - Look for `index-[hash].js` filename
   - Verify it matches the latest build hash

3. **Test API Keys page:**
   - Can view keys
   - Can delete keys (no `undefined` errors)
   - Can add new keys

4. **Check database directly:**
   ```bash
   sqlite3 server/fitness-coach.db "SELECT provider, is_active FROM api_keys;"
   ```

---

## 🚨 Red Flags to Watch For

- `SQLITE_ERROR` in logs → Schema mismatch
- `✅ Loaded 0 active API keys` → Loading logic broken
- `DELETE .../undefined` → Frontend using old code
- `vite: not found` → Missing dependencies
- `Cannot read properties of undefined` → Null check needed

---

**Date:** November 20, 2025, 10:00 AM  
**Status:** ✅ Resolved (with minor cleanup needed)  
**Next Steps:** See DEPLOYMENT_PLAN.md
