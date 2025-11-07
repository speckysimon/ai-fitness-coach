# 🚀 Session Startup Command

**Purpose:** Load all essential project context at the start of each coding session.

## Quick Startup Command

Copy and paste this into the chat at the start of each session:

```
Read these files to understand the project context:
1. /Users/simonosx/CascadeProjects/ai-fitness-coach/README.md - Project overview
2. /Users/simonosx/CascadeProjects/ai-fitness-coach/TODO.md - Current tasks and priorities
3. /Users/simonosx/CascadeProjects/ai-fitness-coach/package.json - Dependencies and scripts
4. /Users/simonosx/CascadeProjects/ai-fitness-coach/vite.config.js - Frontend config (port 3000)
5. /Users/simonosx/CascadeProjects/ai-fitness-coach/server/index.js - Backend config (port 5001)
6. /Users/simonosx/CascadeProjects/ai-fitness-coach/PROJECT_STRUCTURE.md - Architecture overview
7. /Users/simonosx/CascadeProjects/ai-fitness-coach/CHANGELOG.md - Recent changes
```

## What This Loads

### 1. **README.md**
- Project name: RiderLabs
- Tech stack: React + Vite (frontend), Express + SQLite (backend)
- Core features overview
- Setup instructions

### 2. **TODO.md**
- Current sprint tasks
- Bugs to fix
- Feature priorities
- Technical debt items

### 3. **package.json**
- Available npm scripts
- Dependencies and versions
- Project metadata

### 4. **vite.config.js**
- Frontend port: **3000**
- API proxy configuration (proxies /api to port 5001)
- Build settings

### 5. **server/index.js**
- Backend port: **5001** (or from PORT env variable)
- API routes registered
- Database initialization
- Environment (development/production)

### 6. **PROJECT_STRUCTURE.md**
- Directory layout
- Key files and their purposes
- Data flow architecture
- Component organization

### 7. **CHANGELOG.md**
- Recent feature additions
- Bug fixes
- Breaking changes
- Migration notes

## Port Reference (Quick)

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 3000 | http://localhost:3000 |
| Backend (Express) | 5001 | http://localhost:5001 |
| API Proxy | 3000 | http://localhost:3000/api/* → :5001/api/* |

## Essential Commands

### Start Development
```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach && npm run dev
```

### Check Server Status
```bash
lsof -i :5001  # Backend
lsof -i :3000  # Frontend
```

### View Logs
- Backend: Terminal where `npm run dev` is running (labeled [0])
- Frontend: Same terminal (labeled [1])

## Project Quick Facts

- **Name:** RiderLabs (formerly AI Fitness Coach)
- **Domain:** riderlabs.io
- **Tagline:** "Where Performance is Engineered"
- **Database:** SQLite (server/database.sqlite)
- **Auth:** JWT tokens (admin), OAuth (Strava, Google)
- **AI Providers:** OpenAI (GPT-4, DALL-E 3), Gemini
- **Deployment:** Production-ready, can run in Docker

## Common Session Workflows

### 1. **Bug Fix Session**
- Read TODO.md for known bugs
- Check CHANGELOG.md for recent changes that might be related
- Review relevant component in PROJECT_STRUCTURE.md

### 2. **New Feature Session**
- Check TODO.md for feature priorities
- Review PROJECT_STRUCTURE.md for where to add code
- Check package.json for available dependencies

### 3. **Debugging Session**
- Check server logs (port 5001)
- Review vite.config.js for proxy issues
- Check DATABASE.md for schema reference

## Files to Create (if missing)

If any of these don't exist, they should be created:

- **TODO.md** - Track tasks and priorities
- **PROJECT_STRUCTURE.md** - Document architecture
- **DATABASE.md** - Schema documentation
- **API_REFERENCE.md** - API endpoint documentation
- **DEPLOYMENT.md** - Deployment instructions

## Usage

At the start of each session, simply say:

> "Load session startup context"

Or paste the file list from the "Quick Startup Command" section above.
