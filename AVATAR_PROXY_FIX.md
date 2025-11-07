# Avatar Image Proxy Fix

**Date**: October 31, 2025, 7:35pm  
**Issue**: Avatar images showing fallback emoji even when uploaded images exist on server

## Root Cause

The Vite dev server (port 3000) was only proxying `/api` requests to the backend (port 5001), but NOT `/uploads` requests. This meant:

1. Avatar images stored at `/uploads/personas/supportive-1761934939349.png` on backend (port 5001)
2. Browser trying to load from `http://localhost:3000/uploads/...` (frontend)
3. Frontend doesn't have the files → 404 → fallback to emoji

## Evidence

```bash
# Files exist on server
$ ls -la server/uploads/personas/
-rw-r--r--  1 simonosx  staff  2024399 Oct 31 19:25 experienced-1761935137180.png
-rw-r--r--  1 simonosx  staff   350966 Oct 31 19:22 supportive-1761934939349.png

# But trying to access via backend returns 403 (before proxy fix)
$ curl -I http://localhost:5000/uploads/personas/supportive-1761934939349.png
HTTP/1.1 403 Forbidden
```

## Solution

### 1. Added `/uploads` Proxy to Vite Config

**File**: `vite.config.js`

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5001',
      changeOrigin: true,
    },
    '/uploads': {  // ← ADDED THIS
      target: 'http://localhost:5001',
      changeOrigin: true,
    },
  },
},
```

### 2. Added Fallback Handlers to All Avatar Displays

Added `onError` handlers to gracefully fallback to emoji when images fail to load:

**Files Updated**:
- `src/components/CoachAvatarSelector.jsx` - User-facing persona selector
- `src/pages/admin/CoachPersonasPage.jsx` - Admin panel (3 locations: display view, create form, edit form)

**Pattern**:
```jsx
{persona.avatar_url ? (
  <img 
    src={persona.avatar_url}
    onError={(e) => {
      e.target.style.display = 'none';
      e.target.nextSibling.style.display = 'flex';
    }}
  />
) : null}
<div style={{ display: persona.avatar_url ? 'none' : 'flex' }}>
  {persona.avatar || '👤'}
</div>
```

## How It Works Now

### Development (with Vite dev server)
1. Browser requests `/uploads/personas/image.png`
2. Vite proxy forwards to `http://localhost:5001/uploads/personas/image.png`
3. Express static middleware serves file from `server/uploads/personas/`
4. Image displays correctly

### Production
1. Express serves both frontend and backend on same port
2. `/uploads` static middleware serves files directly
3. No proxy needed

## Testing

After restarting Vite dev server:

```bash
# Should now work
curl -I http://localhost:3000/uploads/personas/supportive-1761934939349.png
# Should return: HTTP/1.1 200 OK
```

## Files Modified

1. `vite.config.js` - Added `/uploads` proxy
2. `src/components/CoachAvatarSelector.jsx` - Added onError handlers
3. `src/pages/admin/CoachPersonasPage.jsx` - Added onError handlers (3 locations)

## Required Action

**⚠️ IMPORTANT**: You must restart the Vite dev server for the proxy changes to take effect:

```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Expected Result

After restarting:
- ✅ Uploaded avatar images display correctly
- ✅ Missing images gracefully fallback to emoji
- ✅ No more "Avatar preview" alt text showing
- ✅ Admin panel shows uploaded photos
- ✅ User-facing selector shows uploaded photos

## Database State

Current personas with avatars:
```
supportive  | Coach Samantha | 🤝 | /uploads/personas/supportive-1761934939349.png ✅
experienced | Coach Morgan   | 🏆 | /uploads/personas/experienced-1761935137180.png ✅
```

Both files exist on disk and should now display correctly after dev server restart.

## Status

✅ **FIXED** - Proxy configured, fallbacks added, ready to test after dev server restart
