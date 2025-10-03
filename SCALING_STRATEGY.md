# Scaling Strategy - AI Fitness Coach

## 📊 Current State & Limitations

### **Strava API Rate Limits (Per Application)**
- **100 requests per 15 minutes** (~400 requests/hour)
- **1,000 requests per day**

### **Current User Capacity**
- **Light users** (1-2 page views/day): ~200-300 users
- **Moderate users** (3-5 page views/day): ~125-165 users
- **Heavy users** (10+ page views/day): ~50-100 users
- **Realistic estimate**: **100-200 daily active users**

### **Current Implementation**
- ✅ Per-user rate limiting (50 req/15min, 500 req/day per user)
- ✅ Global rate limiting (100 req/15min, 1000 req/day total)
- ✅ 5-minute cache for activities
- ❌ No database storage
- ❌ Real-time fetching on every page load
- ❌ No webhook integration

---

## 🚀 Scaling Roadmap

### **Phase 1: Database + Daily Sync** 
**Timeline:** 2-3 hours  
**Cost:** Free (SQLite) or $5/month (PostgreSQL on Railway)  
**User Capacity:** 500-800 daily active users

#### Implementation Steps

1. **Add Database (Choose One)**

   **Option A: SQLite (Simplest - Local Development)**
   ```bash
   npm install better-sqlite3
   ```
   
   ```javascript
   // server/db/database.js
   const Database = require('better-sqlite3');
   const db = new Database('fitness-coach.db');
   
   db.exec(`
     CREATE TABLE IF NOT EXISTS activities (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_email TEXT NOT NULL,
       strava_id INTEGER UNIQUE,
       name TEXT,
       type TEXT,
       date TEXT,
       duration INTEGER,
       distance REAL,
       elevation REAL,
       avg_power REAL,
       normalized_power REAL,
       avg_heart_rate REAL,
       data TEXT,
       synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       INDEX idx_user_email (user_email),
       INDEX idx_strava_id (strava_id)
     );
     
     CREATE TABLE IF NOT EXISTS sync_status (
       user_email TEXT PRIMARY KEY,
       last_sync DATETIME,
       last_activity_date DATETIME
     );
   `);
   
   module.exports = db;
   ```

   **Option B: PostgreSQL (Production-Ready)**
   ```bash
   npm install pg
   ```
   
   ```javascript
   // server/db/database.js
   const { Pool } = require('pg');
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
   });
   
   // Same schema as SQLite
   ```

2. **Create Activity Service**

   ```javascript
   // server/services/activityService.js
   const db = require('../db/database');
   
   class ActivityService {
     // Store activities in database
     async storeActivities(userEmail, activities) {
       const stmt = db.prepare(`
         INSERT OR REPLACE INTO activities 
         (user_email, strava_id, name, type, date, duration, distance, elevation, 
          avg_power, normalized_power, avg_heart_rate, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `);
       
       const insertMany = db.transaction((activities) => {
         for (const activity of activities) {
           stmt.run(
             userEmail,
             activity.id,
             activity.name,
             activity.type,
             activity.date,
             activity.duration,
             activity.distance,
             activity.elevation,
             activity.avgPower,
             activity.normalizedPower,
             activity.avgHeartRate,
             JSON.stringify(activity)
           );
         }
       });
       
       insertMany(activities);
     }
     
     // Get activities from database
     async getActivities(userEmail, afterDate = null, limit = 100) {
       let query = `
         SELECT data FROM activities 
         WHERE user_email = ?
       `;
       const params = [userEmail];
       
       if (afterDate) {
         query += ' AND date > ?';
         params.push(afterDate);
       }
       
       query += ' ORDER BY date DESC LIMIT ?';
       params.push(limit);
       
       const rows = db.prepare(query).all(...params);
       return rows.map(row => JSON.parse(row.data));
     }
     
     // Check if sync is needed (once per day)
     async needsSync(userEmail) {
       const row = db.prepare(`
         SELECT last_sync FROM sync_status WHERE user_email = ?
       `).get(userEmail);
       
       if (!row) return true;
       
       const lastSync = new Date(row.last_sync);
       const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
       
       return hoursSinceSync >= 24; // Sync once per day
     }
     
     // Update sync status
     async updateSyncStatus(userEmail) {
       db.prepare(`
         INSERT OR REPLACE INTO sync_status (user_email, last_sync)
         VALUES (?, CURRENT_TIMESTAMP)
       `).run(userEmail);
     }
   }
   
   module.exports = new ActivityService();
   ```

3. **Update Strava Routes to Use Database**

   ```javascript
   // server/routes/strava.js
   const activityService = require('../services/activityService');
   
   router.get('/activities', async (req, res) => {
     const { access_token, after, user_id } = req.query;
     
     if (!access_token || !user_id) {
       return res.status(401).json({ error: 'Access token and user_id required' });
     }
   
     try {
       // Check if we need to sync from Strava
       const needsSync = await activityService.needsSync(user_id);
       
       if (needsSync) {
         console.log(`[Sync] Syncing activities for ${user_id}`);
         
         // Fetch from Strava (uses rate limiting)
         const activities = await stravaService.getActivities(access_token, {
           after,
           per_page: 200
         }, user_id);
         
         // Store in database
         await activityService.storeActivities(user_id, activities);
         await activityService.updateSyncStatus(user_id);
         
         return res.json(activities);
       } else {
         console.log(`[Cache] Serving from database for ${user_id}`);
         
         // Serve from database (0 API calls!)
         const activities = await activityService.getActivities(user_id, after);
         return res.json(activities);
       }
     } catch (error) {
       console.error('Error fetching activities:', error);
       res.status(500).json({ error: error.message });
     }
   });
   ```

4. **Add Manual Refresh Endpoint**

   ```javascript
   // server/routes/strava.js
   router.post('/sync', async (req, res) => {
     const { access_token, user_id } = req.body;
     
     try {
       const activities = await stravaService.getActivities(access_token, {
         per_page: 200
       }, user_id);
       
       await activityService.storeActivities(user_id, activities);
       await activityService.updateSyncStatus(user_id);
       
       res.json({ success: true, count: activities.length });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

5. **Update Frontend to Use Manual Refresh**

   ```javascript
   // src/pages/Dashboard.jsx
   const handleManualSync = async () => {
     setRefreshing(true);
     try {
       const response = await fetch('/api/strava/sync', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           access_token: stravaTokens.access_token,
           user_id: userProfile.email
         })
       });
       
       if (response.ok) {
         // Reload data
         loadDashboardData(true);
       }
     } catch (error) {
       console.error('Sync error:', error);
     } finally {
       setRefreshing(false);
     }
   };
   ```

#### Benefits
- ✅ Reduces API calls by 80-90%
- ✅ Faster page loads (serve from database)
- ✅ Works offline (cached data)
- ✅ Supports 500-800 users
- ✅ No infrastructure changes needed (SQLite)

---

### **Phase 2: Production Deployment**
**Timeline:** 1-2 hours  
**Cost:** $5-10/month  
**User Capacity:** Same as Phase 1, but production-ready

#### Recommended Platforms

1. **Railway** (Easiest)
   - Free tier: 500 hours/month
   - Paid: $5/month
   - Includes PostgreSQL database
   - Auto-deploy from GitHub
   
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

2. **Render** (Good alternative)
   - Free tier available
   - PostgreSQL included
   - Auto-deploy from GitHub

3. **Heroku** (Traditional choice)
   - Free tier deprecated
   - $7/month minimum
   - Well-documented

#### Deployment Steps
1. Add `Procfile` for production
2. Set environment variables
3. Connect GitHub repository
4. Enable auto-deploy
5. Add PostgreSQL addon
6. Run database migrations

---

### **Phase 3: Strava Webhooks**
**Timeline:** 4-8 hours  
**Cost:** Same as Phase 2  
**User Capacity:** 10,000+ users

#### When to Implement
- You have 100+ daily active users
- You need real-time activity updates
- You want to eliminate API polling entirely

#### Implementation Overview

1. **Create Webhook Endpoint**
   ```javascript
   // server/routes/strava.js
   
   // Verification endpoint
   router.get('/webhook', (req, res) => {
     const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
     
     if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
       res.json({ 'hub.challenge': challenge });
     } else {
       res.sendStatus(403);
     }
   });
   
   // Event handler
   router.post('/webhook', async (req, res) => {
     const event = req.body;
     
     // Acknowledge immediately
     res.sendStatus(200);
     
     // Process asynchronously
     if (event.object_type === 'activity') {
       if (event.aspect_type === 'create') {
         await handleNewActivity(event.owner_id, event.object_id);
       } else if (event.aspect_type === 'update') {
         await handleUpdatedActivity(event.owner_id, event.object_id);
       } else if (event.aspect_type === 'delete') {
         await handleDeletedActivity(event.object_id);
       }
     }
   });
   ```

2. **Subscribe to Webhooks**
   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=YOUR_CLIENT_ID \
     -F client_secret=YOUR_CLIENT_SECRET \
     -F callback_url=https://yourdomain.com/api/strava/webhook \
     -F verify_token=YOUR_RANDOM_TOKEN
   ```

3. **Handle Events**
   ```javascript
   async function handleNewActivity(athleteId, activityId) {
     // Get user's access token from database
     const user = await getUserByStravaId(athleteId);
     
     // Fetch activity details
     const activity = await stravaService.getActivity(
       user.access_token, 
       activityId,
       user.email
     );
     
     // Store in database
     await activityService.storeActivities(user.email, [activity]);
   }
   ```

#### Benefits
- ✅ Real-time activity updates
- ✅ Minimal API calls (only for new activities)
- ✅ Supports 10,000+ users
- ✅ Better user experience

---

### **Phase 4: Apply for Rate Limit Increase**
**Timeline:** 1 hour (application) + 1-2 weeks (approval)  
**Cost:** Free  
**User Capacity:** 1,000-5,000 users (without webhooks)

#### When to Apply
- You have 100+ daily active users
- You have a production deployment
- You can demonstrate legitimate use case

#### Application Process
1. Email Strava API support
2. Explain your use case
3. Show current usage patterns
4. Request specific limit increase
5. Wait for approval (typically 1-2 weeks)

#### Typical Increases
- 2x: 200 req/15min, 2,000 req/day
- 5x: 500 req/15min, 5,000 req/day
- 10x: 1,000 req/15min, 10,000 req/day

---

## 📈 Scaling Timeline & User Capacity

| Phase | Timeline | Cost | Users | API Calls/Day |
|-------|----------|------|-------|---------------|
| **Current** | - | Free | 100-200 | ~1,000 |
| **Phase 1** | 2-3 hours | Free | 500-800 | ~100-200 |
| **Phase 2** | +1-2 hours | $5-10/mo | 500-800 | ~100-200 |
| **Phase 3** | +4-8 hours | $5-10/mo | 10,000+ | ~50-100 |
| **Phase 4** | +1 hour | Free | 1,000-5,000 | ~2,000-10,000 |

---

## 🎯 Recommended Path

### **For MVP/Testing (Current State)**
- Keep current implementation
- Accept 100-200 user limit
- Focus on product-market fit

### **When You Hit 50 Users**
- Implement Phase 1 (Database + Daily Sync)
- Deploy to Railway/Render (Phase 2)
- **Result**: Support 500-800 users

### **When You Hit 100 Users**
- Apply for rate limit increase (Phase 4)
- Start planning webhook implementation (Phase 3)

### **When You Hit 500 Users**
- Implement webhooks (Phase 3)
- **Result**: Support 10,000+ users

---

## 💡 Quick Wins (Before Database)

### **1. Increase Cache Duration**
```javascript
// Current: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// Recommended: 30-60 minutes
const CACHE_DURATION = 30 * 60 * 1000;
```
**Impact**: Reduces API calls by 50-70%, supports 200-300 users

### **2. Lazy Loading**
Only fetch data when user visits specific pages, not on dashboard load.

**Impact**: Reduces API calls by 30-40%

### **3. Request Batching**
Combine multiple API calls into single requests where possible.

**Impact**: Reduces API calls by 20-30%

---

## 🔍 Monitoring & Alerts

### **Metrics to Track**
- API calls per user per day
- Global API usage (15min and daily windows)
- Database query performance
- Sync success/failure rates
- User growth rate

### **Alerts to Set Up**
- Global rate limit approaching (>80%)
- User hitting rate limits frequently
- Sync failures
- Database errors

---

## 📚 Additional Resources

- [Strava API Documentation](https://developers.strava.com/docs/)
- [Strava Webhook Events](https://developers.strava.com/docs/webhooks/)
- [Railway Documentation](https://docs.railway.app/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)

---

**Last Updated:** October 3, 2025  
**Status:** Phase 1 Ready to Implement  
**Next Review:** When 50+ daily active users
