# Port 5001 Fix - macOS ControlCenter Issue

**Date:** October 10, 2025  
**Issue:** "Failed to connect to server" error  
**Cause:** macOS ControlCenter using port 5000  
**Solution:** Use port 5001 instead

---

## 🐛 Problem

macOS Monterey and later use port 5000 for ControlCenter (AirPlay Receiver). This conflicts with the backend server.

**Symptoms:**
- "Failed to connect to server" error on login
- Server starts but can't bind to port 5000
- Server automatically uses port 5001 instead

---

## ✅ Fix Applied

### 1. Updated Port Configuration

Changed all references from port 5000 to 5001:

- ✅ `vite.config.js` - Proxy target
- ✅ `.env.example` - PORT, redirect URIs
- ✅ Documentation files

### 2. What You Need to Update

**Your `.env` file:**
```env
# Change this
PORT=5000

# To this
PORT=5001

# Also update redirect URIs
STRAVA_REDIRECT_URI=http://localhost:5001/api/auth/strava/callback
GOOGLE_REDIRECT_URI=http://localhost:5001/api/google/callback
```

### 3. Update OAuth Redirect URIs

#### Strava API Settings
1. Go to https://www.strava.com/settings/api
2. Update Authorization Callback Domain to use port **5001**
3. Update redirect URI: `http://localhost:5001/api/auth/strava/callback`

#### Google Cloud Console
1. Go to https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Update Authorized redirect URIs: `http://localhost:5001/api/google/callback`

---

## 🔄 Restart Required

After updating your `.env` file:

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart
npm run dev
```

The server should now start on port 5001 and the frontend will connect properly.

---

## 🧪 Verify It's Working

### Check Server Port
```bash
lsof -i :5001
```

Should show:
```
node    [PID] simonosx   12u  IPv6 ... TCP *:5001 (LISTEN)
```

### Test Login
1. Go to http://localhost:3000
2. Try logging in
3. Should work without "Failed to connect to server" error

---

## 🔧 Alternative: Disable macOS AirPlay Receiver

If you want to use port 5000:

1. System Preferences → Sharing
2. Uncheck "AirPlay Receiver"
3. Port 5000 will be free
4. Update `.env` back to PORT=5000
5. Update OAuth redirect URIs back to port 5000

**Note:** This disables AirPlay functionality on your Mac.

---

## 📝 Summary

- **Old Port:** 5000 (blocked by macOS)
- **New Port:** 5001 (available)
- **Frontend:** Still on 3000
- **Proxy:** Updated to point to 5001

**Status:** ✅ Fixed - Just update your `.env` file and restart!
