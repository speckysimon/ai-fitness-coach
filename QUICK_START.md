# Quick Start Guide - Updated October 3, 2025

## 🚀 Start the App

```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach
npm run dev
```

**Servers:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## 👤 First Time User

1. **Visit** http://localhost:3000
2. **Sign up** with email/password
3. **Complete profile** (or skip)
4. **See Dashboard** with Strava notification
5. **Click "Connect Strava"** → Goes to Settings
6. **Connect Strava** → OAuth completes
7. **Return to Dashboard** → Activities load

---

## 🔄 Returning User

1. **Visit** http://localhost:3000
2. **Login** with credentials
3. **Dashboard loads** with your data
4. **Data persists** even after server restart

---

## 🗄️ Database

**Location:** `server/fitness-coach.db`

**View data:**
```bash
sqlite3 server/fitness-coach.db
SELECT * FROM users;
SELECT * FROM sessions;
SELECT * FROM strava_tokens;
.exit
```

**Backup:**
```bash
cp server/fitness-coach.db server/fitness-coach.db.backup
```

---

## 🔧 Common Commands

**Restart server:**
```bash
# Ctrl+C to stop
npm run dev
```

**Clear database (start fresh):**
```bash
rm server/fitness-coach.db
npm run dev  # Creates new database
```

**Check server health:**
```bash
curl http://localhost:5000/api/health
```

---

## 📋 Key Changes

### ✅ What's New
- **Database storage** - Data persists across restarts
- **No Setup page** - Removed, use Settings instead
- **Dashboard notification** - Prompts to connect Strava
- **Cross-browser login** - Works on any browser

### ❌ What's Removed
- Setup page (`/setup` route)
- In-memory storage (Maps)
- Tokens in URL parameters

---

## 🎯 Quick Tests

**Test 1: Registration**
```
1. Sign up → Check database: SELECT * FROM users;
2. Should see new user
```

**Test 2: Persistence**
```
1. Login and connect Strava
2. Restart server (Ctrl+C, npm run dev)
3. Refresh browser → Still logged in
```

**Test 3: Cross-browser**
```
1. Login in Chrome
2. Open Safari → Login with same account
3. Strava already connected
```

---

## 🐛 Troubleshooting

**Problem:** Database not found  
**Solution:** Start server, it creates automatically

**Problem:** Session expired  
**Solution:** Login again (sessions last 30 days)

**Problem:** Strava won't connect  
**Solution:** Check `.env` has correct Strava credentials

**Problem:** Activities don't load  
**Solution:** Check console, verify tokens in database

---

## 📚 Documentation

- **CHANGES_SUMMARY.md** - Complete overview
- **DATABASE_MIGRATION.md** - Database details
- **SETUP_PAGE_REMOVAL.md** - Setup page changes
- **TESTING_GUIDE.md** - Full testing instructions

---

## 🎉 Success Checklist

- [x] Database persists data
- [x] Login works across browsers
- [x] Strava OAuth completes
- [x] Dashboard shows notification
- [x] Settings page connects Strava
- [x] Server restart preserves data

---

**Version:** 2.1.0  
**Last Updated:** October 3, 2025
