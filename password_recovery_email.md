# Password Recovery via support@riderlabs.io

## Goals
1. Provide a secure email-based password recovery flow for both user app and admin portal.
2. Use the Google Workspace mailbox **support@riderlabs.io** as the outbound sender.
3. Ensure minimal disruption by centralizing configuration, logging, and rate limits.

---

## Email Infrastructure
Use the checkboxes below as the running TODO list for the email portion. Mark each item `[x]` once completed so we can pause/resume without losing context.

1. **Google Workspace SMTP Setup**
   - [ ] Generate an App Password for **support@riderlabs.io** (Admin Console → Users → account → Security → App passwords).
   - [ ] Decide which SMTP port to use (`465` SSL vs `587` STARTTLS) and document it.
   - [ ] Send a manual test message via `openssl s_client` or another SMTP tester to confirm credentials.

2. **Secret Management**
   - [ ] Add a new provider entry (`email_support`) in the Admin API Keys UI with fields: host, port, username, password/app-password, from name, from email.
   - [ ] Extend `apiKeyLoader.getEmailConfig('support')` (and related caching) to expose those fields to the server.

3. **Email Service Wrapper**
   - [ ] Create `server/services/emailService.js` using Nodemailer pooled transport (retry rules, connection limits).
   - [ ] Implement shared HTML + plain-text templates for: request receipt, reset instructions, token expiration notice (accept params like reset URL, support copy deck).
   - [ ] Add logging + metrics hooks (success/failure counters, error stack traces) so Ops can monitor deliverability.

---

## Database Changes
### Main App (`fitness-coach.db`)
Create table `password_resets`:
| column | type | notes |
|---|---|---|
| id | INTEGER PK | auto increment |
| user_id | INTEGER | FK → users.id |
| token_hash | TEXT | sha256/bcrypt hash of token |
| expires_at | TEXT | ISO timestamp, default now + 1h |
| used_at | TEXT | null until consumed |
| request_ip | TEXT | IPv4/6 string |
| user_agent | TEXT | optional |
| purpose | TEXT | default 'user_password_reset' |
| created_at | TEXT | default CURRENT_TIMESTAMP |

Indexes:
- `CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);`
- `CREATE INDEX idx_password_resets_token_hash ON password_resets(token_hash);`

### Admin DB (`database.sqlite`)
Mirror table `admin_password_resets` referencing `admin_users`.

Add nightly cleanup job deleting expired/used rows (> 24h old).

---

## Backend API Flow
### User App
1. `POST /api/auth/forgot-password`
   - Payload: `{ email }`
   - Always respond 200 with generic message.
   - Rate limit per IP/email (e.g., 3 req/hour).
   - Create reset token (48 char random), store hash + metadata, send email with URL `https://app.riderlabs.io/reset-password?token=...`.
2. `GET /api/auth/reset-password/:token` (optional validation endpoint)
   - Returns 200 if token valid, else 400.
3. `POST /api/auth/reset-password`
   - Payload: `{ token, password, confirmPassword }`
   - Verify token, ensure not expired/used, enforce password policy.
   - Hash new password, update user, mark token used, revoke existing sessions.

### Admin Portal
Endpoints under `/api/admin` using admin DB:
- `POST /api/admin/forgot-password`
- `POST /api/admin/reset-password`
- Optional `GET /api/admin/reset-token/:token`

Use same email templates but with admin-specific copy and link `https://app.riderlabs.io/admin/reset-password?token=...`.

### Shared Safeguards
- Token hashing (bcrypt or sha256 + timing-safe compare).
- All responses generic to avoid account enumeration.
- Remove all active sessions on successful reset.
- Log activity (success/failure) with IP + email for monitoring.

---

## Frontend UX
### User App
1. **Login Page**: add "Forgot password?" link.
2. **`ForgotPassword.jsx`** page/modal:
   - Email field, submit button, success state message.
3. **`ResetPassword.jsx`** page:
   - Token read from query string.
   - Password + confirm inputs with strength meter + requirements.
   - Handle expired tokens (prompt to re-request).
4. Mobile + dark mode friendly, align with existing card styling.

### Admin Portal
1. Add link under Admin login card.
2. New admin-specific forgot/reset pages using AdminCard/AdminButton.
3. Emphasize security messaging.

---

## Security & Compliance Checklist
- 1-hour token expiration, single active token per user.
- Rate limiting using `express-rate-limit` plus logging of abuse attempts.
- Password policy enforcement (min length 10, mix of char sets, no common passwords).
- Optionally add captcha if abuse detected.
- Automated tests covering token creation, expiry, reuse, and success path.

---

## Rollout Steps
1. Implement DB migrations for both databases.
2. Build email service + integrate with admin API keys storage.
3. Add backend endpoints + services.
4. Create frontend pages/components (user + admin) with loading and error states.
5. Write integration/functional tests.
6. Configure SMTP creds in production via admin panel.
7. Update documentation (README, TODO checklist, Admin SOP) and CHANGELOG.
8. Deploy and verify by performing end-to-end reset on staging/production.
