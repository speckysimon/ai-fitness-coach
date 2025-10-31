# Admin Panel - Quick Start Guide

**Status:** ✅ Ready to Launch  
**Time to Setup:** 10 minutes

---

## 🚀 5-Step Setup

### Step 1: Install Dependencies (1 min)
```bash
npm install bcryptjs jsonwebtoken
```

### Step 2: Run Database Migration (1 min)
```bash
node server/migrations/007_add_admin_system.cjs
```

**Expected Output:**
```
✓ Created admin_users table
✓ Created ai_model_configs table
✓ Created api_keys table
✓ Created global_settings table
✓ Created admin_activity_log table
✓ Inserted default AI model configurations
✓ Inserted default global settings
Migration 007_add_admin_system completed successfully
```

### Step 3: Create First Admin User (1 min)
```bash
node server/scripts/create-first-admin.cjs
```

**Expected Output:**
```
✅ First admin user created successfully!

Login credentials:
  Email: admin@riderlabs.io
  Password: ChangeThisPassword123!

⚠️  IMPORTANT: Change this password immediately after first login!

You can now login at: http://localhost:3000/admin/login
```

### Step 4: Start Server (1 min)
```bash
npm run dev
```

### Step 5: Test Admin Panel (5 min)

1. **Open Admin Login:**
   - Navigate to: `http://localhost:3000/admin/login`

2. **Login:**
   - Email: `admin@riderlabs.io`
   - Password: `ChangeThisPassword123!`

3. **Test Each Page:**
   - ✅ Dashboard - View statistics
   - ✅ User Management - See registered users
   - ✅ Admin Users - Manage admin accounts
   - ✅ AI Configuration - Adjust AI models
   - ✅ Global Settings - Toggle app settings

4. **Create a New Admin (Optional):**
   - Go to "Admin Users"
   - Click "Add Admin"
   - Fill in details
   - Click "Create Admin"

---

## 🎯 What You Get

### 7 Admin Pages
1. **Login** - Secure authentication
2. **Dashboard** - Statistics overview
3. **User Management** - Manage users
4. **Admin Users** - Manage admins
5. **AI Configuration** - Configure AI models
6. **Global Settings** - App-wide settings
7. **Activity Log** - Audit trail (in sidebar)

### 30+ API Endpoints
- Admin authentication
- User management (CRUD)
- Admin management (CRUD)
- AI model configuration
- API key management
- Global settings
- Activity logging
- Statistics

---

## 🔒 Security

- ✅ JWT authentication (24h expiry)
- ✅ Password hashing (bcrypt)
- ✅ Super admin role
- ✅ API key encryption (AES-256)
- ✅ Activity audit trail
- ✅ IP address tracking

---

## 📋 Quick Reference

### Admin Routes
- `/admin/login` - Login page
- `/admin/dashboard` - Dashboard
- `/admin/users` - User management
- `/admin/admins` - Admin management
- `/admin/ai-config` - AI configuration
- `/admin/settings` - Global settings

### API Endpoints
- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/users` - List users
- `GET /api/admin/admins` - List admins
- `GET /api/admin/ai-configs` - List AI configs
- `GET /api/admin/settings` - List settings

---

## 🆘 Troubleshooting

### "Cannot find module 'bcryptjs'"
```bash
npm install bcryptjs jsonwebtoken
```

### "Admin login fails"
- Check if migration ran successfully
- Check if first admin user was created
- Check browser console for errors
- Verify server is running on port 5001

### "Page not found"
- Ensure server is running
- Check that admin routes are in App.jsx
- Clear browser cache and reload

---

## ✅ Success Checklist

- [ ] Dependencies installed
- [ ] Database migration completed
- [ ] First admin user created
- [ ] Server started successfully
- [ ] Can access `/admin/login`
- [ ] Can login with credentials
- [ ] Dashboard displays statistics
- [ ] All pages load correctly
- [ ] Can navigate between pages
- [ ] Can logout successfully

---

## 🎉 You're Done!

The admin panel is now fully functional. You can:
- Manage users and admins
- Configure AI models
- Adjust global settings
- Monitor system activity
- View statistics

**Next Steps:**
1. Change the default admin password
2. Create additional admin users if needed
3. Configure AI model settings
4. Adjust global settings as needed
5. (Optional) Set up admin subdomain

---

## 📚 Full Documentation

For detailed information, see:
- `ADMIN_PANEL_SETUP_COMPLETE.md` - Complete setup guide
- `ADMIN_SYSTEM_COMPLETE.md` - Full implementation details
- `ADMIN_SYSTEM_IMPLEMENTATION_STATUS.md` - Status reference

---

**Questions?** Check the troubleshooting section or review the full documentation.

**Ready to deploy?** Follow the subdomain setup guide in `ADMIN_PANEL_SETUP_COMPLETE.md`
