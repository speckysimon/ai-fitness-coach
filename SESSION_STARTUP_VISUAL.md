# 🎯 Session Startup - Visual Guide

## Quick Start (Copy & Paste)

```
Read these files to load project context:
1. /Users/simonosx/CascadeProjects/ai-fitness-coach/README.md
2. /Users/simonosx/CascadeProjects/ai-fitness-coach/TODO.md
3. /Users/simonosx/CascadeProjects/ai-fitness-coach/PROJECT_STRUCTURE.md
4. /Users/simonosx/CascadeProjects/ai-fitness-coach/CHANGELOG.md
5. /Users/simonosx/CascadeProjects/ai-fitness-coach/package.json
6. /Users/simonosx/CascadeProjects/ai-fitness-coach/vite.config.js
7. /Users/simonosx/CascadeProjects/ai-fitness-coach/server/index.js
```

---

## 📚 What Each File Tells You

### 1️⃣ README.md
```
✓ Project name: RiderLabs
✓ Tech stack: React + Express + SQLite
✓ Core features overview
✓ Setup instructions
```

### 2️⃣ TODO.md
```
✓ Current sprint tasks
✓ Bugs to fix
✓ Feature priorities
✓ Technical debt
```

### 3️⃣ PROJECT_STRUCTURE.md
```
✓ Directory layout
✓ Key files and purposes
✓ Data flow architecture
✓ Component organization
```

### 4️⃣ CHANGELOG.md
```
✓ Recent features added
✓ Bug fixes
✓ Breaking changes
✓ Migration notes
```

### 5️⃣ package.json
```
✓ npm scripts (dev, build, start)
✓ Dependencies and versions
✓ Project metadata
```

### 6️⃣ vite.config.js
```
✓ Frontend port: 3000
✓ API proxy: /api → :5001
✓ Build settings
```

### 7️⃣ server/index.js
```
✓ Backend port: 5001
✓ API routes registered
✓ Database initialization
✓ Environment config
```

---

## 🌐 Port Reference

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 3000 | http://localhost:3000 | React app (Vite) |
| **Backend** | 5001 | http://localhost:5001 | Express API |
| **Proxy** | 3000 | /api/* → :5001/api/* | API calls from frontend |

---

## 🚀 Essential Commands

### Start Development
```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach && npm run dev
```

### Check Server Status
```bash
lsof -i :5001  # Backend
lsof -i :3000  # Frontend
```

### Stop Servers
```bash
# Press Ctrl+C in terminal where npm run dev is running
```

---

## 🎯 Session Workflow

```
┌─────────────────────────────────────────┐
│  1. Start New Session                   │
│     ↓                                    │
│  2. Load Context (read 7 files above)   │
│     ↓                                    │
│  3. Check TODO.md for priorities        │
│     ↓                                    │
│  4. Start dev server (npm run dev)      │
│     ↓                                    │
│  5. Begin coding                        │
└─────────────────────────────────────────┘
```

---

## 📁 Quick File Locations

```
ai-fitness-coach/
├── 📄 STARTUP_COMMAND.txt        ← Copy-paste command
├── 📄 SESSION_STARTUP.md         ← Detailed guide
├── 📄 SESSION_STARTUP_VISUAL.md  ← This file
├── 📄 QUICK_RUN.md               ← Terminal commands
├── 📄 TODO.md                    ← Current tasks
├── 📄 PROJECT_STRUCTURE.md       ← Architecture
├── 📄 CHANGELOG.md               ← Recent changes
├── 📄 README.md                  ← Project overview
├── 📦 package.json               ← Dependencies
├── ⚙️  vite.config.js            ← Frontend config
└── server/
    └── 📄 index.js               ← Backend config
```

---

## 💡 Pro Tips

### For Bug Fixes
1. Read TODO.md for known bugs
2. Check CHANGELOG.md for recent changes
3. Review PROJECT_STRUCTURE.md for affected components

### For New Features
1. Check TODO.md for feature priorities
2. Review PROJECT_STRUCTURE.md for where to add code
3. Check package.json for available dependencies

### For Debugging
1. Check server logs (terminal output)
2. Review vite.config.js for proxy issues
3. Inspect database: `sqlite3 server/database.sqlite`

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Server Not Restarting
```bash
# Manually restart
Ctrl+C
npm run dev
```

### Database Issues
```bash
# Check database
sqlite3 server/database.sqlite ".tables"

# Run migrations
node server/migrations/run-migrations.js
```

---

## ✅ Session Checklist

Before starting work:
- [ ] Loaded all 7 context files
- [ ] Checked TODO.md for priorities
- [ ] Started dev server (`npm run dev`)
- [ ] Verified both ports are running (3000, 5001)
- [ ] Reviewed recent CHANGELOG.md entries

---

## 🎨 Project Quick Facts

- **Name:** RiderLabs (formerly AI Fitness Coach)
- **Domain:** riderlabs.io
- **Tagline:** "Where Performance is Engineered"
- **Database:** SQLite (server/database.sqlite)
- **Auth:** JWT (admin), OAuth2 (Strava, Google)
- **AI:** OpenAI (GPT-4, DALL-E 3), Google Gemini
- **Deployment:** Production-ready, Docker support

---

## 📞 Need Help?

Refer to these files:
- `API_DOCS.md` - API endpoint reference
- `ARCHITECTURE.md` - System architecture
- `ADMIN_QUICK_START.md` - Admin panel guide
- `DEPLOYMENT.md` - Deployment instructions
