# 🚀 Production Deployment Checklist - Password Reset Feature

## Pre-Deployment Tasks

### 1. Environment Variables (CRITICAL)

Update your **production `.env` file** with these variables:

```bash
# Frontend URL - UPDATE THIS!
FRONTEND_URL=https://yourdomain.com

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=support@riderlabs.io
EMAIL_PASSWORD=yhljqwbwydpamgri
EMAIL_FROM_NAME=RiderLabs Support
EMAIL_FROM_ADDRESS=support@riderlabs.io
```

> ⚠️ **IMPORTANT:** Change `FRONTEND_URL` from `http://localhost:5173` to your actual production domain!

---

### 2. Database Migrations

Run these migrations on your **production database**:

```bash
# User password resets table
sqlite3 database.sqlite < migrations/001_password_resets.sql

# Admin password resets table  
sqlite3 database.sqlite < migrations/admin/001_admin_password_resets.sql
```

**Verify migrations:**
```bash
sqlite3 database.sqlite "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%password_resets%';"
```

Should return:
- `password_resets`
- `admin_password_resets`

---

### 3. Test Email Delivery in Production

Before going live, test the email flow:

1. Deploy to staging/production
2. Go to `/forgot-password`
3. Request a password reset
4. Check `support@riderlabs.io` inbox
5. Verify email arrives and reset link works
6. Test both user and admin flows

---

## Security Checklist

- [ ] `.env` file is in `.gitignore` (already done ✓)
- [ ] Google App Password is stored securely
- [ ] Production `FRONTEND_URL` is HTTPS (not HTTP)
- [ ] Rate limiting is enabled (already implemented ✓)
- [ ] Tokens are hashed in database (already implemented ✓)

---

## Rollback Plan

If something goes wrong:

1. **Remove password reset routes** (comment out in `App.jsx`)
2. **Revert database migrations:**
   ```bash
   sqlite3 database.sqlite "DROP TABLE IF EXISTS password_resets;"
   sqlite3 database.sqlite "DROP TABLE IF EXISTS admin_password_resets;"
   ```

---

## Post-Deployment Verification

After deployment, verify:

- [ ] User forgot password flow works end-to-end
- [ ] Admin forgot password flow works end-to-end
- [ ] Emails arrive within 1 minute
- [ ] Reset links expire after 1 hour
- [ ] Tokens can only be used once
- [ ] Rate limiting works (test 4+ requests in 15 minutes)
- [ ] Invalid tokens show proper error message
- [ ] Mobile layout looks good on phones

---

## Optional Enhancements (Future)

- [ ] Add cleanup cron job for expired tokens (every 24 hours)
- [ ] Monitor email delivery failures
- [ ] Add password reset analytics to admin dashboard
- [ ] Add "resend email" functionality

---

## Support Documentation

If users report issues:

1. Check `password_resets` table for their reset attempts:
   ```bash
   sqlite3 database.sqlite "SELECT * FROM password_resets WHERE user_id = X ORDER BY created_at DESC LIMIT 5;"
   ```

2. Common issues:
   - Email in spam folder → Ask them to check spam
   - Link expired → Request a new reset
   - Rate limited → Wait 15 minutes

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Production URL Updated:** ☐ Yes ☐ No

**Migrations Run:** ☐ Yes ☐ No

**Email Tested:** ☐ Yes ☐ No
