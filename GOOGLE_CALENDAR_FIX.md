# Google Calendar OAuth Fix

**Date:** October 10, 2025  
**Issue:** 400 error when connecting Google Calendar  
**Status:** ✅ FIXED

---

## 🐛 Problems Identified

### 1. **Redirect to Non-Existent Page**
- OAuth callback redirected to `/setup` which was removed
- Should redirect to `/settings` instead

### 2. **No Session Validation**
- Google OAuth didn't validate session tokens
- Unlike Strava which properly validates sessions
- Security vulnerability

### 3. **Tokens Not Saved to Database**
- Tokens were passed via URL parameters
- Not saved to database like Strava tokens
- Would be lost on page refresh

### 4. **Hardcoded Frontend URL**
- Used `http://localhost:3000` instead of environment variable
- Would break in production

### 5. **Missing State Parameter**
- No CSRF protection via state parameter
- Security vulnerability

---

## ✅ Fixes Applied

### 1. **Updated `server/routes/google.js`**

#### Added Session Validation
```javascript
// Now requires session token like Strava
router.get('/auth', (req, res) => {
  const sessionToken = req.query.session_token;
  
  // Verify session exists
  const session = sessionDb.findByToken(sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session token' });
  }
  // ...
});
```

#### Added State Parameter for CSRF Protection
```javascript
// Generate unique state for OAuth flow
const state = crypto.randomBytes(16).toString('hex');
pendingOAuthStates.set(state, { sessionToken, page });

// Include in auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  state: state,
  prompt: 'consent', // Force consent to get refresh token
});
```

#### Save Tokens to Database
```javascript
// Save to database instead of passing via URL
googleTokenDb.upsert(session.user_id, {
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  expires_at: tokens.expiry_date,
});
```

#### Fixed Redirect URL
```javascript
// Use environment variable
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Redirect to settings with success flag
res.redirect(`${frontendUrl}/settings?google_success=true`);
```

### 2. **Updated `src/pages/Settings.jsx`**

#### Pass Session Token to OAuth
```javascript
const connectGoogle = async () => {
  const sessionToken = localStorage.getItem('session_token');
  if (!sessionToken) {
    alert('Session expired. Please login again.');
    navigate('/login');
    return;
  }
  const response = await fetch(`/api/google/auth?session_token=${sessionToken}&state=settings`);
  // ...
};
```

#### Handle New Callback Format
```javascript
// Changed from google_data to google_success
const googleSuccess = searchParams.get('google_success');

if (googleSuccess) {
  // Fetch tokens from backend instead of URL
  const response = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });
  const data = await response.json();
  if (data.success && data.user.googleTokens) {
    await onGoogleAuth(data.user.googleTokens);
  }
}
```

#### Added Error Handling
```javascript
const error = searchParams.get('error');
if (error) {
  alert(decodeURIComponent(error));
  navigate('/settings', { replace: true });
}
```

---

## 🔐 Security Improvements

1. **Session Validation** - Verifies user is logged in before OAuth
2. **State Parameter** - CSRF protection via random state tokens
3. **Database Storage** - Tokens stored securely in database
4. **Token Expiry** - State tokens expire after 10 minutes
5. **Session Verification** - Validates session before saving tokens

---

## 🧪 Testing Steps

### 1. Start the Application
```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach
npm run dev
```

### 2. Login to Your Account
- Go to http://localhost:3000
- Login with your credentials

### 3. Connect Google Calendar
- Navigate to Settings page
- Click "Connect" button under Google Calendar
- You should be redirected to Google OAuth consent screen

### 4. Authorize the App
- Select your Google account
- Grant calendar permissions
- You should be redirected back to Settings

### 5. Verify Connection
- Settings page should show "Connected" status
- Check server logs for success messages:
  ```
  🟢 Google callback hit with code: YES
  🟢 Tokens received from Google
  ✅ Google tokens saved to database for user: [user_id]
  ```

### 6. Test Calendar Sync
- Go to Plan Generator
- Generate a training plan
- Click "Sync to Calendar"
- Check your Google Calendar for new events

---

## 📋 Environment Variables Required

Make sure your `.env` file has:

```env
# Google Calendar API Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000
```

### Google Cloud Console Setup

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add authorized redirect URI: `http://localhost:5000/api/google/callback`
7. Copy Client ID and Client Secret to `.env`

---

## 🔄 OAuth Flow Comparison

### Before (Broken)
```
Settings → /api/google/auth → Google OAuth → /api/google/callback
  ↓
Redirect to /setup?google_data=... (page doesn't exist)
  ↓
❌ 404 Error
```

### After (Fixed)
```
Settings → /api/google/auth?session_token=... → Google OAuth → /api/google/callback?state=...
  ↓
Verify session & state → Save to database → Redirect to /settings?google_success=true
  ↓
Settings fetches tokens from /api/auth/me
  ↓
✅ Connected
```

---

## 🎯 What Changed

### Files Modified
1. `server/routes/google.js` - Complete rewrite with session validation
2. `src/pages/Settings.jsx` - Updated OAuth flow and callback handling

### Key Changes
- ✅ Session token validation
- ✅ State parameter for CSRF protection
- ✅ Database storage for tokens
- ✅ Environment variable for frontend URL
- ✅ Redirect to `/settings` instead of `/setup`
- ✅ Error handling and logging
- ✅ Matches Strava OAuth pattern

---

## 🚀 Next Steps

After connecting Google Calendar, you can:

1. **Generate Training Plans** - Create AI-powered plans
2. **Sync to Calendar** - Push sessions to Google Calendar
3. **View Events** - See training sessions in your calendar
4. **Get Reminders** - 60-minute popup reminders before sessions

---

## 📝 Notes

- Google OAuth requires `prompt: 'consent'` to get refresh tokens
- Tokens are stored in `google_tokens` table in database
- State tokens expire after 10 minutes for security
- Frontend URL must match in both `.env` and Google Cloud Console

---

**Status:** ✅ Ready to test  
**Last Updated:** October 10, 2025
