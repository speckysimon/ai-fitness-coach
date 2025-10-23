# FTP Consistency Fix

## Problem
Dashboard and FTP History pages were showing different FTP values:
- **Dashboard**: 226W
- **FTP History**: No value displayed

## Root Cause
The two pages were using **different FTP calculation methods**:

1. **Dashboard** (`src/pages/Dashboard.jsx`):
   - Uses backend API: `POST /api/analytics/ftp`
   - Calls `analyticsService.calculateFTP(activities)`
   - Centralized, consistent calculation

2. **FTP History** (`src/pages/FTPHistory.jsx`):
   - Used client-side calculation: `calculateWeeklyFTP()`
   - Different algorithm and logic
   - Only looked at weekly best efforts

## Solution
Updated FTP History to use the **same backend API** as Dashboard for the current FTP value.

### Changes Made in `src/pages/FTPHistory.jsx`

1. **Added backend FTP fetch** (lines 238-256):
   ```javascript
   // Calculate current FTP using the same backend service as Dashboard
   let currentFTPValue = null;
   if (activities.length > 0) {
     try {
       const ftpResponse = await fetch('/api/analytics/ftp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ activities }),
       });
       
       if (ftpResponse.ok) {
         const ftpData = await ftpResponse.json();
         currentFTPValue = ftpData.ftp;
       }
     } catch (error) {
       console.error('Error fetching FTP from backend:', error);
     }
   }
   ```

2. **Updated currentFTP state** (line 302):
   ```javascript
   // Use backend FTP value if available, otherwise fall back to history
   setCurrentFTP(currentFTPValue || (filledHistory.length > 0 ? filledHistory[filledHistory.length - 1].ftp : null));
   ```

## Benefits
1. **Consistency**: Both pages now show the same FTP value
2. **Single source of truth**: Backend `analyticsService.calculateFTP()` is the authoritative calculation
3. **Reliability**: If backend FTP is unavailable, falls back to historical data
4. **Maintainability**: Only one FTP calculation algorithm to maintain

## How It Works Now

### Current FTP Display
- **Primary source**: Backend API (`/api/analytics/ftp`)
- **Fallback**: Most recent week from FTP history
- **Display**: Shows "N/A" if no data available

### Historical FTP Chart
- Still uses weekly calculation for historical trend
- Shows progression over time
- Maintains backward compatibility with existing data

## Testing
- ✅ Dashboard shows FTP value
- ✅ FTP History shows same FTP value
- ✅ Both pages use backend calculation
- ✅ Fallback works if backend unavailable
- ✅ Historical chart still displays correctly
