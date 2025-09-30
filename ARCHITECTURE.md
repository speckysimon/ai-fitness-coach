# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Frontend                           │ │
│  │                   (Port 3000)                               │ │
│  │                                                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │Dashboard │  │  Plan    │  │ Calendar │  │ Settings │  │ │
│  │  │   Page   │  │Generator │  │   View   │  │   Page   │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │           React Router + State Management            │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              localStorage (Tokens & Cache)           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST API
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Express Backend Server                        │
│                        (Port 5000)                               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      API Routes                             │ │
│  │                                                             │ │
│  │  /api/strava/*     /api/google/*     /api/training/*      │ │
│  │  /api/analytics/*                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Service Layer                            │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Strava     │  │   Google     │  │  Analytics   │    │ │
│  │  │   Service    │  │   Calendar   │  │   Service    │    │ │
│  │  │              │  │   Service    │  │              │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │           AI Planner Service (OpenAI)                │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
┌───────────────▼────────┐  ┌──────────▼──────────┐
│   External APIs        │  │   External APIs     │
│                        │  │                     │
│  ┌──────────────────┐ │  │ ┌─────────────────┐ │
│  │  Strava API v3   │ │  │ │ Google Calendar │ │
│  │                  │ │  │ │    API v3       │ │
│  │ - OAuth          │ │  │ │                 │ │
│  │ - Activities     │ │  │ │ - OAuth         │ │
│  │ - Athlete Stats  │ │  │ │ - Events CRUD   │ │
│  └──────────────────┘ │  │ └─────────────────┘ │
└────────────────────────┘  └─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      OpenAI API                                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    GPT-4 Turbo                            │  │
│  │                                                           │  │
│  │  - Training plan generation                              │  │
│  │  - Plan adaptation recommendations                       │  │
│  │  - Session recommendations                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
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
