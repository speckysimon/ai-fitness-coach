# URGENT: Update Your .env File

## 🔴 You MUST update your .env file now

Your server is running on port **5001** but your `.env` file probably says **5000**.

### Step 1: Open your .env file

```bash
open /Users/simonosx/CascadeProjects/ai-fitness-coach/.env
```

### Step 2: Change these lines:

**FROM:**
```env
PORT=5000
STRAVA_REDIRECT_URI=http://localhost:5000/api/auth/strava/callback
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
```

**TO:**
```env
PORT=5001
STRAVA_REDIRECT_URI=http://localhost:5001/api/auth/strava/callback
GOOGLE_REDIRECT_URI=http://localhost:5001/api/google/callback
```

### Step 3: Restart the server

In your terminal where `npm run dev` is running:
1. Press `Ctrl+C` to stop
2. Run `npm run dev` again

### Step 4: Test

Go to http://localhost:3000 and try again.

---

**This is why nothing is loading - the frontend can't reach the backend!**
