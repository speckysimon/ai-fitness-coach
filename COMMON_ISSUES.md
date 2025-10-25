# Common Deployment Issues & Solutions

Quick reference for issues encountered during RiderLabs deployment.

---

## 🔴 Issue: Training Plans Won't Generate (504 Timeout)

**Symptoms:**
- Error: `POST /api/training/plan/generate 504 (Gateway Time-out)`
- Plans work locally but fail on production
- Timeout after ~60 seconds

**Cause:**
Nginx default timeout is 60 seconds, but OpenAI API calls can take 60-120 seconds for plan generation.

**Solution:**
```bash
# SSH into server
ssh root@riderlabs.io

# Edit Nginx config
sudo nano /etc/nginx/sites-available/riderlabs

# Find the /api/ location block and change:
proxy_connect_timeout 60s;  →  180s;
proxy_send_timeout 60s;     →  180s;
proxy_read_timeout 60s;     →  180s;

# Save and reload
sudo nginx -t && sudo systemctl reload nginx
```

**Files:** See `FIX_504_TIMEOUT.md` for detailed instructions

---

## 🔴 Issue: `logger is not defined` Error

**Symptoms:**
- Console error: `ReferenceError: logger is not defined`
- Happens in PlanGenerator or other pages

**Cause:**
Missing import statement for logger utility

**Solution:**
Add to top of file:
```javascript
import logger from '../lib/logger';
```

**Status:** Fixed in commit d1176cf

---

## 🔴 Issue: Weather Widget Shows "Unavailable"

**Symptoms:**
- Weather widget displays "Weather unavailable"
- Works locally but not on production

**Cause:**
Missing `VITE_OPENWEATHER_API_KEY` in production `.env` file

**Solution:**
```bash
# SSH into server
ssh root@riderlabs.io
su - riderlabs

# Edit .env file
nano ~/ai-fitness-coach/.env

# Add this line:
VITE_OPENWEATHER_API_KEY=your_api_key_here

# Restart PM2 with env reload
pm2 restart riderlabs --update-env
```

**Location:** `/home/riderlabs/ai-fitness-coach/.env`

---

## 🔴 Issue: Frontend Not Updating After Deployment

**Symptoms:**
- Pushed code to GitHub
- Pulled on server
- Changes don't appear on live site

**Cause:**
Frontend wasn't rebuilt after pulling new code

**Solution:**
```bash
# Always rebuild frontend after pulling
cd ~/ai-fitness-coach
git pull origin main
npm install          # Not npm ci --production!
npm run build        # This is critical
pm2 restart riderlabs --update-env
```

**Why:** `npm ci --production` skips dev dependencies like Vite, which is needed to build the frontend.

---

## 🔴 Issue: `vite: not found` During Build

**Symptoms:**
- Error during `npm run build`
- Message: `sh: 1: vite: not found`

**Cause:**
Used `npm ci --production` which skips dev dependencies

**Solution:**
```bash
# Use npm install instead
npm install  # Installs ALL dependencies including dev
npm run build
```

**Remember:** Production deployment still needs dev dependencies to BUILD the frontend.

---

## 🔴 Issue: Port 5001 Already in Use

**Symptoms:**
- Error: `EADDRINUSE: address already in use :::5001`
- PM2 won't start

**Cause:**
Old process still running on port 5001

**Solution:**
```bash
# Find process using port
lsof -i :5001

# Kill it (replace PID with actual number)
kill -9 PID

# Or stop all PM2 processes
pm2 stop all
pm2 delete all

# Start fresh
pm2 start server/index.js --name riderlabs
pm2 save
```

---

## 🔴 Issue: Database Migration Fails

**Symptoms:**
- Error: `require is not defined in ES module scope`
- Migration file won't run

**Cause:**
Migration file uses CommonJS syntax (`require`/`module.exports`) but project uses ES modules

**Solution:**
Convert migration file to ES modules:
```javascript
// Change from:
const db = require('../db');
module.exports = { up, down };

// To:
import db from '../db.js';
export { up, down };
```

**Status:** All migrations updated to ES modules

---

## 🔴 Issue: Environment Variables Not Loading

**Symptoms:**
- API keys not working
- Features fail that work locally

**Cause:**
PM2 cached old environment variables

**Solution:**
```bash
# Restart with env reload
pm2 restart riderlabs --update-env

# Or delete and recreate
pm2 delete riderlabs
pm2 start server/index.js --name riderlabs
pm2 save
```

**Always use `--update-env`** when restarting after changing `.env`

---

## 🔴 Issue: Hard Refresh Needed After Deployment

**Symptoms:**
- Deployed new code
- Old version still showing in browser

**Cause:**
Browser cached old JavaScript/CSS files

**Solution:**
```bash
# Users need to hard refresh:
# Mac: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + F5

# Or clear browser cache
```

**Prevention:** Add cache busting to build process (future enhancement)

---

## 🟡 Issue: Slow Initial Page Load

**Symptoms:**
- First page load takes 5-10 seconds
- Subsequent loads are fast

**Cause:**
- Cold start of backend services
- Large bundle size
- No CDN

**Solutions:**
1. Keep PM2 process always running (already done)
2. Optimize bundle size with code splitting
3. Use CDN for static assets (future)
4. Enable Nginx caching for static files

---

## 🟡 Issue: Database File Permissions

**Symptoms:**
- Error: `SQLITE_CANTOPEN: unable to open database file`
- Works as root but not as riderlabs user

**Solution:**
```bash
# Fix permissions
cd ~/ai-fitness-coach
chmod 644 server/fitness-coach.db
chown riderlabs:riderlabs server/fitness-coach.db

# Ensure directory is writable
chmod 755 server/
```

---

## 📋 Deployment Best Practices

### ✅ DO:
- Use `npm install` (not `npm ci --production`) for deployment
- Always run `npm run build` after pulling code
- Use `pm2 restart riderlabs --update-env` after .env changes
- Test locally before deploying
- Keep deployment docs updated
- Use the deployment script: `./QUICK_DEPLOY.sh`

### ❌ DON'T:
- Don't use `npm ci --production` (missing dev deps for build)
- Don't forget to rebuild frontend
- Don't restart PM2 without `--update-env` flag
- Don't edit files directly on server (use git)
- Don't skip database migrations

---

## 🚀 Quick Deployment Commands

**Standard deployment:**
```bash
ssh root@riderlabs.io
su - riderlabs
cd ~/ai-fitness-coach
git pull && npm install && npm run build && node server/migrations/run-migrations.js && pm2 restart riderlabs --update-env
```

**Or use the script:**
```bash
./QUICK_DEPLOY.sh
```

**Check logs:**
```bash
pm2 logs riderlabs --lines 50
```

**Check status:**
```bash
pm2 status
```

---

## 📞 Getting Help

**Check logs first:**
```bash
# PM2 logs
pm2 logs riderlabs --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u riderlabs -n 100
```

**Common log locations:**
- PM2: `~/.pm2/logs/`
- Nginx: `/var/log/nginx/`
- Application: Console output in PM2 logs

---

**Last Updated:** October 25, 2025
**Maintainer:** Simon
**Server:** riderlabs.io (DigitalOcean)
