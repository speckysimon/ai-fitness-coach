# Race Pages Bug Fix - November 7, 2025

## Issues Fixed

### 1. **401 Unauthorized Errors**
**Problem:** Strava API calls were failing with 401 errors when access tokens expired.

**Root Cause:** No proper handling for expired tokens in RaceAnalytics and PostRaceAnalysis pages.

**Solution:** Added explicit 401 error detection and user-friendly error messages.

### 2. **`activities.filter is not a function` Crashes**
**Problem:** App crashed with "TypeError: activities.filter is not a function" when API calls failed.

**Root Cause:** When Strava API returned errors (like 401), the response was an error object `{error: "..."}` instead of an array. The code was setting this error object to state and then trying to call `.filter()` on it.

**Solution:** 
- Check if response is an array BEFORE setting state
- Always initialize state with empty arrays on error
- Add defensive checks before calling array methods

## Files Modified

### `/src/pages/PostRaceAnalysis.jsx`

**Changes:**
1. Added 401 error detection with clear message
2. Validate data is array before setting `activities` state
3. Set empty arrays on error to prevent crashes
4. Added array check in `detectPotentialRaces()` function
5. Only process race tags and analyses if data is valid array

**Key Code:**
```javascript
// Check response status
if (!response.ok) {
  if (response.status === 401) {
    throw new Error('Your Strava session has expired. Please refresh the page or log in again.');
  }
  throw new Error('Failed to fetch activities');
}

// Validate before setting state
if (Array.isArray(data)) {
  setActivities(data);
} else {
  console.error('Data is not an array:', data);
  setActivities([]);
  throw new Error('Invalid data format received');
}

// Always set empty arrays on error
catch (error) {
  console.error('Error loading activities:', error);
  setActivities([]);
  setRaceActivities([]);
}

// Defensive check before filtering
const detectPotentialRaces = () => {
  if (!Array.isArray(activities)) {
    console.error('Activities is not an array:', activities);
    return [];
  }
  return activities.filter(activity => { ... });
};
```

### `/src/pages/RaceAnalytics.jsx`

**Changes:**
1. Added 401 error detection with clear message
2. Validate data is array before using it
3. Set empty races array on error
4. Added array check before filtering activities

**Key Code:**
```javascript
// Check response status
if (!response.ok) {
  if (response.status === 401) {
    throw new Error('Your Strava session has expired. Please refresh the page or log in again.');
  }
  throw new Error('Failed to fetch activities');
}

// Validate before using
if (!Array.isArray(allActivities)) {
  console.error('allActivities is not an array:', allActivities);
  setRaces([]);
  setLoading(false);
  return;
}

// Always set empty array on error
catch (error) {
  console.error('Error loading race data:', error);
  setRaces([]);
}
```

## Error Handling Pattern

The fix implements a consistent error handling pattern:

1. **Check HTTP status** - Detect 401 errors before parsing response
2. **Validate data type** - Ensure response is an array before using it
3. **Set safe defaults** - Always set empty arrays on error
4. **Defensive programming** - Check array type before calling array methods
5. **User-friendly messages** - Clear error messages for token expiration

## Testing Checklist

- [ ] Navigate to Race Analysis page with expired token
- [ ] Navigate to Race Analytics page with expired token
- [ ] Verify error messages appear instead of crashes
- [ ] Verify empty state displays correctly
- [ ] Test with valid tokens and cached data
- [ ] Test with valid tokens and fresh API calls
- [ ] Verify race tagging still works
- [ ] Verify race filtering works correctly

## Prevention

To prevent similar issues in the future:

1. **Always validate API responses** before setting state
2. **Initialize state with safe defaults** (empty arrays, not null)
3. **Check array types** before calling array methods
4. **Handle 401 errors explicitly** in all Strava API calls
5. **Consider implementing** a centralized API error handler

## Related Issues

This fix addresses the error logs showing:
- `GET /api/strava/activities 401 (Unauthorized)`
- `TypeError: data.filter is not a function`
- `TypeError: activities.filter is not a function`
- App crashes in PostRaceAnalysis and RaceAnalytics components
