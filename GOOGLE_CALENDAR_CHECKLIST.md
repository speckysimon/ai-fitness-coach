# Google Calendar Setup Checklist

## ✅ Pre-Flight Checklist

### 1. Environment Variables
Check your `.env` file has these values:

```env
# Google Calendar API Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Port
PORT=5000
```

**Status:** [ ] Done

---

### 2. Google Cloud Console Setup

1. Go to https://console.cloud.google.com/
2. Select your project (or create new one)
3. Enable **Google Calendar API**
   - APIs & Services → Library
   - Search "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 Credentials
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/api/google/callback`
5. Copy Client ID and Client Secret to `.env`

**Status:** [ ] Done

---

### 3. Start the Application

```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach
npm run dev
```

Should see:
```
🚀 AI Fitness Coach server running on port 5000
📊 Environment: development
✅ Database initialized
```

**Status:** [ ] Done

---

## 🧪 Testing Checklist

### 4. Login to Your Account
- [ ] Go to http://localhost:3000
- [ ] Login with your credentials
- [ ] Redirected to Dashboard

---

### 5. Navigate to Settings
- [ ] Click "Settings" in sidebar
- [ ] See "Connected Accounts" section
- [ ] See "Google Calendar" card

---

### 6. Connect Google Calendar
- [ ] Click "Connect" button under Google Calendar
- [ ] Redirected to Google OAuth page
- [ ] Select your Google account
- [ ] Grant calendar permissions
- [ ] Redirected back to Settings

---

### 7. Verify Connection
- [ ] Settings shows "Connected" with green checkmark
- [ ] No error messages
- [ ] Browser console shows: `✅ Google tokens loaded from Settings`

---

### 8. Check Server Logs
Should see:
```
🟢 Google callback hit with code: YES
🟢 State: [random_hex_string]
🟢 Exchanging code for tokens...
🟢 Tokens received from Google
✅ Google tokens saved to database for user: [user_id]
🟢 Redirecting to: http://localhost:3000/settings?google_success=true
```

**Status:** [ ] Done

---

### 9. Test Calendar Sync
- [ ] Go to Plan Generator page
- [ ] Generate a training plan (or use existing)
- [ ] Click "Sync to Calendar" button
- [ ] Should see success message
- [ ] Open Google Calendar
- [ ] Verify training sessions appear

**Status:** [ ] Done

---

## 🐛 Troubleshooting

### If Connection Fails

#### Error: "Session token required"
- **Cause:** Not logged in
- **Fix:** Login first, then try connecting

#### Error: "Invalid or expired authentication request"
- **Cause:** OAuth state expired (10 min timeout)
- **Fix:** Click "Connect" again

#### Error: "Failed to authenticate with Google Calendar"
- **Cause:** Wrong credentials or redirect URI mismatch
- **Fix:** 
  1. Check `.env` has correct Client ID and Secret
  2. Verify redirect URI in Google Cloud Console: `http://localhost:5000/api/google/callback`
  3. Make sure Google Calendar API is enabled

#### Error: "redirect_uri_mismatch"
- **Cause:** Redirect URI doesn't match Google Cloud Console
- **Fix:** 
  1. Go to Google Cloud Console → Credentials
  2. Edit your OAuth 2.0 Client ID
  3. Add: `http://localhost:5000/api/google/callback`
  4. Save and try again

#### No Events Appear in Calendar
- **Cause:** Wrong calendar or permissions
- **Fix:**
  1. Check you're looking at the correct Google account
  2. Look for "Training" calendar or primary calendar
  3. Verify events were created (check server logs)

---

## 📊 Success Indicators

When everything works, you should see:

1. ✅ "Connected" status in Settings
2. ✅ Green checkmark next to Google Calendar
3. ✅ Server logs show token save
4. ✅ Training sessions appear in Google Calendar
5. ✅ Events have 60-minute reminders
6. ✅ Events are color-coded (red for training)

---

## 🎯 What You Can Do Now

Once connected:

1. **Generate Training Plans** - AI-powered personalized plans
2. **Sync to Calendar** - One-click sync all sessions
3. **Get Reminders** - Automatic 60-min before session
4. **View Schedule** - See training in familiar calendar UI
5. **Edit Events** - Modify directly in Google Calendar

---

## 📝 Notes

- You only need to connect once
- Tokens are stored in database
- Refresh tokens allow long-term access
- Can disconnect anytime from Settings

---

## ✅ Final Checklist

- [ ] Environment variables configured
- [ ] Google Cloud Console setup complete
- [ ] Application running
- [ ] Logged in to account
- [ ] Google Calendar connected
- [ ] Connection shows "Connected" status
- [ ] Server logs show success
- [ ] Test sync works
- [ ] Events appear in Google Calendar

---

**When all boxes are checked, you're ready to go! 🚀**

---

## 🆘 Need Help?

Check these files:
- `GOOGLE_CALENDAR_FIX.md` - Detailed technical documentation
- `QUICK_TEST_GOOGLE.md` - Quick testing guide
- `FIXES_SUMMARY_OCT10.md` - Summary of all changes

Or check server logs for specific error messages.
