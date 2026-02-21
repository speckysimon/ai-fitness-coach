# Deploy Demo Mode - Quick Steps

## On Production Server (riderlabs-prod)

```bash
cd ~/ai-fitness-coach
git pull
npm run build
pm2 restart riderlabs
```

## Test Demo Mode

1. Go to: `https://riderlabs.ai/login?demo=true`
2. Click "Generate Demo User"
3. Login with generated credentials
4. Dashboard should load with 90 days of mock cycling data

## What Was Deployed

- ✅ Demo user database support (is_demo column)
- ✅ Mock Strava data generator (realistic power, HR, distance)
- ✅ Backend routes for demo users
- ✅ Frontend demo detection and mock data loading
- ✅ UI indicators (DEMO badge, Settings page)
- ✅ Admin DB theme_configs fix

## Rollback (if needed)

```bash
git revert HEAD
npm run build
pm2 restart riderlabs
```
