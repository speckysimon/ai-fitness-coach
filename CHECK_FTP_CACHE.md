# Check FTP in Cache

Run this in your browser console:

```javascript
// Check what FTP is stored in cache
const cachedMetrics = localStorage.getItem('cached_metrics');
const metrics = JSON.parse(cachedMetrics);
console.log('Cached metrics:', metrics);
console.log('FTP value:', metrics?.ftp);

// Check manual FTP override
const manualFTP = localStorage.getItem('manual_ftp');
console.log('Manual FTP:', manualFTP);

// Check user profile
const userProfile = localStorage.getItem('current_user');
const profile = JSON.parse(userProfile);
console.log('User profile:', {
  weight: profile?.weight,
  height: profile?.height
});
```

## Expected Output

If FTP is being calculated:
- `metrics.ftp` should be a number (e.g., 250)

If FTP is null:
- `metrics.ftp` will be `null`
- This means the backend calculation is failing

## Next Step

Based on the output, we'll know if:
1. FTP is calculated but not displaying (frontend issue)
2. FTP is not being calculated (backend issue)
3. User profile weight/height is missing (W/kg and BMI issue)
