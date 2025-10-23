# Quick Test: Google Calendar Connection

## 🚀 Start the App

```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach
npm run dev
```

This starts:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

---

## ✅ Test Steps

### 1. Login
- Go to http://localhost:3000
- Login with your account

### 2. Go to Settings
- Click "Settings" in sidebar
- Find "Google Calendar" section

### 3. Click Connect
- Click "Connect" button
- Should redirect to Google OAuth

### 4. Authorize
- Select your Google account
- Grant calendar permissions
- Should redirect back to Settings

### 5. Verify
- Should show "Connected" status with green checkmark
- Check browser console for success logs

---

## 🐛 If It Fails

### Check Environment Variables
```bash
# Make sure .env has:
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
FRONTEND_URL=http://localhost:3000
```

### Check Google Cloud Console
1. Go to https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Verify redirect URI: `http://localhost:5000/api/google/callback`
4. Make sure Google Calendar API is enabled

### Check Server Logs
Look for:
- `🟢 Google callback hit with code: YES`
- `✅ Google tokens saved to database`

If you see errors, they'll show what went wrong.

---

## 🎉 Success Indicators

- ✅ "Connected" status in Settings
- ✅ Green checkmark next to Google Calendar
- ✅ Console logs show token save
- ✅ Can now sync training plans to calendar

---

## 🔧 Common Issues

### "Session token required"
- You're not logged in
- Solution: Login first

### "Invalid or expired authentication request"
- OAuth state expired (10 min timeout)
- Solution: Try connecting again

### "Failed to authenticate with Google Calendar"
- Wrong credentials in .env
- Redirect URI mismatch
- Solution: Check Google Cloud Console settings

---

**Ready to test!** 🚀
