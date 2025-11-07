# 🏗️ RiderLabs Project Structure

**Last Updated:** October 31, 2025

## Overview

RiderLabs is a full-stack AI-powered cycling training platform built with:
- **Frontend:** React 18 + Vite + TailwindCSS
- **Backend:** Express.js + SQLite
- **AI:** OpenAI (GPT-4, DALL-E 3), Google Gemini
- **Auth:** JWT (admin), OAuth2 (Strava, Google)

## Directory Structure

```
ai-fitness-coach/
├── src/                          # Frontend React application
│   ├── components/               # Reusable React components
│   │   ├── ui/                  # UI primitives (Button, Card, etc.)
│   │   ├── Layout.jsx           # Main app layout with sidebar
│   │   ├── CoachAvatarSelector.jsx
│   │   ├── ActivityMatchModal.jsx
│   │   ├── FeedbackWidget.jsx
│   │   ├── WeatherWidget.jsx
│   │   └── ...
│   ├── pages/                   # Page components (routes)
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── PlanGenerator.jsx    # AI training plan generator
│   │   ├── AllActivities.jsx    # Strava activities list
│   │   ├── RaceDayPredictor.jsx # Race performance predictor
│   │   ├── PostRaceAnalysis.jsx # Post-race AI analysis
│   │   ├── TodaysWorkout.jsx    # Mobile-optimized workout view
│   │   ├── Settings.jsx         # User settings
│   │   ├── admin/               # Admin panel pages
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── APIKeysPage.jsx
│   │   │   ├── CoachPersonasPage.jsx
│   │   │   └── ...
│   │   └── ...
│   ├── lib/                     # Utility libraries
│   │   ├── coachPersonas.js     # Coach persona definitions
│   │   ├── activityMatching.js  # Activity-to-session matching
│   │   ├── manualActivityUtils.js
│   │   ├── weatherService.js
│   │   ├── timezone.js
│   │   ├── analytics.js         # Plausible analytics
│   │   └── ...
│   ├── App.jsx                  # Root component with routing
│   ├── index.css                # Global styles (Tailwind)
│   └── main.jsx                 # React entry point
│
├── server/                      # Backend Express application
│   ├── routes/                  # API route handlers
│   │   ├── auth.js             # Authentication (login, register)
│   │   ├── strava.js           # Strava OAuth & activities
│   │   ├── google.js           # Google Calendar OAuth
│   │   ├── training.js         # Training plans CRUD
│   │   ├── race.js             # Race predictions & analysis
│   │   ├── personas.cjs        # Coach personas CRUD
│   │   ├── imageGeneration.cjs # AI image generation (DALL-E 3)
│   │   ├── admin.cjs           # Admin panel APIs
│   │   ├── manualActivities.js # Manual activity logging
│   │   ├── feedback.js         # User feedback
│   │   └── ...
│   ├── services/               # Business logic services
│   │   ├── aiPlannerService.js # AI training plan generation
│   │   ├── raceAnalysisService.js
│   │   ├── coachPersonaService.cjs
│   │   ├── aiConfigService.cjs # AI model configs & API keys
│   │   ├── apiKeyLoader.cjs    # Load & decrypt API keys
│   │   ├── adminService.cjs    # Admin authentication
│   │   ├── planService.js      # Training plan storage
│   │   ├── manualActivityService.js
│   │   └── ...
│   ├── migrations/             # Database migrations
│   │   ├── 001_initial_schema.js
│   │   ├── 002_add_race_analyses.js
│   │   ├── 007_add_coach_personas.cjs
│   │   └── run-migrations.js
│   ├── uploads/                # User-uploaded files
│   │   └── personas/           # Coach persona avatars
│   ├── database.sqlite         # SQLite database file
│   ├── index.js                # Express server entry point
│   └── db.js                   # Database initialization
│
├── public/                     # Static assets
│   └── ...
│
├── docs/                       # Documentation (various .md files)
│
├── .env                        # Environment variables (not in git)
├── .env.example                # Environment template
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # TailwindCSS configuration
├── README.md                   # Project documentation
├── TODO.md                     # Task tracking
├── CHANGELOG.md                # Version history
└── SESSION_STARTUP.md          # Session startup guide
```

## Key Files & Their Purpose

### Frontend Core

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main router, defines all routes |
| `src/components/Layout.jsx` | Sidebar navigation, header, layout wrapper |
| `src/pages/Dashboard.jsx` | Main landing page after login |
| `src/pages/PlanGenerator.jsx` | AI training plan generation & management |
| `src/lib/coachPersonas.js` | Coach personality definitions |

### Backend Core

| File | Purpose |
|------|---------|
| `server/index.js` | Express server setup, route registration |
| `server/routes/training.js` | Training plan CRUD, AI adjustments |
| `server/services/aiPlannerService.js` | GPT-4 integration for plan generation |
| `server/services/apiKeyLoader.cjs` | Load encrypted API keys from database |
| `server/db.js` | SQLite database initialization |

### Configuration

| File | Purpose |
|------|---------|
| `vite.config.js` | Frontend dev server (port 3000), API proxy |
| `package.json` | npm scripts, dependencies |
| `.env` | API keys, secrets (not in git) |
| `tailwind.config.js` | TailwindCSS theme, dark mode |

## Data Flow

### 1. Training Plan Generation

```
User Input (PlanGenerator.jsx)
    ↓
POST /api/training/plan/generate
    ↓
aiPlannerService.generatePlan()
    ↓
OpenAI GPT-4 API
    ↓
planService.savePlan() → SQLite
    ↓
Response to Frontend
    ↓
Display Plan (PlanGenerator.jsx)
```

### 2. Strava Activity Sync

```
User clicks "Connect Strava"
    ↓
GET /api/strava/auth → Redirect to Strava OAuth
    ↓
Strava redirects back with code
    ↓
GET /api/strava/callback → Exchange code for tokens
    ↓
Store tokens in localStorage
    ↓
GET /api/strava/activities → Fetch activities
    ↓
Display in AllActivities.jsx
```

### 3. AI Image Generation (Coach Avatars)

```
Admin enters prompt (CoachPersonasPage.jsx)
    ↓
POST /api/image-generation/generate
    ↓
apiKeyLoader.getApiKey('openai')
    ↓
OpenAI DALL-E 3 API
    ↓
Save image to /uploads/personas/
    ↓
Return image URL
    ↓
Display preview in admin panel
```

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password hash) |
| `training_plans` | Saved training plans |
| `race_analyses` | Post-race analysis data |
| `manual_activities` | Non-Strava activities |
| `coach_personas` | AI coach personalities |
| `api_keys` | Encrypted API keys |
| `ai_model_configs` | AI model settings per feature |
| `feedback` | User feedback submissions |

## API Routes Overview

### Public Routes
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/strava/auth` - Strava OAuth start
- `GET /api/strava/callback` - Strava OAuth callback
- `GET /api/personas` - Get active coach personas

### Protected Routes (JWT)
- `POST /api/training/plan/generate` - Generate training plan
- `POST /api/training/plan/adjust` - Adjust existing plan
- `GET /api/strava/activities` - Get Strava activities
- `POST /api/race/predict` - Race day predictions
- `POST /api/race/analysis/generate` - Post-race analysis
- `POST /api/manual-activities` - Log manual activity
- `POST /api/feedback` - Submit feedback

### Admin Routes (Admin JWT)
- `GET /api/personas/admin/all` - Get all personas
- `POST /api/personas/admin/create` - Create persona
- `POST /api/image-generation/generate` - Generate AI image
- `GET /api/admin/api-keys` - Manage API keys
- `POST /api/admin/api-keys` - Add/update API key

## Component Architecture

### Page Components (Routes)
- Mounted by React Router in `App.jsx`
- Handle data fetching and state management
- Compose smaller components

### UI Components (`src/components/ui/`)
- Reusable primitives: Button, Card, Input, etc.
- Styled with TailwindCSS
- Dark mode support via `dark:` classes

### Feature Components (`src/components/`)
- Domain-specific: ActivityMatchModal, WeatherWidget
- Self-contained with own state
- Can be used across multiple pages

## State Management

- **Local State:** `useState` for component-specific state
- **URL State:** React Router for navigation state
- **Persistent State:** 
  - `localStorage` for user preferences, cached data
  - SQLite database for permanent data
- **No Redux:** Kept simple with React hooks

## Styling Approach

- **TailwindCSS:** Utility-first CSS framework
- **Dark Mode:** `dark:` prefix for dark mode styles
- **Responsive:** Mobile-first with `sm:`, `md:`, `lg:` breakpoints
- **Custom Colors:** Purple gradients for AI features

## Build & Deployment

### Development
```bash
npm run dev  # Runs both frontend (3000) and backend (5001)
```

### Production Build
```bash
npm run build  # Creates dist/ folder
npm start      # Runs production server
```

### Docker
```bash
docker build -t riderlabs .
docker run -p 5001:5001 riderlabs
```

## Environment Variables

Required in `.env`:

```bash
# Server
PORT=5001
NODE_ENV=development

# Database
DATABASE_PATH=./server/database.sqlite

# Encryption
ENCRYPTION_KEY=your-secret-key

# OAuth (optional, can use database)
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI APIs (optional, can use database)
OPENAI_API_KEY=
GEMINI_API_KEY=
OPENWEATHER_API_KEY=
```

## Testing Strategy

- **Manual Testing:** Primary approach for now
- **Browser DevTools:** Frontend debugging
- **Server Logs:** Backend debugging with emoji indicators
- **Database Inspection:** `sqlite3 server/database.sqlite`

## Common Patterns

### API Error Handling
```javascript
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) throw new Error('API error');
  const data = await response.json();
  // Handle success
} catch (error) {
  console.error('Error:', error);
  setError(error.message);
}
```

### Protected Routes
```javascript
// Backend
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  // Verify JWT...
  next();
};
```

### Dark Mode Styling
```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>
```

## Performance Optimizations

- **API Key Caching:** 5-minute TTL in `apiKeyLoader.cjs`
- **Persona Caching:** 1-hour TTL in `coachPersonas.js`
- **Weather Caching:** 30-minute TTL in `weatherService.js`
- **Vite HMR:** Fast refresh during development
- **SQLite Indexes:** On frequently queried columns

## Security Measures

- **API Key Encryption:** AES-256-CBC in database
- **Password Hashing:** bcrypt for user passwords
- **JWT Tokens:** Signed with secret key
- **OAuth2:** Secure third-party authentication
- **CORS:** Configured for development/production
- **Input Validation:** On all API endpoints

## Future Improvements

- Add TypeScript for type safety
- Implement automated testing (Jest, Playwright)
- Add Redis for caching
- Migrate to PostgreSQL for production
- Add WebSocket for real-time updates
- Implement rate limiting
- Add monitoring (Sentry, LogRocket)
