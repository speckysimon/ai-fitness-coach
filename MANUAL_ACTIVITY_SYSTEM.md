# Manual Activity Input System

## Overview

The manual activity system allows users to log activities that aren't tracked in Strava, such as gym workouts, yoga sessions, strength training, and other cross-training activities. These manual activities are fully integrated with the existing activity matching and AI plan adjustment features.

## Features

### Sport Categories

The system supports 14 sport types across 5 categories:

**Cycling:**
- Cycling - Road
- Cycling - MTB
- Cycling - Indoor

**Running:**
- Running - Road
- Running - Trail
- Running - Treadmill

**Swimming:**
- Swimming - Pool
- Swimming - Open Water

**Strength & Flexibility:**
- Strength Training
- Yoga
- Pilates
- Stretching

**Other:**
- Cross Training
- Other

### Intensity Levels

6 intensity levels with descriptions:
- **Recovery**: Very easy, conversational
- **Easy**: Comfortable, sustainable
- **Moderate**: Steady effort
- **Hard**: Challenging, focused
- **Very Hard**: Near maximum effort
- **Maximum**: All-out effort

### Data Captured

**Required Fields:**
- Activity date
- Activity name
- Sport type
- Duration (minutes)
- Intensity level

**Optional Fields:**
- Distance (km)
- Perceived exertion (RPE 1-10)
- Average heart rate (bpm)
- Calories burned
- Elevation gain (meters)
- Location
- Indoor/outdoor flag
- Notes

### Automatic TSS Calculation

The system automatically calculates Training Stress Score (TSS) based on:
1. **Duration**: Longer activities = higher TSS
2. **Sport type multiplier**: Different sports have different training loads
3. **Intensity factor**: Higher intensity = exponentially higher TSS
4. **Perceived exertion**: RPE adjusts TSS by ±30%

**Formula:**
```
TSS = (duration_hours × intensity_factor² × 100 × sport_multiplier) × RPE_adjustment
```

**Example:**
- 60-minute strength training session
- Hard intensity (0.85 factor)
- RPE 7/10
- Sport multiplier: 0.6
- Result: ~35 TSS

## Architecture

### Backend

**Database Table: `manual_activities`**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- activity_date
- sport_type
- activity_name
- duration (minutes)
- distance (km)
- intensity_level
- perceived_exertion (1-10)
- avg_heart_rate
- estimated_tss (auto-calculated)
- calories
- elevation_gain
- notes
- location
- indoor (boolean)
- created_at
- updated_at
```

**API Endpoints:**
- `GET /api/manual-activities/sport-types` - Get sport configurations
- `POST /api/manual-activities` - Create manual activity
- `GET /api/manual-activities` - List activities (with filters)
- `GET /api/manual-activities/:id` - Get single activity
- `PUT /api/manual-activities/:id` - Update activity
- `DELETE /api/manual-activities/:id` - Delete activity
- `GET /api/manual-activities/stats/summary` - Get statistics

**Service Layer:**
- `manualActivityService.js` - Business logic and TSS calculation
- Converts manual activities to Strava-compatible format
- Handles CRUD operations with proper validation

### Frontend

**Components:**
- `ManualActivityModal.jsx` - Input form with real-time TSS estimation
- `manualActivityUtils.js` - Utility functions for merging and managing activities

**Key Functions:**
```javascript
// Fetch manual activities
fetchManualActivities(options)

// Merge with Strava activities
mergeActivities(stravaActivities, manualActivities)

// Convert to Strava format
convertManualToStravaFormat(manualActivity)

// Get recent activities for AI
getRecentActivitiesForAI(activities, days)

// Delete/update manual activities
deleteManualActivity(activityId)
updateManualActivity(activityId, updates)
```

## Integration Points

### 1. Activity Matching System

Manual activities are automatically included in the activity matching algorithm:
- Converted to Strava-compatible format
- Matched to planned sessions based on date, duration, and intensity
- TSS used for training load calculations

### 2. AI Plan Adjustment

The AI coach understands manual activities:
- Recent activities include `[MANUAL]` flag
- Intensity level and RPE provide additional context
- AI considers manual activities when adjusting training plans

**Example AI Context:**
```
RECENT ACTIVITIES:
- 2025-10-28: Morning Ride (90min, 45km, 85 TSS)
- 2025-10-27: Gym Session (60min, 0km, 35 TSS) [MANUAL: Strength Training, Hard intensity, RPE 7/10]
- 2025-10-26: Recovery Spin (45min, 20km, 25 TSS)
```

### 3. Training Load Calculations

Manual activities contribute to:
- Weekly TSS totals
- Training load (CTL/ATL/TSB)
- Volume statistics
- Activity type distribution

## Usage Examples

### Adding a Manual Activity

```javascript
// Open modal
<ManualActivityModal 
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSave={(activity) => {
    // Activity saved, refresh list
    loadActivities();
  }}
/>
```

### Editing an Activity

```javascript
<ManualActivityModal 
  isOpen={showModal}
  editActivity={selectedActivity}
  onClose={() => setShowModal(false)}
  onSave={(activity) => {
    // Activity updated
    loadActivities();
  }}
/>
```

### Merging Activities

```javascript
import { fetchManualActivities, mergeActivities } from '../lib/manualActivityUtils';

// Fetch both sources
const stravaActivities = await fetchStravaActivities();
const manualActivities = await fetchManualActivities();

// Merge and sort by date
const allActivities = mergeActivities(stravaActivities, manualActivities);

// Use in your component
setActivities(allActivities);
```

### Filtering Manual Activities

```javascript
// Get only manual activities from last 30 days
const manualActivities = await fetchManualActivities({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  endDate: new Date().toISOString(),
  limit: 50
});

// Filter by sport type
const strengthSessions = await fetchManualActivities({
  sportType: 'Strength Training'
});
```

## User Experience

### Adding an Activity

1. Click "Add Manual Activity" button
2. Fill in required fields (date, name, sport, duration, intensity)
3. Optionally add distance, HR, RPE, notes
4. See real-time TSS estimation
5. Click "Add Activity"
6. Activity appears in activity list with special icon

### Visual Indicators

- Manual activities show sport-specific emoji icon (💪, 🧘, 🏋️)
- Badge or label identifies manual vs. Strava activities
- Different styling in activity lists
- Hover shows "Manual Activity" tooltip

### AI Understanding

When adjusting plans:
```
User: "I did a gym session yesterday, adjust my plan"

AI sees:
- 2025-10-27: Gym Session (60min, 35 TSS) [MANUAL: Strength Training, Hard intensity, RPE 7/10]

AI responds:
"I see you completed a hard strength training session yesterday (35 TSS). 
I'll reduce today's cycling intensity to allow for recovery..."
```

## Benefits

### For Athletes

1. **Complete Training Picture**: All activities tracked in one place
2. **Accurate Training Load**: TSS includes cross-training
3. **Better AI Adjustments**: AI understands full training context
4. **Flexibility**: Log activities when traveling or without devices
5. **Cross-Training Recognition**: Gym, yoga, etc. count toward training

### For Coaches

1. **Holistic View**: See all athlete activities, not just cycling
2. **Better Recommendations**: AI considers full training load
3. **Recovery Management**: Account for non-cycling stress
4. **Compliance Tracking**: Athletes log all activities

## Future Enhancements

### Potential Features

1. **Activity Templates**: Save common workouts (e.g., "Tuesday Gym Routine")
2. **Bulk Import**: Import from other platforms (Garmin, Apple Health)
3. **Exercise Library**: Pre-defined exercises with TSS estimates
4. **Photos/Videos**: Attach media to manual activities
5. **Workout Builder**: Create structured workouts (sets, reps, rest)
6. **Social Sharing**: Share manual activities with training partners
7. **Integration**: Sync with Google Fit, Apple Health, etc.
8. **Analytics**: Dedicated cross-training analytics dashboard

### Advanced AI Features

1. **Pattern Recognition**: AI learns typical gym routines
2. **Recommendations**: "You haven't done strength training in 2 weeks"
3. **Periodization**: AI suggests when to add cross-training
4. **Recovery Insights**: "Gym session may impact tomorrow's ride"
5. **Goal Tracking**: Track strength/flexibility goals separately

## Migration

### Running the Migration

```bash
cd server
node migrations/run-migrations.js
```

This creates the `manual_activities` table with proper indexes.

### Testing

```bash
# Test API endpoints
curl -X GET http://localhost:5000/api/manual-activities/sport-types

# Create test activity
curl -X POST http://localhost:5000/api/manual-activities \
  -H "Content-Type: application/json" \
  -d '{
    "activityDate": "2025-10-28",
    "activityName": "Morning Gym",
    "sportType": "Strength Training",
    "duration": 60,
    "intensityLevel": "Hard",
    "perceivedExertion": 7
  }'
```

## Files Created

### Backend
- `server/migrations/006_add_manual_activities.js` - Database migration
- `server/services/manualActivityService.js` - Business logic
- `server/routes/manualActivities.js` - API endpoints

### Frontend
- `src/components/ManualActivityModal.jsx` - Input form
- `src/lib/manualActivityUtils.js` - Utility functions

### Documentation
- `MANUAL_ACTIVITY_SYSTEM.md` - This file

## Files Modified

### Backend
- `server/index.js` - Registered manual activity routes

### Frontend
- `server/services/aiPlannerService.js` - AI understands manual activities

## Summary

The manual activity system provides a complete solution for logging non-Strava activities with:
- ✅ 14 sport types across 5 categories
- ✅ Automatic TSS calculation
- ✅ Full CRUD API
- ✅ Beautiful modal UI
- ✅ Strava-compatible format
- ✅ Activity matching integration
- ✅ AI plan adjustment integration
- ✅ Training load calculations
- ✅ Comprehensive documentation

Athletes can now log gym sessions, yoga, strength training, and other activities, and the AI coach will understand and use this information when adjusting training plans.
