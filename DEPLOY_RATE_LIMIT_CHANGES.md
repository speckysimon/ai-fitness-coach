# Deploy Plan – Admin DB & Rate Limit Updates

**Target:** Tonight’s production deploy

## 1. Pre-Deploy
1. `git pull origin main` on server.
2. Run `./scripts/backup-db.sh` (backs up both SQLite DBs + WALs).

## 2. Admin DB Prep
1. Ensure new files exist: `server/adminDb.cjs`, `server/add-rate-limit-setting.sql`, `server/add-rate-limit-setting.sh`.
2. Run `./server/add-rate-limit-setting.sh` → confirms `max_ai_chats_per_day`=10 in `global_settings`.

## 3. Code Rollout
1. `npm install` (installs `better-sqlite3`).
2. Restart backend (`pm2 restart riderlabs`).
3. Rebuild/restart frontend if applicable (`npm run build` or existing process).

## 4. Smoke Test
1. Login to `/admin/settings`.
2. In **Limits Settings**, validate both entries:
   - Max plan generations per day (5)
   - Max AI chats per day (10, editable)
3. Change value → ensure success toast + value persists after refresh.

## 5. Logs & Monitoring
1. `pm2 logs riderlabs --lines 100` → confirm “Admin database connection established (better-sqlite3)” and no errors.
2. Spot-check API routes (admin login, settings) via Postman/curl if time.

## 6. Post-Deploy
1. Add note to release doc / changelog.
2. Notify admins they can tune the AI chat limit.
3. Schedule enforcement work item (limit is configuration-only until backend gating ships).
