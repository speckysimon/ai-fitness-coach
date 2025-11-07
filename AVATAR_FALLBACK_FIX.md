# Avatar Image Fallback Fix

**Date**: October 31, 2025, 7:30pm  
**Issue**: Coach avatar images showing alt text instead of displaying image or emoji fallback

## Problem

When a persona has an `avatar_url` in the database but the image file doesn't exist on disk, the `<img>` tag would show the alt text ("Coach Samantha") instead of gracefully falling back to the emoji avatar.

## Root Cause

1. Database had `avatar_url` values pointing to non-existent files
2. No `onError` handler on `<img>` tags to fallback to emoji
3. Missing `avatar` column in database for emoji fallback

## Solution Implemented

### 1. Added `avatar` Column to Database

```bash
sqlite3 server/fitness-coach.db "ALTER TABLE coach_personas ADD COLUMN avatar TEXT;"
```

### 2. Populated Emoji Avatars

```sql
UPDATE coach_personas SET avatar = '💪' WHERE id = 'motivator';
UPDATE coach_personas SET avatar = '📊' WHERE id = 'analytical';
UPDATE coach_personas SET avatar = '🤝' WHERE id = 'supportive';
UPDATE coach_personas SET avatar = '🎯' WHERE id = 'strategic';
UPDATE coach_personas SET avatar = '🏆' WHERE id = 'experienced';
```

### 3. Updated Frontend Component

**File**: `src/components/CoachAvatarSelector.jsx`

**Changes**:
- Added `onError` handlers to all `<img>` tags
- When image fails to load, hide the `<img>` and show the emoji fallback
- Both the main persona cards and selection summary now have this fallback

**Before**:
```jsx
{coach.avatar_url ? (
  <img src={coach.avatar_url} alt={coach.name} />
) : (
  <div>{coach.avatar}</div>
)}
```

**After**:
```jsx
{coach.avatar_url ? (
  <img 
    src={coach.avatar_url} 
    alt={coach.name}
    onError={(e) => {
      e.target.style.display = 'none';
      e.target.nextSibling.style.display = 'block';
    }}
  />
) : null}
<div style={{ display: coach.avatar_url ? 'none' : 'block' }}>
  {coach.avatar || '👤'}
</div>
```

### 4. Updated Admin UI

**File**: `src/pages/admin/CoachPersonasPage.jsx`

**Changes**:
- Added `avatar` field to form state
- Added emoji input field in create/edit forms
- Label: "Avatar Emoji (fallback)"
- Placeholder: "e.g., 💪"
- Max length: 2 characters
- Helper text: "Used when photo avatar is not available"

## How It Works Now

1. **Image Exists**: Displays the photo avatar from `/uploads/personas/`
2. **Image Missing**: `onError` fires → hides image → shows emoji
3. **No avatar_url**: Shows emoji directly
4. **No emoji**: Shows default 👤 icon

## Testing

To test the fallback:
1. Create a persona with an emoji but no photo
2. Create a persona with a photo that doesn't exist
3. Both should show the emoji fallback gracefully

## Database State

Current personas in database:
```
motivator    | Coach Alex     | 💪 | null
analytical   | Coach Jordan   | 📊 | null
supportive   | Coach Samantha | 🤝 | /uploads/personas/supportive-1761934939349.png (missing)
strategic    | Coach Taylor   | 🎯 | null
experienced  | Coach Morgan   | 🏆 | /uploads/personas/experienced-1761935137180.png (missing)
```

## Benefits

- **Graceful Degradation**: Always shows something (photo → emoji → default icon)
- **No Broken Images**: Never shows alt text or broken image icon
- **Better UX**: Users always see a visual representation
- **Admin Friendly**: Admins can set emoji fallback when creating personas

## Files Modified

1. `src/components/CoachAvatarSelector.jsx` - Added onError handlers
2. `src/pages/admin/CoachPersonasPage.jsx` - Added avatar field to forms
3. Database: Added `avatar` column and populated with emojis

## Status

✅ **FIXED** - Avatar images now gracefully fallback to emoji when photo is missing
