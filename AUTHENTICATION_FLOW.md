# Authentication Flow - AI Fitness Coach

## Overview
The app now uses a two-tier authentication system:
1. **User Authentication** - Login with email/password
2. **Service Authentication** - Connect Strava and Google Calendar

---

## 🔐 Authentication Flow

### First-Time User Journey

```
1. Visit app (any URL)
   ↓
2. No 'current_user' in localStorage
   ↓
3. Redirect to /login
   ↓
4. User clicks "Sign up"
   ↓
5. Enter: Name, Email, Password
   ↓
6. Account created in localStorage 'users'
   ↓
7. Redirect to /profile-setup
   ↓
8. Enter: Age, Height, Weight, Gender (optional)
   ↓
9. Profile saved to 'user_profile_{email}'
   ↓
10. Redirect to /setup
   ↓
11. Connect Strava (required for activities)
   ↓
12. Connect Google Calendar (optional)
   ↓
13. Redirect to Dashboard (/)
```

### Returning User Journey

```
1. Visit app
   ↓
2. Check localStorage for 'current_user'
   ↓
3a. Found → Load user profile → Authenticated
    ↓
    Check for Strava tokens
    ↓
    If found → Dashboard
    If not found → /setup (reconnect Strava)

3b. Not found → Redirect to /login
    ↓
    User enters email/password
    ↓
    Validate credentials from 'users'
    ↓
    Load profile from 'user_profile_{email}'
    ↓
    Set authenticated → Redirect to /setup or Dashboard
```

### After Logout

```
1. User clicks Logout
   ↓
2. Remove from localStorage:
   - current_user
   - strava_tokens
   - google_tokens
   ↓
3. Keep in localStorage:
   - users (all accounts)
   - user_profile_{email} (all profiles)
   - training_plan
   - completed_sessions
   - cached_activities
   ↓
4. Redirect to /login
   ↓
5. User can login again with same credentials
```

---

## 🗂️ LocalStorage Structure

### User Authentication
```javascript
// All registered users
users: {
  "user@example.com": {
    email: "user@example.com",
    password: "password123",  // ⚠️ Plain text - NOT production ready
    name: "John Doe",
    createdAt: "2025-10-02T07:00:00.000Z"
  }
}

// Current logged-in user
current_user: {
  email: "user@example.com",
  name: "John Doe",
  age: 35,
  height: 175,
  weight: 70,
  gender: "male",
  createdAt: "2025-10-02T07:00:00.000Z",
  updatedAt: "2025-10-02T08:00:00.000Z"
}

// Individual user profiles (persists after logout)
user_profile_user@example.com: {
  email: "user@example.com",
  name: "John Doe",
  age: 35,
  height: 175,
  weight: 70,
  gender: "male",
  createdAt: "2025-10-02T07:00:00.000Z",
  updatedAt: "2025-10-02T08:00:00.000Z"
}
```

### Service Tokens
```javascript
// Strava OAuth tokens
strava_tokens: {
  access_token: "...",
  refresh_token: "...",
  expires_at: 1234567890
}

// Google Calendar OAuth tokens
google_tokens: {
  access_token: "...",
  refresh_token: "...",
  expires_at: 1234567890
}
```

---

## 🛣️ Route Protection

### Public Routes
- `/login` - Login/Registration page

### Protected Routes (Require User Authentication)
- `/profile-setup` - Profile setup wizard
- `/setup` - Strava/Google connection
- `/` - Dashboard
- `/profile` - User profile management
- `/rider-profile` - Rider analytics
- `/race-day-predictor` - Form predictor
- `/calendar` - Training calendar
- `/plan` - Training plan generator
- `/form` - Fitness & form
- `/ftp` - FTP history
- `/activities` - All activities
- `/race-analytics` - Race analytics
- `/methodology` - Methodology page
- `/changelog` - Changelog
- `/settings` - Settings

### Route Behavior
```javascript
// If NOT authenticated
Navigate to /login

// If authenticated but no user profile
Navigate to /profile-setup

// If authenticated with profile but no Strava
Navigate to /setup

// If fully authenticated
Access all routes
```

---

## 🔄 State Management

### App.jsx State
```javascript
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [userProfile, setUserProfile] = useState(null);
const [stravaTokens, setStravaTokens] = useState(null);
const [googleTokens, setGoogleTokens] = useState(null);
```

### Authentication Checks
1. **On App Load** - Check localStorage for `current_user`
2. **On Every Route** - Verify `isAuthenticated` state
3. **On Logout** - Clear session, keep account data

---

## 🐛 Fixed Issues

### Issue: Blank Pages After Refresh
**Cause:** Old Strava authentication was setting `isAuthenticated(true)` independently

**Fix:** Removed `setIsAuthenticated(true)` from `handleStravaAuth()`

**Result:** Now only user login sets authentication state

### Issue: Incognito Mode Shows Blank
**Expected Behavior:** Should redirect to `/login`

**Actual Behavior:** ✅ Correctly redirects to `/login`

---

## ✅ Testing Checklist

### New User Flow
- [ ] Visit app → Redirects to /login
- [ ] Click "Sign up" → Shows registration form
- [ ] Register → Creates account
- [ ] Redirects to /profile-setup
- [ ] Complete profile → Saves data
- [ ] Redirects to /setup
- [ ] Connect Strava → Saves tokens
- [ ] Redirects to Dashboard

### Existing User Flow
- [ ] Visit app → Loads user from localStorage
- [ ] If tokens exist → Dashboard
- [ ] If no tokens → /setup

### Logout Flow
- [ ] Click logout → Clears session
- [ ] Redirects to /login
- [ ] Account still exists in localStorage
- [ ] Can login again with same credentials

### Browser Refresh
- [ ] Refresh on any page → Maintains authentication
- [ ] Refresh when logged out → Redirects to /login

### Incognito Mode
- [ ] Open in incognito → No user data
- [ ] Redirects to /login
- [ ] Can create new account
- [ ] Data isolated to incognito session

---

## 🔒 Security Notes

### Current Implementation (Development)
- ✅ LocalStorage-based authentication
- ✅ Session management
- ✅ Protected routes
- ⚠️ Plain text passwords
- ⚠️ No encryption
- ⚠️ Client-side only

### Production Requirements
- [ ] Backend authentication server
- [ ] Password hashing (bcrypt)
- [ ] JWT tokens
- [ ] HTTPS only
- [ ] Session expiration
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Email verification
- [ ] Password reset flow
- [ ] Two-factor authentication (optional)

---

## 📝 Summary

**Current Status:** ✅ Working correctly

**Authentication Method:** Email/Password (localStorage)

**Service Connections:** Strava (required), Google Calendar (optional)

**Data Persistence:** User accounts and profiles persist after logout

**Security Level:** Development only - NOT production ready

**Next Steps:** Implement proper backend authentication for production

---

**Last Updated:** October 2, 2025  
**Version:** 2.1.0
