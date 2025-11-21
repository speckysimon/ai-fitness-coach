# Rate Limit Settings

**Last Updated:** November 21, 2025

This document outlines how to add and enforce a configurable "Max AI Chats per Day" limit via the Admin Global Settings panel.

---

## 1. Setting Definition

| Field                      | Value/Notes                                             |
|---------------------------|----------------------------------------------------------|
| **Key**                   | `max_ai_chats_per_day`                                   |
| **Type**                  | Number                                                   |
| **Default Value**         | `10` (recommend making this configurable per tenant)     |
| **Category**              | `limits` (renders in the "Limits Settings" card)        |
| **Description**           | "Maximum AI coach chats per user per day"              |
| **Validation**            | Positive integer (recommended 1–100)                     |
| **Storage Table**         | `global_settings`                                        |

Insert the setting via migration or an admin-only seed script so it becomes editable in the UI immediately.

```sql
INSERT INTO global_settings (
  setting_key,
  setting_value,
  setting_type,
  category,
  description,
  created_at,
  updated_at
) VALUES (
  'max_ai_chats_per_day',
  '10',
  'number',
  'limits',
  'Maximum AI coach chats per user per day',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

---

## 2. Admin Panel Surface Area

**Frontend File:** `src/pages/admin/GlobalSettings.jsx`

- Settings are grouped by `category`, so simply adding the DB row automatically renders the new control under "Limits Settings".
- Because `setting_type` is `number`, the control is a numeric input.
- Consider adding helper text under the card header describing how the limit works (optional enhancement).

**Behavior:**
1. Admin updates the value → `PUT /api/admin/settings/:key` fires.
2. `globalSettingsService.updateSetting()` persists the numeric string.
3. Success toast already handled globally.

---

## 3. Enforcement Logic (Backend)

**Primary Goal:** Prevent users from initiating more AI chat requests than allowed per calendar day.

### 3.1 Data Tracking

Two tracking options:
1. **Reuse `token_usage_logs`:** Log each AI chat as `feature_name = 'ai_chat'` and count per user per day.
2. **Dedicated table (recommended for clarity):**
   ```sql
   CREATE TABLE IF NOT EXISTS ai_chat_logs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL,
     chat_type TEXT DEFAULT 'activity',
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

### 3.2 Fetching Limit Value

Add helper in `globalSettingsService`:
```js
async function getMaxChatsPerDay() {
  const setting = await this.getSetting('max_ai_chats_per_day');
  return Number(setting.value) || 10;
}
```

### 3.3 Enforcement Hook

Example pseudo-code (e.g., inside `training` route that triggers AI coach):
```js
const limit = await globalSettingsService.getMaxChatsPerDay();
const todayCount = await aiChatService.getUserChatCountToday(userId);

if (todayCount >= limit) {
  return res.status(429).json({
    error: 'You have reached today\'s AI chat limit. Try again tomorrow.',
  });
}

await aiChatService.logChat(userId, 'activity');
```

- Use `DATE(created_at) = DATE('now','localtime')` to respect local midnight, or stick with UTC for simplicity.
- Return HTTP 429 so frontend can display a consistent rate limit message.

---

## 4. Frontend Handling (User-Facing)

- When API returns 429, show toast/banner indicating limit reached.
- Optionally, display remaining chats (requires API to return `limit - count`).
- If future tiers exist, upsell upgrade when limit is hit.

---

## 5. Testing Checklist

1. **Admin Panel**
   - Update setting value and confirm it persists after page refresh.
2. **Backend Enforcement**
   - Simulate `limit - 1` requests → should succeed.
   - Simulate `limit` requests → last call should return 429.
   - Confirm limit resets after midnight (run query with manual date change or adjust clock).
3. **Telemetry**
   - Ensure each blocked request logs an event for monitoring.

---

## 6. Rollout Steps

1. Create DB migration for the new setting (and optional `ai_chat_logs` table).
2. Deploy backend changes (helper + enforcement) and frontend toast handling.
3. QA on staging: set limit to small number (e.g., 2) for easy verification.
4. Deploy to production and monitor error logs for 429 spikes.

---

## 7. Future Enhancements

- **Per-tier limits:** Extend schema to support different limits per subscription plan.
- **Burst allowances:** Allow admins to grant temporary overrides (e.g., `extra_ai_chats` field).
- **User UI:** Display remaining chats on dashboard or chat modal.
- **Analytics dashboard:** Chart showing average chats per user vs. limit.

---

This doc should be updated whenever additional rate limit settings are introduced (e.g., plan adjustments per week, workout analysis per day, etc.).
