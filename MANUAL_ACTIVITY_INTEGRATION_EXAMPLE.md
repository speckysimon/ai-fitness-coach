# Manual Activity Integration Example

## Quick Start: Adding Manual Activity Button to AllActivities Page

Here's how to integrate the manual activity system into the AllActivities page:

### 1. Import Required Components

```javascript
import ManualActivityModal from '../components/ManualActivityModal';
import { fetchManualActivities, mergeActivities } from '../lib/manualActivityUtils';
import { Plus } from 'lucide-react';
```

### 2. Add State Management

```javascript
const [showManualActivityModal, setShowManualActivityModal] = useState(false);
const [manualActivities, setManualActivities] = useState([]);
const [allActivities, setAllActivities] = useState([]); // Combined Strava + Manual
```

### 3. Load Manual Activities

```javascript
// Add this function to load manual activities
const loadManualActivities = async () => {
  try {
    const manual = await fetchManualActivities({
      limit: 100 // Adjust as needed
    });
    setManualActivities(manual);
    
    // Merge with Strava activities
    const merged = mergeActivities(activities, manual);
    setAllActivities(merged);
  } catch (error) {
    console.error('Error loading manual activities:', error);
  }
};

// Call on component mount and after Strava activities load
useEffect(() => {
  if (activities.length > 0) {
    loadManualActivities();
  }
}, [activities]);
```

### 4. Add Button to UI

```javascript
// Add this button near your existing activity controls
<Button
  onClick={() => setShowManualActivityModal(true)}
  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
>
  <Plus className="w-4 h-4 mr-2" />
  Add Manual Activity
</Button>
```

### 5. Add Modal Component

```javascript
// Add this at the end of your component, before the closing tag
<ManualActivityModal
  isOpen={showManualActivityModal}
  onClose={() => setShowManualActivityModal(false)}
  onSave={(activity) => {
    // Refresh activities after saving
    loadManualActivities();
    setShowManualActivityModal(false);
  }}
/>
```

### 6. Update Activity Display

```javascript
// Use allActivities instead of activities for display
{allActivities.map((activity) => (
  <div key={activity.id} className="activity-card">
    {/* Show manual activity indicator */}
    {activity.manual && (
      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
        {activity.icon} Manual
      </span>
    )}
    
    {/* Rest of activity display */}
    <h3>{activity.name}</h3>
    <p>{activity.type}</p>
    {/* ... */}
  </div>
))}
```

## Complete Example: AllActivities.jsx Integration

```javascript
import React, { useState, useEffect } from 'react';
import { Plus, Activity } from 'lucide-react';
import { Button } from '../components/ui/Button';
import ManualActivityModal from '../components/ManualActivityModal';
import { fetchManualActivities, mergeActivities, isManualActivity } from '../lib/manualActivityUtils';

const AllActivities = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]); // Strava activities
  const [manualActivities, setManualActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]); // Combined
  const [showManualActivityModal, setShowManualActivityModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load Strava activities
  useEffect(() => {
    if (stravaTokens) {
      loadStravaActivities();
    }
  }, [stravaTokens]);

  // Load manual activities when Strava activities are loaded
  useEffect(() => {
    if (activities.length >= 0) {
      loadManualActivities();
    }
  }, [activities]);

  const loadStravaActivities = async () => {
    // Your existing Strava loading logic
    try {
      const response = await fetch('/api/strava/activities', {
        headers: {
          'Authorization': `Bearer ${stravaTokens.access_token}`
        }
      });
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Error loading Strava activities:', error);
    }
  };

  const loadManualActivities = async () => {
    try {
      const manual = await fetchManualActivities({ limit: 100 });
      setManualActivities(manual);
      
      // Merge and sort by date
      const merged = mergeActivities(activities, manual);
      setAllActivities(merged);
      setLoading(false);
    } catch (error) {
      console.error('Error loading manual activities:', error);
      setAllActivities(activities); // Fallback to just Strava
      setLoading(false);
    }
  };

  const handleManualActivitySaved = () => {
    // Refresh activities after saving
    loadManualActivities();
    setShowManualActivityModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Activities</h1>
        
        <div className="flex gap-3">
          {/* Add Manual Activity Button */}
          <Button
            onClick={() => setShowManualActivityModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Manual Activity
          </Button>
          
          {/* Your existing buttons */}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
          <p className="text-2xl font-bold">{allActivities.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Strava</p>
          <p className="text-2xl font-bold">{activities.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Manual</p>
          <p className="text-2xl font-bold">{manualActivities.length}</p>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {allActivities.map((activity) => (
          <div 
            key={activity.id}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{activity.name}</h3>
                  
                  {/* Manual Activity Badge */}
                  {isManualActivity(activity) && (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full flex items-center gap-1">
                      {activity.icon} Manual
                    </span>
                  )}
                </div>
                
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{activity.type}</span>
                  <span>{Math.round(activity.duration / 60)} min</span>
                  {activity.distance > 0 && (
                    <span>{(activity.distance / 1000).toFixed(1)} km</span>
                  )}
                  {activity.tss && <span>{activity.tss} TSS</span>}
                </div>
                
                {/* Show intensity for manual activities */}
                {isManualActivity(activity) && activity.intensityLevel && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Intensity: {activity.intensityLevel}
                    </span>
                    {activity.perceivedExertion && (
                      <span className="ml-3 text-gray-600 dark:text-gray-400">
                        RPE: {activity.perceivedExertion}/10
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                {new Date(activity.start_date_local || activity.date).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Activity Modal */}
      <ManualActivityModal
        isOpen={showManualActivityModal}
        onClose={() => setShowManualActivityModal(false)}
        onSave={handleManualActivitySaved}
      />
    </div>
  );
};

export default AllActivities;
```

## Integration with PlanGenerator

To use manual activities in plan adjustments:

```javascript
import { fetchManualActivities, mergeActivities, getRecentActivitiesForAI } from '../lib/manualActivityUtils';

// In your plan adjustment function
const handleAdjustPlan = async (request) => {
  // Load both Strava and manual activities
  const stravaActivities = await loadStravaActivities();
  const manualActivities = await fetchManualActivities({ limit: 50 });
  
  // Merge them
  const allActivities = mergeActivities(stravaActivities, manualActivities);
  
  // Get recent activities for AI (last 14 days)
  const recentForAI = getRecentActivitiesForAI(allActivities, 14);
  
  // Send to AI adjustment endpoint
  const response = await fetch('/api/training/plan/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: currentPlan,
      activities: recentForAI, // Now includes manual activities
      adjustmentRequest: request,
      userDateTime: getCurrentDateTime()
    })
  });
  
  // Handle response...
};
```

## Testing the Integration

1. **Run the migration:**
   ```bash
   cd server
   node migrations/run-migrations.js
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **Test the flow:**
   - Click "Add Manual Activity"
   - Fill in the form (e.g., "Gym Session", Strength Training, 60 min, Hard)
   - See real-time TSS calculation
   - Save the activity
   - Verify it appears in the activity list with a "Manual" badge
   - Try adjusting your training plan mentioning the gym session
   - Verify AI understands it: "I see you did a gym session..."

## Styling Tips

### Manual Activity Badge
```css
.manual-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
```

### Activity Card with Manual Indicator
```javascript
<div className={`activity-card ${activity.manual ? 'border-l-4 border-purple-500' : ''}`}>
  {/* Activity content */}
</div>
```

## Next Steps

1. Add manual activity button to Dashboard
2. Add manual activity button to AllActivities page
3. Show manual activities in training plan view
4. Add edit/delete functionality for manual activities
5. Add activity templates for common workouts
6. Add bulk import from CSV

## Support

For questions or issues, see `MANUAL_ACTIVITY_SYSTEM.md` for complete documentation.
