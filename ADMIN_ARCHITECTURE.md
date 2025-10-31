# 🔐 Admin Panel Architecture

**Last Updated:** October 30, 2025  
**Version:** 1.2.0  
**Status:** Production Ready

---

## Overview

The RiderLabs Admin Panel is a **separate, secure administrative interface** for managing the platform. It features its own authentication system, dedicated database, and comprehensive management tools.

## Key Architectural Decisions

### 1. **Dual Authentication System**
- **Athlete App:** Session-based JWT authentication
- **Admin Panel:** Separate JWT authentication with 24-hour tokens
- **Isolation:** Admin tokens stored separately (`admin_token` vs `session_token`)

### 2. **Dual Database Architecture**
- **App Database:** `fitness-coach.db` (athlete data)
- **Admin Database:** `database.sqlite` (admin-only data)
- **Separation:** Admin operations don't interfere with app performance

### 3. **Role-Based Access Control**
- **Regular Admin:** Access to most admin features
- **Super Admin:** Additional access to API Keys management
- **Safety:** Cannot delete own admin account

---

## Admin Panel Structure

### Frontend Architecture

```
src/pages/admin/
├── AdminLogin.jsx          - Secure login page
├── AdminLayout.jsx         - Sidebar navigation wrapper
├── AdminDashboard.jsx      - Statistics overview
├── UserManagement.jsx      - Manage athlete accounts
├── AdminUsers.jsx          - Manage admin accounts
├── AIConfigPage.jsx        - AI model configuration
├── AIPromptsPage.jsx       - View AI prompts
├── APIKeysPage.jsx         - API key management (Super Admin)
├── ServicesPage.jsx        - External service status
├── GlobalSettings.jsx      - App-wide settings
├── ActivityLogPage.jsx     - Audit trail
└── AdminChangelog.jsx      - Admin version history
```

### Backend Architecture

```
server/
├── routes/
│   ├── admin.cjs           - Main admin routes (CommonJS)
│   └── aiPrompts.cjs       - AI prompts endpoint
│
├── services/
│   ├── adminService.cjs    - Admin auth & user management
│   ├── aiConfigService.cjs - AI configuration & API keys
│   ├── apiKeyLoader.cjs    - Encrypted key retrieval
│   ├── globalSettingsService.cjs - Settings management
│   ├── tokenTrackingService.cjs - Token usage tracking
│   └── modelPricingCron.cjs - Monthly pricing updates
│
└── migrations/
    ├── 007_add_admin_system.cjs - Admin tables
    └── 008_add_token_tracking.cjs - Token tracking tables
```

---

## Database Schema

### Admin Database (`database.sqlite`)

#### `admin_users`
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_super_admin BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);
```

#### `ai_model_configs`
```sql
CREATE TABLE ai_model_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,           -- 'openai' or 'gemini'
  model TEXT NOT NULL,               -- e.g., 'gpt-4-turbo', 'gemini-2.5-pro'
  feature TEXT NOT NULL,             -- 'training_plan', 'plan_adjustment', etc.
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4000,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `api_keys`
```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,            -- 'openai', 'gemini', 'strava', 'google', 'openweather'
  encrypted_key TEXT NOT NULL,       -- AES-256-CBC encrypted
  client_id TEXT,                    -- For OAuth providers
  redirect_uri TEXT,                 -- For OAuth providers
  is_active BOOLEAN DEFAULT 1,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `global_settings`
```sql
CREATE TABLE global_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL,        -- 'string', 'number', 'boolean'
  category TEXT NOT NULL,            -- 'system', 'notifications', 'features', 'limits'
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER
);
```

#### `admin_activity_log`
```sql
CREATE TABLE admin_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,              -- 'login', 'create_user', 'update_settings', etc.
  resource_type TEXT,                -- 'user', 'admin', 'settings', 'api_key'
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `token_usage_logs`
```sql
CREATE TABLE token_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,               -- e.g., 'gpt-4-turbo', 'gemini-2.5-pro'
  feature TEXT NOT NULL,             -- 'training_plan', 'plan_adjustment', etc.
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost REAL,               -- Calculated cost in USD
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_token_logs_created_at ON token_usage_logs(created_at);
CREATE INDEX idx_token_logs_model ON token_usage_logs(model);
```

#### `ai_model_pricing`
```sql
CREATE TABLE ai_model_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT UNIQUE NOT NULL,
  input_price_per_1m REAL NOT NULL,  -- Price per 1M input tokens
  output_price_per_1m REAL NOT NULL, -- Price per 1M output tokens
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Authentication Flow

### Admin Login

```
1. Admin enters email/password
   ↓
2. POST /api/admin/login
   ↓
3. Backend validates credentials (bcrypt)
   ↓
4. Generate JWT token (24-hour expiry)
   ↓
5. Return token + admin user object
   ↓
6. Frontend stores in localStorage:
   - admin_token
   - admin_user (JSON)
   ↓
7. Redirect to /admin/dashboard
```

### Token Verification

```
Every admin API request:
1. Extract token from Authorization header
   ↓
2. Verify JWT signature
   ↓
3. Check expiration (24 hours)
   ↓
4. Attach admin user to req.admin
   ↓
5. Check super admin status if required
   ↓
6. Proceed with request
```

### Security Features

- **Password Hashing:** bcrypt with 10 rounds
- **JWT Tokens:** 24-hour expiration
- **IP Tracking:** All admin actions logged with IP
- **Activity Audit:** Complete trail of all admin operations
- **Role-Based Access:** Super admin for sensitive operations
- **Self-Protection:** Cannot delete own admin account

---

## API Routes

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/verify` - Verify token validity

### User Management
- `GET /api/admin/users` - List all users (paginated)
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Admin Management
- `GET /api/admin/admins` - List admin users
- `POST /api/admin/admins` - Create admin user
- `DELETE /api/admin/admins/:id` - Delete admin user

### AI Configuration
- `GET /api/admin/ai-config` - Get AI configuration
- `PUT /api/admin/ai-config` - Update AI configuration
- `GET /api/admin/ai-prompts` - View AI prompts

### API Keys (Super Admin Only)
- `GET /api/admin/api-keys` - List API keys
- `POST /api/admin/api-keys` - Add API key
- `DELETE /api/admin/api-keys/:id` - Delete API key
- `POST /api/admin/refresh-api-keys` - Refresh keys from DB

### Token Tracking
- `GET /api/admin/token-usage` - Get token usage stats
- `GET /api/admin/available-models` - List available AI models
- `POST /api/admin/update-model-pricing` - Trigger pricing update

### Global Settings
- `GET /api/admin/settings` - Get all settings
- `PUT /api/admin/settings/:key` - Update setting

### Activity Log
- `GET /api/admin/activity-log` - Get activity logs (paginated)

### Statistics
- `GET /api/admin/stats` - Dashboard statistics

---

## Security Architecture

### API Key Encryption

**Algorithm:** AES-256-CBC

```javascript
// Encryption
const key = crypto.createHash('sha256')
  .update(process.env.ENCRYPTION_KEY)
  .digest();
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([
  cipher.update(apiKey, 'utf8'),
  cipher.final()
]);
const stored = iv.toString('hex') + ':' + encrypted.toString('hex');
```

**What's Encrypted:**
- ✅ API Keys (OpenAI, Gemini, OpenWeather)
- ✅ OAuth Client Secrets (Strava, Google)

**What's NOT Encrypted:**
- Client IDs (public identifiers)
- Redirect URIs (callback URLs)
- Provider names

### OAuth Credentials Storage

**Strava Example:**
```json
{
  "key_name": "production-strava",
  "provider": "strava",
  "encrypted_key": "abc123...",  // Client Secret (encrypted)
  "client_id": "12345",           // Plain text
  "redirect_uri": "http://..."    // Plain text
}
```

**Retrieval:**
```javascript
const config = await apiKeyLoader.getOAuthConfig('strava');
// Returns: { clientId, clientSecret (decrypted), redirectUri }
```

---

## Token Tracking & Cost Calculation

### Flow

```
1. AI request made (e.g., generate training plan)
   ↓
2. AI service calls OpenAI/Gemini
   ↓
3. Response includes token usage
   ↓
4. tokenTrackingService.logUsage() called
   ↓
5. Calculate cost based on model pricing
   ↓
6. Store in token_usage_logs table
   ↓
7. Admin can view stats in AI Config page
```

### Cost Calculation

```javascript
const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;
const totalCost = inputCost + outputCost;
```

### Pricing Updates

**Automated Monthly Updates:**
- Cron job runs on 1st of each month at 2:00 AM
- Fetches latest pricing from OpenAI and Gemini
- Updates `ai_model_pricing` table
- Ensures cost calculations stay accurate

---

## Admin Dashboard Metrics

### Real-Time Statistics

```javascript
{
  totalUsers: 150,           // Total registered users
  totalPlans: 89,            // Total training plans generated
  recentUsers: 12,           // New users (last 7 days)
  activeToday: 8,            // Active users today
  totalTokens: 1250000,      // Total AI tokens used
  weeklyTokens: 45000,       // Tokens used (last 7 days)
  dailyTokens: 8500,         // Tokens used today
  monthlyCost: 12.50         // Estimated cost this month
}
```

### Activity Log

Tracks all admin actions:
- User logins
- User/admin creation/deletion
- Settings changes
- API key updates
- AI configuration changes

---

## Feature Highlights

### 1. **AI Configuration**
- Switch between OpenAI and Gemini
- Select specific models per feature
- Adjust temperature and max tokens
- View real-time token usage
- Monitor costs by model

### 2. **AI Prompts Viewer**
- View all 4 AI prompts used in app
- See system prompts and user prompt templates
- View variables and expected outputs
- Copy prompts to clipboard
- Understand AI behavior

### 3. **API Key Management**
- Centralized credential storage
- Support for OAuth providers
- AES-256 encryption
- Dynamic form fields per provider
- No secrets in code

### 4. **User Management**
- Search and filter users
- View user details and activity
- Manage user accounts
- Track user statistics

### 5. **Global Settings**
- App-wide configuration
- Feature flags
- Notification settings
- System limits
- Type-aware inputs

---

## Technology Stack

### Frontend
- **Framework:** React 18
- **Routing:** React Router v6
- **Styling:** TailwindCSS
- **Icons:** Lucide React
- **State:** React Hooks + Context

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Module System:** CommonJS (.cjs) for compatibility
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Encryption:** crypto (Node.js built-in)

### Database
- **Type:** SQLite
- **File:** `database.sqlite`
- **ORM:** None (raw SQL queries)
- **Migrations:** Custom migration scripts

---

## Deployment Considerations

### Environment Variables

```bash
# Required for admin panel
ENCRYPTION_KEY=your_encryption_passphrase_here
JWT_SECRET=your_jwt_secret_here

# Optional (admin panel works without these)
ADMIN_DATABASE_PATH=./server/database.sqlite
```

### First Admin Creation

```bash
# Run once to create first admin user
node server/scripts/create-first-admin.cjs
```

### Database Migrations

```bash
# Run admin system migration
node server/migrations/007_add_admin_system.cjs

# Run token tracking migration
node server/migrations/008_add_token_tracking.cjs
```

---

## Security Best Practices

### ✅ Implemented
- Separate authentication system
- Password hashing with bcrypt
- JWT token expiration (24 hours)
- API key encryption (AES-256-CBC)
- IP address logging
- Activity audit trail
- Role-based access control
- Cannot delete own account

### 🔒 Production Recommendations
- Use HTTPS only
- Implement rate limiting on admin endpoints
- Add 2FA for super admins
- Regular security audits
- Automated backup of admin database
- Monitor suspicious activity patterns
- Implement session invalidation
- Add CSRF protection

---

## Monitoring & Maintenance

### Health Checks
- Monitor admin login attempts
- Track failed authentication
- Alert on unusual activity patterns
- Monitor token usage spikes
- Track API key usage

### Regular Tasks
- Review activity logs weekly
- Update model pricing monthly (automated)
- Audit admin user list quarterly
- Review and rotate API keys
- Clean old activity logs (>90 days)

---

## Future Enhancements

### Planned Features
- [ ] 2FA for super admins
- [ ] Admin user permissions (granular)
- [ ] Bulk user operations
- [ ] Advanced analytics dashboard
- [ ] Email notifications for critical events
- [ ] API key rotation automation
- [ ] Backup/restore functionality
- [ ] Multi-admin collaboration tools

---

**This admin architecture provides a secure, scalable foundation for platform management while maintaining complete separation from the athlete-facing application.**

