# 🚀 Session Startup Command

**Purpose:** Load all essential project context at the start of each coding session.

---

## ⚠️ CRITICAL ARCHITECTURAL RULES (Read First!)

### 🔴 **File Extensions - MUST FOLLOW**
- **Files with JSX syntax MUST use `.jsx` extension**
- **Files with only JavaScript MUST use `.js` extension**
- **Common mistake:** Creating `.js` files that return JSX elements → Vite build fails
- **Example:** `activityUtils.js` → WRONG (contains JSX) → rename to `activityUtils.jsx`

### 🗄️ **Database Names - DO NOT CONFUSE**
- **Main App Database:** `server/fitness-coach.db` (user data, activities, plans, race tags, sessions, season_races)
- **Admin Database:** `server/fitness-coach-admin.db` (admin_users, api_keys, global_settings, themes, coach_personas)
- **IMPORTANT:** User data goes in `fitness-coach.db`, admin config goes in `fitness-coach-admin.db`
- **Migration files:** Check which database the migration targets before running
- **Legacy:** Old `database.sqlite` has been renamed to `fitness-coach-admin.db` (Jan 25, 2026)

### 📦 **Import Paths**
- **Always use `.jsx` extension** when importing JSX files: `import X from './file.jsx'`
- **Service imports:** `../services/serviceName` (not `../lib/serviceName`)
- **Utility imports:** `../lib/utilName.jsx` (if contains JSX) or `../lib/utilName.js`

### 🎨 **UI Components**
- **Main App:** Use `Card`, `Button` from `../components/ui/` (supports dark mode)
- **Admin Panel:** Use `AdminCard`, `AdminButton` from `../components/ui/` (light theme only)
- **NEVER mix them** - Admin uses explicit light colors, App uses dark mode classes

### 🔌 **Ports**
- **Frontend (Vite):** 3000
- **Backend (Express):** 5001
- **API Proxy:** `/api/*` on port 3000 → proxies to port 5001

---

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
- **Databases:** Two separate SQLite databases
  - **Main App:** `server/fitness-coach.db` (26 tables)
    - User data: users, sessions, training_plans, race_tags, race_analyses, season_races
    - Activities: manual_activities, workout_comparisons
    - OAuth: strava_tokens, google_tokens, intervals_tokens
    - Health: wellness_log, adaptation_events, plan_adjustments
  - **Admin Panel:** `server/fitness-coach-admin.db` (13 tables)
    - Admin: admin_users, admin_activity_log, admin_migrations
    - Config: api_keys, ai_model_configs, global_settings, theme_configs
    - Content: coach_personas, ideas, plan_templates
- **Auth:** JWT tokens (admin), OAuth (Strava, Google, Intervals.icu)
- **AI Providers:** OpenAI (GPT-4, DALL-E 3), Gemini
- **Deployment:** Production-ready, can run in Docker

---

## 🚨 Common Pitfalls & How to Avoid Them

### 1. **JSX File Extension Error**
**Symptom:** Vite build fails with "Failed to parse source for import analysis"  
**Cause:** File contains JSX but has `.js` extension  
**Fix:** Rename to `.jsx` and update all imports  
**Prevention:** Always use `.jsx` for files that return JSX elements

### 2. **Database Confusion**
**Symptom:** Migration fails or data appears in wrong place  
**Cause:** Running migration against wrong database or using old database name  
**Fix:** Check migration file - should use `fitness-coach.db` (user data) or `fitness-coach-admin.db` (admin config)  
**Prevention:** 
- User data (races, activities, plans) → `fitness-coach.db`
- Admin config (API keys, themes, settings) → `fitness-coach-admin.db`
- Always verify database path in migration before running
- If you see `database.sqlite`, it's outdated (renamed Jan 25, 2026)

### 3. **Import Path Errors**
**Symptom:** Module not found errors  
**Cause:** Wrong import path or missing `.jsx` extension  
**Fix:** Use correct path: `../services/` for services, `../lib/` for utilities  
**Prevention:** Always include `.jsx` extension when importing JSX files

### 4. **Dark Mode Styling Conflicts**
**Symptom:** Admin panel shows dark mode or main app doesn't  
**Cause:** Using wrong UI components  
**Fix:** Admin → `AdminCard`/`AdminButton`, Main App → `Card`/`Button`  
**Prevention:** Check which part of app you're in before importing components

### 5. **Port Conflicts**
**Symptom:** Server won't start, "port already in use"  
**Cause:** Previous process still running on port 3000 or 5001  
**Fix:** `lsof -ti:5001 | xargs kill -9` and `lsof -ti:3000 | xargs kill -9`  
**Prevention:** Always stop dev server properly with Ctrl+C

### 6. **Cache Issues**
**Symptom:** Changes not appearing, stale data  
**Cause:** localStorage or API cache not cleared  
**Fix:** Clear browser localStorage or force refresh dashboard  
**Prevention:** Use force refresh when testing data changes

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
