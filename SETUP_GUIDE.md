# 🚀 Quick Setup Guide

This guide will help you get AI Fitness Coach up and running in under 10 minutes.

## Step 1: Install Dependencies

```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach
npm install
```

## Step 2: Get Your API Credentials

### Strava API (Required)

1. Go to https://www.strava.com/settings/api
2. Click "Create & Manage Your App"
3. Fill in the application details:
   - **Application Name**: AI Fitness Coach (or your choice)
   - **Category**: Training
   - **Website**: http://localhost:3000
   - **Authorization Callback Domain**: localhost
4. Click "Create"
5. Copy your **Client ID** and **Client Secret**

### OpenAI API (Required for AI Plans)

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Give it a name (e.g., "AI Fitness Coach")
4. Copy the API key (you won't be able to see it again!)
5. Make sure you have credits in your account

### Google Calendar API (Optional)

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable the Google Calendar API:
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "AI Fitness Coach"
   - Authorized redirect URIs: `http://localhost:5000/api/google/callback`
5. Copy your **Client ID** and **Client Secret**

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   # Strava API
   STRAVA_CLIENT_ID=12345
   STRAVA_CLIENT_SECRET=abc123def456...
   STRAVA_REDIRECT_URI=http://localhost:5000/api/strava/callback

   # OpenAI API
   OPENAI_API_KEY=sk-proj-...

   # Google Calendar API (optional)
   GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback

   # Server
   PORT=5000
   NODE_ENV=development

   # Frontend
   VITE_API_URL=http://localhost:5000
   ```

## Step 4: Start the Application

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend on http://localhost:3000

## Step 5: Connect Your Accounts

1. Open http://localhost:3000 in your browser
2. Click "Connect Strava"
3. Authorize the application
4. (Optional) Click "Connect Google Calendar"
5. Click "Continue to Dashboard"

## Step 6: Start Using the App!

### View Your Dashboard
- See your current FTP, weekly load, and training trends
- View recent activities from Strava

### Generate a Training Plan
1. Go to "Plan Generator"
2. Fill in your event details:
   - Event name (e.g., "Spring Century")
   - Event date
   - Event type (Endurance, Gran Fondo, etc.)
   - Priority (A/B/C race)
3. Set your constraints:
   - Plan duration (weeks)
   - Days per week you can train
   - Max hours per week
4. Click "Generate AI Training Plan"
5. Review your personalized plan
6. Click "Sync to Calendar" to add sessions to Google Calendar

### View Your Calendar
- See past activities and upcoming planned sessions
- Navigate between months
- View monthly summaries

## Troubleshooting

### Port Already in Use

If port 5000 or 3000 is already in use:

1. Edit `.env` and change `PORT=5000` to another port (e.g., `PORT=5001`)
2. Update your redirect URIs in Strava and Google to match
3. Restart the application

### Strava Connection Fails

- Make sure your redirect URI is exactly: `http://localhost:5000/api/strava/callback`
- Check that "localhost" is in your Authorization Callback Domain in Strava settings
- Clear your browser cache and try again

### OpenAI API Errors

- Verify your API key is correct
- Check you have credits in your OpenAI account
- The app will fall back to rule-based plans if AI fails

### Google Calendar Not Syncing

- Make sure you've enabled the Google Calendar API in Google Cloud Console
- Verify your redirect URI matches exactly
- Try disconnecting and reconnecting your Google account

## Next Steps

- Explore the dashboard to see your training metrics
- Generate your first AI training plan
- Sync it to Google Calendar
- Start training smarter! 🎯

## Need Help?

Check the main README.md for more detailed documentation, or open an issue on GitHub.

---

**Happy Training! 🚴‍♂️🏃‍♀️**
