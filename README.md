# 🎯 AI Fitness Coach

A lightweight AI-assisted training coach that pulls in past workouts from Strava, analyses training load and progress, and automatically generates structured forward-looking plans and calendar events, so athletes can see both where they've been and where they're going — all in one clear view.

![AI Fitness Coach](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 What's New in v2.0

- **Race Day Form Predictor**: CTL/ATL/TSB analysis with readiness scoring
- **"Working Towards" System**: Track progress towards target rider type
- **Automatic Activity Matching**: AI-powered session verification with 4-factor scoring
- **AI Race Plan Generator**: Upload GPX routes for personalized race strategies
- **Training Alignment**: Quality-adjusted completion tracking
- **8+ New Academic Sources**: Comprehensive methodology documentation

📋 **See [ROADMAP.md](ROADMAP.md) for planned improvements and feature priorities**

## 🌟 Features

### ✅ Core Features (v1)

#### 1. **Data Ingestion** (Past → Now)
- **Strava Integration**: Pull activities (rides/runs) with comprehensive data:
  - Date, type, duration, distance, elevation
  - Average heart rate, power data (if available)
  - Normalized power, kilojoules, suffer score
- **Derived Metrics**:
  - Current FTP/eFTP estimation
  - Weekly training time, distance, TSS-style load
  - Rolling trends (4-6 weeks)

#### 2. **Progress Dashboard**
- **Calendar View**: Month/week view with past activities and upcoming sessions side by side
- **Key Stats Panel**:
  - Current FTP
  - Weekly totals (time, distance, elevation, load)
  - Training Stress Score (TSS)
- **Trend Lines**: Load progression, volume consistency
- **Visual Analytics**: Interactive charts showing training volume and activity patterns

#### 3. **AI-Assisted Planning** (Future → Schedule)
- **Inputs**:
  - Event goals (date, type, priority)
  - Constraints (available days, max hours per week)
  - Current fitness metrics
- **Outputs**:
  - 4-8 week rolling training plan
  - Recommended session types (Endurance, Tempo, Threshold, VO₂, Recovery)
  - Session details (duration, targets, notes)
  - Indoor/outdoor recommendations
- **Adaptation**: Plan intensity and volume scale with recent training load

#### 4. **Calendar Integration**
- Push training sessions to Google Calendar
- Dedicated "Training" calendar with:
  - Session title, duration, and detailed notes
  - Indoor/outdoor hints
  - Default 60-minute reminders
- Batch creation for entire training plans

#### 5. **Adaptation / Feedback Loop**
- Daily/weekly sync from Strava → update dashboard and load metrics
- AI can adjust future sessions if actual training differs from planned
- Smart recommendations based on compliance and fatigue

### 🔮 Future Enhancements
- Weather integration for indoor/outdoor decisions
- Zwift workout recommendations for indoor substitutions
- Multi-sport support (running, gym, swimming)
- Social/sharing features
- Multi-user support

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Strava Account** with API access
- **OpenAI API Key**
- **Google Cloud Account** (for Calendar API)

### Installation

1. **Clone the repository**:
   ```bash
   cd /Users/simonosx/CascadeProjects/ai-fitness-coach
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file** with your credentials:
   ```env
   # Strava API Configuration
   STRAVA_CLIENT_ID=your_strava_client_id
   STRAVA_CLIENT_SECRET=your_strava_client_secret
   STRAVA_REDIRECT_URI=http://localhost:5000/api/strava/callback

   # OpenAI API Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Google Calendar API Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Frontend URL
   VITE_API_URL=http://localhost:5000
   ```

### API Setup Guide

#### 1. Strava API Setup

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application
3. Set **Authorization Callback Domain** to `localhost`
4. Copy your **Client ID** and **Client Secret**
5. Add them to your `.env` file

#### 2. OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key and add it to your `.env` file
4. **Note**: You'll need credits in your OpenAI account for:
   - AI training plan generation
   - AI race plan generation (GPX route analysis)
5. **Model Used**: gpt-4o-mini (fast and cost-effective)

#### 3. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add authorized redirect URI: `http://localhost:5000/api/google/callback`
7. Copy **Client ID** and **Client Secret** to your `.env` file

### Running the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend on `http://localhost:3000`

2. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

3. **Connect your accounts**:
   - Click "Connect Strava" to authorize access to your activities
   - Optionally connect Google Calendar for plan synchronization

## 📖 Usage Guide

### 1. Dashboard

The dashboard provides an overview of your training:

- **Key Metrics**: FTP, weekly load (TSS), training time, distance
- **Trend Charts**: 6-week volume and activity count
- **Recent Activities**: Last 10 workouts with details

### 2. Plan Generator

Create AI-powered training plans:

1. **Set Your Goals**:
   - Event name and date
   - Event type (Endurance, Gran Fondo, Criterium, etc.)
   - Priority level (A/B/C race)

2. **Configure Constraints**:
   - Plan duration (2-16 weeks)
   - Available days per week
   - Max hours per week
   - Indoor/outdoor preference

3. **Generate Plan**:
   - Click "Generate AI Training Plan"
   - AI analyzes your training history and creates a personalized plan
   - Review weekly sessions with detailed descriptions

4. **Sync to Calendar**:
   - Click "Sync to Calendar" to push all sessions to Google Calendar
   - Sessions appear with full details and reminders

### 3. Calendar View

Visualize your training:

- **Monthly Calendar**: See completed activities (green) and planned sessions (blue)
- **Navigate Months**: Use arrows to view past and future months
- **Monthly Summary**: Total activities, time, and distance

### 4. Settings

Manage your configuration:

- **Connected Accounts**: View connection status
- **Data Management**: Clear local data if needed
- **Logout**: End your session

## 🏗️ Architecture

### Tech Stack

**Frontend**:
- React 18 with Hooks
- React Router for navigation
- TailwindCSS for styling
- Recharts for data visualization
- Lucide React for icons
- date-fns for date manipulation

**Backend**:
- Express.js server
- Node.js
- Axios for API calls
- OpenAI API for AI plan generation
- Google APIs for Calendar integration

**APIs**:
- Strava API v3
- OpenAI GPT-4
- Google Calendar API v3

### Project Structure

```
ai-fitness-coach/
├── server/
│   ├── index.js                 # Express server
│   ├── routes/
│   │   ├── strava.js           # Strava API routes
│   │   ├── google.js           # Google Calendar routes
│   │   ├── training.js         # Training plan routes
│   │   └── analytics.js        # Analytics routes
│   └── services/
│       ├── stravaService.js    # Strava integration
│       ├── googleCalendarService.js
│       ├── aiPlannerService.js # AI plan generation
│       └── analyticsService.js # Metrics calculation
├── src/
│   ├── components/
│   │   ├── Layout.jsx          # Main layout
│   │   └── ui/                 # Reusable UI components
│   ├── pages/
│   │   ├── Dashboard.jsx       # Main dashboard
│   │   ├── PlanGenerator.jsx  # Plan creation
│   │   ├── Calendar.jsx        # Calendar view
│   │   ├── Settings.jsx        # Settings page
│   │   └── Setup.jsx           # OAuth setup
│   ├── lib/
│   │   └── utils.js            # Utility functions
│   ├── App.jsx                 # Main app component
│   └── main.jsx                # Entry point
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🧮 Training Metrics

### FTP Calculation

The app estimates your Functional Threshold Power (FTP) using:

1. **Best 20-60 min efforts** from the last 6 weeks
2. **Normalized power** data when available
3. **95% of 20-min power** or **100% of 60-min power**
4. Fallback to average of top 3 efforts

### TSS (Training Stress Score)

TSS is calculated using:

- **With power data**: `TSS = (duration_hours × IF² × 100)` where IF = NP/FTP
- **With heart rate**: Estimated based on average HR
- **Fallback**: Duration-based estimation with activity type multipliers

### Training Load

- **Current week**: TSS, time, distance, elevation
- **4-week average**: Rolling average for comparison
- **Load ratio**: Current week / 4-week average (optimal: 0.8-1.2)

## 🤖 AI Training Plans

The AI planner uses OpenAI's GPT-4 to generate personalized training plans based on:

- **Your training history**: Recent activities, volume, intensity
- **Current fitness**: FTP, training load, trends
- **Goals**: Event type, date, priority
- **Constraints**: Available time, days per week, preferences

Plans include:

- **Weekly structure**: Focus, total hours, session distribution
- **Individual sessions**: Type, duration, targets, descriptions
- **Progression rationale**: Why the plan is structured this way
- **Adaptation notes**: How to adjust based on feel

## 🔒 Privacy & Security

- **Local storage**: Tokens are stored in browser localStorage
- **No database**: This is a client-side app (v1)
- **API keys**: Never exposed to the frontend
- **OAuth**: Secure authentication flows for Strava and Google
- **Data usage**: Your data is only used to generate training plans

## 🐛 Troubleshooting

### Common Issues

**1. "Failed to authenticate with Strava"**
- Verify your Strava API credentials in `.env`
- Check that redirect URI matches exactly
- Ensure your Strava app is not in development mode limits

**2. "Failed to generate training plan"**
- Check your OpenAI API key is valid
- Ensure you have credits in your OpenAI account
- The app will fall back to rule-based plans if AI fails

**3. "Failed to sync to calendar"**
- Verify Google Calendar API is enabled
- Check OAuth credentials in `.env`
- Ensure redirect URI is authorized in Google Cloud Console

**4. No activities showing**
- Verify you've authorized Strava with `activity:read_all` scope
- Check that you have activities in the selected time range
- Try refreshing the page

## 📝 Development

### Running in Development

```bash
# Install dependencies
npm install

# Start dev server (both frontend and backend)
npm run dev

# Run only backend
npm run server

# Run only frontend
npm run client
```

### Building for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

### Code Style

- **ESLint**: Configured for React
- **Prettier**: Recommended for consistent formatting
- **TailwindCSS**: Utility-first CSS framework

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Strava API** for activity data
- **OpenAI** for AI-powered plan generation
- **Google Calendar API** for seamless scheduling
- **shadcn/ui** for beautiful component patterns

---

**Built with ❤️ for athletes who want to train smarter, not just harder.**

🎯 **Ready to start?** Run `npm install && npm run dev` and connect your Strava account!
