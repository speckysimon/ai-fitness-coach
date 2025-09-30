# 🚀 Get Started with AI Fitness Coach

Welcome! This guide will get you up and running in **less than 10 minutes**.

## 📋 What You'll Need

Before starting, make sure you have:

- ✅ **Node.js 18+** installed ([Download here](https://nodejs.org/))
- ✅ A **Strava account** with some activities
- ✅ An **OpenAI account** with API credits
- ✅ (Optional) A **Google account** for calendar sync

## 🎯 Step-by-Step Setup

### Step 1: Navigate to Project Directory

```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages (React, Express, OpenAI, etc.). Takes about 1-2 minutes.

### Step 3: Get Your API Keys

#### 🟠 Strava API (Required - 2 minutes)

1. Go to: https://www.strava.com/settings/api
2. Click **"Create & Manage Your App"**
3. Fill in:
   - **Application Name**: AI Fitness Coach
   - **Category**: Training
   - **Website**: http://localhost:3000
   - **Authorization Callback Domain**: `localhost`
4. Click **"Create"**
5. Copy your **Client ID** and **Client Secret**

#### 🟢 OpenAI API (Required - 2 minutes)

1. Go to: https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Name it: "AI Fitness Coach"
4. Copy the key (you won't see it again!)
5. Make sure you have credits: https://platform.openai.com/account/billing

#### 🔵 Google Calendar API (Optional - 3 minutes)

1. Go to: https://console.cloud.google.com/
2. Create a new project: "AI Fitness Coach"
3. Enable **Google Calendar API**:
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth credentials:
   - Go to **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "AI Fitness Coach"
   - Authorized redirect URIs: `http://localhost:5000/api/google/callback`
5. Copy **Client ID** and **Client Secret**

### Step 4: Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Open .env in your editor
nano .env
# or
code .env
```

Add your API keys:

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

Save the file!

### Step 5: Verify Configuration

```bash
node scripts/check-env.js
```

You should see:
```
✅ Required Configuration:
   ✓ STRAVA_CLIENT_ID: Configured
   ✓ STRAVA_CLIENT_SECRET: Configured
   ✓ OPENAI_API_KEY: Configured

✅ All configuration complete! Ready to start.
```

### Step 6: Start the Application

```bash
npm run dev
```

You should see:
```
🚀 AI Fitness Coach server running on port 5000
  ➜  Local:   http://localhost:3000/
```

### Step 7: Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

## 🎉 First Time Setup

### Connect Strava

1. Click **"Connect Strava"**
2. You'll be redirected to Strava
3. Click **"Authorize"**
4. You'll be redirected back to the app
5. Click **"Continue to Dashboard"**

### (Optional) Connect Google Calendar

1. Go to **Settings** page
2. Click **"Connect"** next to Google Calendar
3. Authorize the app
4. You're all set!

## 🏃 Using the App

### View Your Dashboard

The dashboard shows:
- 📊 **Current FTP** (Functional Threshold Power)
- 📈 **Weekly Training Load** (TSS)
- ⏱️ **Weekly Time & Distance**
- 📉 **6-Week Trend Charts**
- 📝 **Recent Activities**

### Generate Your First Training Plan

1. Go to **"Plan Generator"** in the sidebar
2. Fill in your event details:
   - **Event Name**: e.g., "Spring Century Ride"
   - **Event Date**: Pick a date
   - **Event Type**: Endurance, Gran Fondo, etc.
   - **Priority**: A-race (High), B-race (Medium), or C-race (Low)
3. Set your constraints:
   - **Plan Duration**: 4-8 weeks recommended
   - **Days per Week**: How many days you can train
   - **Max Hours per Week**: Your time availability
4. Click **"Generate AI Training Plan"**
5. Wait 10-20 seconds for AI to create your plan
6. Review your personalized plan!

### Sync to Google Calendar

1. After generating a plan, click **"Sync to Calendar"**
2. All training sessions will be added to your Google Calendar
3. Each session includes:
   - 🎯 Title and type
   - 📝 Detailed description
   - ⏰ Duration
   - 🎚️ Target zones/power

### View Your Calendar

1. Go to **"Calendar"** in the sidebar
2. See your training calendar with:
   - ✅ **Green**: Completed activities from Strava
   - 📅 **Blue**: Planned sessions
3. Navigate between months
4. View monthly summaries

## 🎓 Tips for Best Results

### For Accurate FTP Calculation
- Make sure you have some recent rides with power data
- Do a 20-minute or 60-minute FTP test
- The app will automatically estimate your FTP

### For Better AI Plans
- Be realistic with your time constraints
- Set clear event goals
- Have at least 4-6 weeks of training history
- The more data, the better the plan!

### For Calendar Sync
- Set a default time for workouts (app uses 7 AM)
- You can edit times directly in Google Calendar
- Sessions include all details in the description

## 🆘 Troubleshooting

### "Failed to authenticate with Strava"
- Check your Strava Client ID and Secret in `.env`
- Make sure redirect URI is exactly: `http://localhost:5000/api/strava/callback`
- Verify "localhost" is in your Strava app's Authorization Callback Domain

### "Failed to generate training plan"
- Check your OpenAI API key is valid
- Verify you have credits in your OpenAI account
- The app will fall back to a rule-based plan if AI fails

### "Port already in use"
```bash
# Change port in .env
PORT=5001

# Update redirect URIs in Strava/Google to match new port
```

### No activities showing
- Make sure you authorized Strava with `activity:read_all` scope
- Check that you have activities in the selected time range
- Try refreshing the page

## 📚 Next Steps

### Learn More
- 📖 Read the full [README.md](README.md)
- 🔧 Check out [API_DOCS.md](API_DOCS.md) for API details
- 🏗️ Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- 📝 See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for commands

### Customize Your Experience
- Adjust plan parameters to match your goals
- Experiment with different event types
- Try different training durations
- Sync plans to calendar for easy tracking

### Share Feedback
- Found a bug? Open an issue
- Have a feature idea? We'd love to hear it!
- Want to contribute? Check [CONTRIBUTING.md](CONTRIBUTING.md)

## 🎯 Quick Reference

### Common Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linter
```

### Important URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health Check: http://localhost:5000/api/health

### Key Files
- Configuration: `.env`
- Backend: `server/index.js`
- Frontend: `src/App.jsx`

## ✅ Checklist

Before you start training:

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] API keys configured in `.env`
- [ ] Configuration verified (`node scripts/check-env.js`)
- [ ] App running (`npm run dev`)
- [ ] Strava connected
- [ ] First training plan generated
- [ ] (Optional) Google Calendar connected

## 🎊 You're Ready!

Congratulations! You're all set to start training smarter with AI Fitness Coach.

**Remember**: The app learns from your training history, so the more you use it, the better the recommendations become.

---

**Happy Training! 🚴‍♂️🏃‍♀️**

Need help? Check the [README.md](README.md) or open an issue on GitHub.
