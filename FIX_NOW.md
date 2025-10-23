# Fix Everything NOW - 3 Simple Steps

## Step 1: Update .env File

Open this file:
```
/Users/simonosx/CascadeProjects/ai-fitness-coach/.env
```

Find these lines and change 5000 to 5001:
```env
PORT=5001
STRAVA_REDIRECT_URI=http://localhost:5001/api/auth/strava/callback
GOOGLE_REDIRECT_URI=http://localhost:5001/api/google/callback
```

## Step 2: Restart Server

In your terminal:
1. Press `Ctrl+C`
2. Run: `npm run dev`
3. Wait for "server running on port 5001"

## Step 3: Refresh Browser

1. Go to http://localhost:3000
2. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Try logging in

---

**That's it! Everything should work now.**

If not, check `COMPLETE_FIX_SUMMARY.md` for troubleshooting.
