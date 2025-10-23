# Fix "Failed to connect to server" Error

## 🔴 Problem
Your Mac's ControlCenter is using port 5000, so the backend server automatically switched to port 5001. But the frontend is still trying to connect to port 5000.

## ✅ Quick Fix

### Step 1: Update Your `.env` File

Open `/Users/simonosx/CascadeProjects/ai-fitness-coach/.env` and change:

```env
# Change FROM:
PORT=5000
STRAVA_REDIRECT_URI=http://localhost:5000/api/auth/strava/callback
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback

# Change TO:
PORT=5001
STRAVA_REDIRECT_URI=http://localhost:5001/api/auth/strava/callback
GOOGLE_REDIRECT_URI=http://localhost:5001/api/google/callback
```

### Step 2: Restart the Server

In your terminal where `npm run dev` is running:
1. Press `Ctrl+C` to stop
2. Run `npm run dev` again

### Step 3: Try Logging In Again

Go to http://localhost:3000 and try logging in. Should work now!

---

## 🔧 If You Have OAuth Apps Set Up

You'll also need to update redirect URIs in:

### Strava
1. Go to https://www.strava.com/settings/api
2. Update redirect URI to: `http://localhost:5001/api/auth/strava/callback`

### Google Calendar
1. Go to https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Edit OAuth 2.0 Client
4. Update redirect URI to: `http://localhost:5001/api/google/callback`

---

## 🎯 Why This Happened

macOS uses port 5000 for AirPlay Receiver (ControlCenter). Your server detected this and automatically used port 5001 instead. The vite config has been updated to proxy to 5001.

---

**Just update your `.env` file and restart! 🚀**
