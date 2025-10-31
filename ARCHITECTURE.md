# 🏗️ RiderLabs Architecture Overview

**Last Updated:** October 30, 2025  
**Version:** 2.7.1  
**Status:** Production Ready

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            USER BROWSER                                   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      React Frontend (Vite)                           │ │
│  │                        Port 5173 (dev)                               │ │
│  │                                                                       │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    ATHLETE APP (/*)                             │ │ │
│  │  │                                                                  │ │ │
│  │  │  Dashboard │ Plan Generator │ Calendar │ Today's Workout       │ │ │
│  │  │  FTP History │ All Activities │ Race Analytics │ Rider Profile │ │ │
│  │  │  Race Day Predictor │ Post-Race Analysis │ Form & Fitness      │ │ │
│  │  │  Settings │ Methodology │ Changelog                            │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    ADMIN PANEL (/admin/*)                       │ │ │
│  │  │                                                                  │ │ │
│  │  │  Admin Login │ Dashboard │ User Management │ Admin Users       │ │ │
│  │  │  AI Configuration │ AI Prompts │ API Keys (Super Admin)        │ │ │
│  │  │  Services │ Global Settings │ Activity Log │ Changelog        │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │         React Router + Theme Context + State Management        │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │  localStorage: session_token, admin_token, strava_tokens,      │ │ │
│  │  │  google_tokens, training_plan, race_analyses, user_timezone    │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ HTTP/REST API
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│                      Express Backend Server                               │
│                          Port 5001                                        │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         API Routes                                   │ │
│  │                                                                       │ │
│  │  /api/auth/*          - User authentication (JWT)                   │ │
│  │  /api/strava/*        - Strava OAuth & activities                   │ │
│  │  /api/google/*        - Google Calendar OAuth & events              │ │
│  │  /api/training/*      - Training plans & AI generation              │ │
│  │  /api/analytics/*     - FTP, TSS, trends calculation                │ │
│  │  /api/race/*          - Race analysis & predictions                 │ │
│  │  /api/race-tags/*     - Race tagging system                         │ │
│  │  /api/adaptation/*    - Adaptive training & illness tracking        │ │
│  │  /api/user/*          - User preferences & profile                  │ │
│  │  /api/feedback/*      - User feedback widget                        │ │
│  │  /api/manual-activities/* - Manual activity logging                │ │
│  │  /api/admin/*         - Admin panel (separate auth) ⚡              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                               │                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                       Service Layer                                  │ │
│  │                                                                       │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │ │
│  │  │ Strava Service  │  │ Google Calendar │  │ Analytics       │    │ │
│  │  │ - Activities    │  │ - Event sync    │  │ - FTP calc      │    │ │
│  │  │ - OAuth refresh │  │ - OAuth refresh │  │ - TSS calc      │    │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘    │ │
│  │                                                                       │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │ │
│  │  │ AI Planner      │  │ Adaptive        │  │ Smart Metrics   │    │ │
│  │  │ - Plan gen      │  │ - Auto adjust   │  │ - FTHR tracking │    │ │
│  │  │ - Adjustments   │  │ - Illness track │  │ - Power curves  │    │ │
│  │  │ - Analysis      │  │ - Modifications │  │ - Rider profile │    │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘    │ │
│  │                                                                       │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │ │
│  │  │ Admin Service   │  │ AI Config       │  │ Token Tracking  │    │ │
│  │  │ - Auth (JWT)    │  │ - Model config  │  │ - Usage logs    │    │ │
│  │  │ - User mgmt     │  │ - API keys      │  │ - Cost calc     │    │ │
│  │  │ - Activity log  │  │ - Encryption    │  │ - Pricing cron  │    │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘    │ │
│  │                                                                       │ │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │ │
│  │  │ Manual Activity │  │ Global Settings │                          │ │
│  │  │ - 14 sports     │  │ - App config    │                          │ │
│  │  │ - TSS calc      │  │ - Feature flags │                          │ │
│  │  └─────────────────┘  └─────────────────┘                          │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                               │                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      Dual Database System                            │ │
│  │                                                                       │ │
│  │  ┌────────────────────────────┐  ┌──────────────────────────────┐  │ │
│  │  │   App Database (SQLite)    │  │  Admin Database (SQLite)     │  │ │
│  │  │   fitness-coach.db         │  │  database.sqlite             │  │ │
│  │  │                            │  │                              │  │ │
│  │  │ - users                    │  │ - admin_users                │  │ │
│  │  │ - training_plans           │  │ - ai_model_configs           │  │ │
│  │  │ - race_analyses            │  │ - api_keys (encrypted)       │  │ │
│  │  │ - user_preferences         │  │ - global_settings            │  │ │
│  │  │ - manual_activities        │  │ - admin_activity_log         │  │ │
│  │  │ - race_tags                │  │ - token_usage_logs           │  │ │
│  │  │ - illness_log              │  │ - ai_model_pricing           │  │ │
│  │  │ - wellness_log             │  │                              │  │ │
│  │  │ - feedback                 │  │                              │  │ │
│  │  └────────────────────────────┘  └──────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                              │
┌───────────────▼─────────┐  ┌────────────────▼────────────┐
│   External APIs         │  │   AI Services               │
│                         │  │                             │
│  ┌───────────────────┐ │  │ ┌─────────────────────────┐ │
│  │  Strava API v3    │ │  │ │ OpenAI GPT-4 Turbo      │ │
│  │  - OAuth 2.0      │ │  │ │ - Plan generation       │ │
│  │  - Activities     │ │  │ │ - Plan adjustments      │ │
│  │  - Athlete stats  │ │  │ │ - Workout analysis      │ │
│  └───────────────────┘ │  │ │ - Race analysis         │ │
│                         │  │ └─────────────────────────┘ │
│  ┌───────────────────┐ │  │                             │
│  │ Google Calendar   │ │  │ ┌─────────────────────────┐ │
│  │  - OAuth 2.0      │ │  │ │ Google Gemini           │ │
│  │  - Events CRUD    │ │  │ │ - 2.5 Pro/Flash         │ │
│  └───────────────────┘ │  │ │ - 2.0 Flash             │ │
│                         │  │ │ - 1.5 Pro/Flash         │ │
│  ┌───────────────────┐ │  │ └─────────────────────────┘ │
│  │ OpenWeather API   │ │  │                             │
│  │  - Current        │ │  │ Token tracking & cost       │
│  │  - Hourly         │ │  │ calculation for all models  │
│  └───────────────────┘ │  └─────────────────────────────┘
└─────────────────────────┘
```

## Data Flow

### 1. Initial Setup Flow

```
User → Setup Page → OAuth Redirect → Strava/Google
                                          ↓
User ← Dashboard ← Tokens Stored ← OAuth Callback
```

### 2. Dashboard Data Flow

```
Dashboard Page
    ↓
    ├─→ Fetch Activities (Strava API)
    │       ↓
    ├─→ Calculate FTP (Analytics Service)
    │       ↓
    ├─→ Calculate Training Load (Analytics Service)
    │       ↓
    └─→ Get Trends (Analytics Service)
            ↓
        Display Metrics & Charts
```

### 3. Plan Generation Flow

```
Plan Generator Page
    ↓
User Input (Goals + Constraints)
    ↓
    ├─→ Fetch Recent Activities (Strava)
    │       ↓
    ├─→ Calculate Current Metrics (Analytics)
    │       ↓
    └─→ Generate Plan (AI Planner Service)
            ↓
        OpenAI GPT-4 API
            ↓
        Formatted Training Plan
            ↓
        Display Plan to User
            ↓
        [Optional] Sync to Google Calendar
```

### 4. Calendar Sync Flow

```
Training Plan
    ↓
Convert Sessions to Events
    ↓
Batch Create Events API Call
    ↓
Google Calendar API
    ↓
Events Created in User's Calendar
```

## Component Architecture

### Frontend Component Hierarchy

```
App
├── Router
│   ├── Setup (Public Route)
│   │   └── OAuth Connection Cards
│   │
│   └── Layout (Protected Routes)
│       ├── Sidebar Navigation
│       │
│       ├── Dashboard
│       │   ├── StatCard (x4)
│       │   ├── LineChart (Volume Trend)
│       │   ├── BarChart (Activity Count)
│       │   └── ActivityCard List
│       │
│       ├── PlanGenerator
│       │   ├── Goal Input Form
│       │   ├── Constraints Form
│       │   ├── Generate Button
│       │   └── Plan Display
│       │       └── Week/Session Cards
│       │
│       ├── Calendar
│       │   ├── Month Navigation
│       │   ├── Calendar Grid
│       │   │   └── Day Cells
│       │   │       ├── Completed Activities
│       │   │       └── Planned Sessions
│       │   └── Monthly Summary Cards
│       │
│       └── Settings
│           ├── Connected Accounts
│           ├── API Configuration
│           └── Data Management
```

## Service Layer Architecture

### Backend Services

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  StravaService                                              │
│  ├── getActivities()                                        │
│  ├── getActivity(id)                                        │
│  ├── getAthleteStats()                                      │
│  ├── normalizeActivity()                                    │
│  └── refreshToken()                                         │
│                                                              │
│  GoogleCalendarService                                      │
│  ├── createEvent()                                          │
│  ├── batchCreateEvents()                                    │
│  ├── getEvents()                                            │
│  ├── updateEvent()                                          │
│  └── deleteEvent()                                          │
│                                                              │
│  AnalyticsService                                           │
│  ├── calculateFTP()                                         │
│  ├── calculateTSS()                                         │
│  ├── calculateTrainingLoad()                                │
│  ├── getWeeklySummary()                                     │
│  ├── getTrends()                                            │
│  └── daysUntilGoal()                                        │
│                                                              │
│  AIPlannerService                                           │
│  ├── generateTrainingPlan()                                 │
│  ├── adaptPlan()                                            │
│  ├── recommendSession()                                     │
│  ├── buildPlanPrompt()                                      │
│  ├── formatPlan()                                           │
│  └── generateRuleBasedPlan() [Fallback]                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### Strava OAuth 2.0

```
1. User clicks "Connect Strava"
   ↓
2. Frontend requests auth URL from backend
   ↓
3. Backend generates Strava OAuth URL
   ↓
4. User redirected to Strava authorization page
   ↓
5. User authorizes app
   ↓
6. Strava redirects to callback URL with code
   ↓
7. Backend exchanges code for tokens
   ↓
8. Backend returns tokens to frontend
   ↓
9. Frontend stores tokens in localStorage
   ↓
10. User redirected to dashboard
```

### Google Calendar OAuth 2.0

```
Similar flow to Strava, but with Google OAuth endpoints
```

## Data Models

### Activity Object
```typescript
{
  id: number
  name: string
  type: string
  date: ISO8601 string
  duration: number (seconds)
  distance: number (meters)
  elevation: number (meters)
  avgHeartRate: number
  avgPower: number (watts)
  normalizedPower: number (watts)
  // ... more fields
}
```

### Training Plan Object
```typescript
{
  planSummary: string
  weeks: [
    {
      weekNumber: number
      focus: string
      totalHours: number
      sessions: [
        {
          day: string
          type: string
          duration: number (minutes)
          title: string
          description: string
          targets: string
          date: ISO8601 string
        }
      ]
    }
  ]
  notes: string
  generatedAt: ISO8601 string
}
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  React 18, TailwindCSS, Recharts, Lucide Icons             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  React Router, State Management, API Client                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  Express.js REST API, CORS, JSON Middleware                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  Services (Strava, Google, Analytics, AI Planner)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  Strava API, Google Calendar API, OpenAI API               │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Production)

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    CDN (CloudFront)                          │
│              Static Assets (CSS, JS, Images)                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Load Balancer (ALB)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
┌───────▼────────┐              ┌─────────▼────────┐
│  Frontend      │              │   Backend API    │
│  (Vercel/      │              │   (Heroku/       │
│   Netlify)     │              │    AWS ECS)      │
└────────────────┘              └─────────┬────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         │                                  │
                ┌────────▼────────┐              ┌─────────▼────────┐
                │   PostgreSQL    │              │   Redis Cache    │
                │   (RDS/Supabase)│              │   (ElastiCache)  │
                └─────────────────┘              └──────────────────┘
```

## Security Considerations

### Current Implementation
- ✅ OAuth 2.0 for authentication
- ✅ Environment variables for secrets
- ✅ HTTPS redirect URIs
- ✅ Token storage in localStorage (client-side)

### Production Recommendations
- 🔒 Use httpOnly cookies for tokens
- 🔒 Implement CSRF protection
- 🔒 Add rate limiting
- 🔒 Use secure session management
- 🔒 Implement token refresh logic
- 🔒 Add request validation
- 🔒 Use database for token storage
- 🔒 Implement proper CORS policies

---

**This architecture provides a solid foundation for a scalable, maintainable fitness coaching application.**
