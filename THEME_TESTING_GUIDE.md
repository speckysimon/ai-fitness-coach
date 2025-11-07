# Theme System Testing Guide

## ✅ Setup Complete

The theme system has been successfully set up with 3 default themes:

1. **RiderLabs Light** (Active) - Default light theme
2. **RiderLabs Dark** - Dark theme with enhanced contrast
3. **High Contrast** - Accessibility-focused theme

## How to Test

### 1. Check Theme Loading

Open your browser console (F12) and look for these messages:

```
🎨 Theme initialized: RiderLabs Light
✅ Applied theme: RiderLabs Light
```

### 2. Verify CSS Variables

In browser DevTools:
1. Open Elements tab
2. Select the `<html>` element
3. Look for CSS variables in the Styles panel:
   - `--color-primary: #2563EB`
   - `--color-secondary: #06B6D4`
   - `--color-accent: #9333EA`
   - etc.

### 3. Check API Endpoint

Open this URL in your browser:
```
http://localhost:3000/api/admin/theme-configs/active
```

You should see:
```json
{
  "success": true,
  "theme": {
    "id": 1,
    "name": "RiderLabs Light",
    "description": "Default light theme with optimal contrast and readability",
    "config": { /* color configuration */ }
  }
}
```

### 4. Test Theme Switching (Admin Panel)

1. Navigate to: `http://localhost:3000/admin/login`
2. Login with admin credentials
3. Go to: Admin Panel → Theme Configuration
4. You should see 3 themes:
   - 🟢 RiderLabs Light (Active)
   - ⚪ RiderLabs Dark
   - ⚪ High Contrast
5. Click "Set as Active" on a different theme
6. Watch the console for: `🔄 Theme updated, applying new theme`
7. Verify colors change across the app

### 5. Test Cache

1. Refresh the page
2. Look for: `📦 Using cached theme: RiderLabs Light`
3. Theme should load instantly from cache

### 6. Test Fallback

To test the fallback mechanism:
1. Stop the backend server
2. Clear localStorage: `localStorage.removeItem('active_theme')`
3. Refresh page
4. Should see: `⚠️ No active theme found, using default`
5. App should still work with default colors

## Expected Behavior

### On App Startup
```
1. App.jsx calls initializeTheme()
2. Checks localStorage cache (1-hour TTL)
3. If cached: Apply immediately + fetch fresh in background
4. If no cache: Fetch from API
5. Apply theme colors to CSS custom properties
6. Log success message
```

### On Theme Activation (Admin)
```
1. Admin clicks "Set as Active"
2. Backend updates database (is_active = 1)
3. Frontend calls reloadTheme()
4. Clears cache
5. Fetches fresh theme
6. Applies new colors
7. Shows success message
```

## Troubleshooting

### Theme Not Loading
- Check browser console for errors
- Verify API endpoint: `/api/admin/theme-configs/active`
- Check if themes exist in database:
  ```bash
  sqlite3 server/database.sqlite "SELECT * FROM theme_configs;"
  ```

### Theme Not Changing
- Clear browser cache
- Clear localStorage: `localStorage.clear()`
- Verify theme is marked as active in database
- Check console for reload confirmation

### Colors Not Updating
- Inspect `<html>` element in DevTools
- Verify CSS variables are set
- Check if dark mode is affecting colors
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

## Database Queries

### View All Themes
```bash
sqlite3 server/database.sqlite "SELECT id, name, is_active FROM theme_configs;"
```

### Activate a Theme
```bash
sqlite3 server/database.sqlite "UPDATE theme_configs SET is_active = 0; UPDATE theme_configs SET is_active = 1 WHERE id = 2;"
```

### Delete All Themes
```bash
sqlite3 server/database.sqlite "DELETE FROM theme_configs;"
```

### Re-seed Themes
```bash
node server/scripts/seedDefaultThemes.cjs --force
```

## Success Criteria

✅ Console shows theme initialization message  
✅ CSS variables are set on `:root`  
✅ API endpoint returns active theme  
✅ Admin panel shows all 3 themes  
✅ Theme switching works immediately  
✅ Cache persists across page refreshes  
✅ Fallback works when API fails  

## Next Steps

Once testing is complete:
1. Test on different browsers (Chrome, Firefox, Safari)
2. Test in production environment
3. Monitor console logs for any issues
4. Consider adding more themes
5. Optional: Migrate components to use CSS variables

## Color Comparison

### RiderLabs Light
- Primary: `#2563EB` (blue-600)
- Accent: `#9333EA` (purple-600)
- Success: `#10B981` (green-500)

### RiderLabs Dark
- Primary: `#60A5FA` (blue-400) - Brighter for dark backgrounds
- Accent: `#C084FC` (purple-400)
- Success: `#6EE7B7` (green-300)

### High Contrast
- Primary: `#1E40AF` (blue-800) - Darker for maximum contrast
- Accent: `#7C3AED` (purple-700)
- Success: `#059669` (green-600)

---

**Status:** Ready for testing! 🎨
