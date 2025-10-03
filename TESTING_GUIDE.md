# Testing Guide - Database & Setup Page Changes

## Quick Test Scenarios

### Test 1: New User Registration & Strava Connection
**Purpose:** Verify complete new user flow with database persistence

1. **Clear existing data:**
   ```bash
   # Clear browser localStorage and sessionStorage
   # Open DevTools → Application → Clear storage
   ```

2. **Register new account:**
   - Navigate to `http://localhost:3000`
   - Should redirect to `/login`
   - Click "Sign up"
   - Enter: Name, Email, Password
   - Click "Create Account"

3. **Expected:** 
   - ✅ Redirected to `/profile-setup`
   - ✅ User created in database (`server/fitness-coach.db`)

4. **Complete profile:**
   - Enter age, height, weight, gender (or skip)
   - Click "Continue" or "Skip"

5. **Expected:**
   - ✅ Redirected to `/` (Dashboard)
   - ✅ Orange notification banner visible: "Connect Strava to Get Started"
   - ✅ Profile saved to database

6. **Connect Strava:**
   - Click "Connect Strava" button in notification
   - Should navigate to `/settings`
   - Click "Connect" button for Strava
   - Complete OAuth flow on Strava

7. **Expected:**
   - ✅ Redirected back to `/settings?strava_success=true`
   - ✅ Strava shows "Connected" status
   - ✅ Tokens saved to database

8. **Return to Dashboard:**
   - Navigate to `/` (Dashboard)

9. **Expected:**
   - ✅ No notification banner (Strava connected)
   - ✅ Dashboard loads activities from Strava
   - ✅ Metrics displayed

---

### Test 2: Server Restart Persistence
**Purpose:** Verify data survives server restart

1. **With user logged in and Strava connected:**
   - Note your current state (logged in, activities visible)

2. **Restart server:**
   ```bash
   # Stop the dev server (Ctrl+C)
   npm run dev
   ```

3. **Refresh browser:**
   - Refresh the page at `http://localhost:3000`

4. **Expected:**
   - ✅ Still logged in (session valid)
   - ✅ Strava still connected
   - ✅ Activities still load
   - ✅ No need to re-authenticate

5. **Check database:**
   ```bash
   ls -lh server/fitness-coach.db
   # Should show database file exists
   ```

---

### Test 3: Cross-Browser Login
**Purpose:** Verify tokens work across different browsers

1. **In Browser 1 (e.g., Chrome):**
   - Login with your account
   - Connect Strava
   - Verify activities load

2. **In Browser 2 (e.g., Safari/Firefox):**
   - Navigate to `http://localhost:3000`
   - Login with same credentials

3. **Expected:**
   - ✅ Login successful
   - ✅ Strava already connected (no notification)
   - ✅ Activities load immediately
   - ✅ Same data as Browser 1

---

### Test 4: Notification Dismissal
**Purpose:** Verify notification behavior

1. **Login without Strava connected:**
   - Create new account or disconnect Strava
   - Navigate to Dashboard

2. **Expected:**
   - ✅ Orange notification banner visible

3. **Click "Dismiss":**
   - Click the "Dismiss" button

4. **Expected:**
   - ✅ Notification disappears

5. **Refresh page:**
   - Refresh the browser

6. **Expected:**
   - ✅ Notification stays hidden (sessionStorage)

7. **Close browser and reopen:**
   - Close all browser windows
   - Reopen and navigate to app

8. **Expected:**
   - ✅ Notification appears again (new session)

---

### Test 5: Logout & Re-login
**Purpose:** Verify session management

1. **While logged in:**
   - Click user menu → Logout

2. **Expected:**
   - ✅ Redirected to `/login`
   - ✅ Session deleted from database

3. **Login again:**
   - Enter same credentials
   - Click "Sign In"

4. **Expected:**
   - ✅ Login successful
   - ✅ New session created
   - ✅ Strava tokens still available
   - ✅ Dashboard loads normally

---

### Test 6: Settings Page Strava Connection
**Purpose:** Verify Settings page OAuth still works

1. **Navigate to Settings:**
   - Go to `/settings` or click Settings in menu

2. **Connect Strava:**
   - Click "Connect" button for Strava
   - Complete OAuth on Strava

3. **Expected:**
   - ✅ Redirected to `/settings?strava_success=true`
   - ✅ Strava shows "Connected"
   - ✅ Tokens saved to database
   - ✅ No errors in console

---

## Database Verification

### Check Database Contents

```bash
# Install sqlite3 if needed
brew install sqlite3  # macOS

# Open database
sqlite3 server/fitness-coach.db

# View users
SELECT id, email, name, created_at FROM users;

# View sessions
SELECT user_id, token, expires_at FROM sessions;

# View Strava tokens
SELECT user_id, athlete_id, expires_at FROM strava_tokens;

# Exit
.exit
```

### Expected Database Structure

```sql
-- Users table
users: id, email, password, name, age, height, weight, gender, created_at, updated_at

-- Sessions table
sessions: id, user_id, token, created_at, expires_at

-- Strava tokens table
strava_tokens: id, user_id, access_token, refresh_token, expires_at, athlete_id, athlete_data, updated_at

-- Google tokens table
google_tokens: id, user_id, access_token, refresh_token, expires_at, updated_at
```

---

## Common Issues & Solutions

### Issue: "No database file found"
**Solution:** Start the server - database is created automatically on first run

### Issue: "Session expired" error
**Solution:** Sessions expire after 30 days. Login again to create new session.

### Issue: Strava notification doesn't appear
**Solution:** 
- Check if Strava is already connected
- Clear sessionStorage: `sessionStorage.removeItem('strava_notification_dismissed')`

### Issue: OAuth callback fails
**Solution:**
- Verify `.env` has correct `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`
- Check redirect URI matches Strava app settings

### Issue: Activities don't load after connecting
**Solution:**
- Check browser console for errors
- Verify tokens saved: Check `/api/auth/me` response
- Try refreshing the page

---

## API Testing with curl

### Test Health Endpoint
```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Test Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
# Expected: {"success":true,"sessionToken":"...","user":{...}}
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
# Expected: {"success":true,"sessionToken":"...","user":{...}}
```

### Test Get Current User
```bash
# Replace TOKEN with your session token
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
# Expected: {"success":true,"user":{...}}
```

---

## Performance Checks

### Database Size
```bash
du -h server/fitness-coach.db
# Should be small (< 1MB for typical usage)
```

### Session Cleanup
- Expired sessions cleaned automatically every hour
- Check logs for: "Cleaned X expired sessions"

### Token Refresh
- Strava tokens auto-refresh when expired
- Check logs for: "Token refreshed for user X"

---

## Success Criteria

All tests should pass with:
- ✅ No errors in browser console
- ✅ No errors in server logs
- ✅ Database file created and populated
- ✅ Sessions persist across page refreshes
- ✅ Tokens persist across server restarts
- ✅ Cross-browser login works
- ✅ OAuth flow completes successfully

---

**Last Updated:** October 3, 2025  
**Version:** 2.1.0
