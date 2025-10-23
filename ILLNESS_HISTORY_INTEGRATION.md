# Illness/Injury History Integration - Implementation Summary

## ✅ Feature Implemented

The Training Plan Generator now automatically detects and incorporates recorded illness/injury history when creating new training plans.

## 🎯 Key Features

### 1. **Automatic History Loading**
- Fetches illness/injury history from `/api/adaptation/history` on component mount
- Stores in component state for use during plan generation
- No user action required - happens automatically

### 2. **Visual Health History Indicator**
A prominent green-themed card displays when illness/injury history is detected:

**Features:**
- ✓ Shows total number of recorded health events
- Displays up to 3 most relevant events with details:
  - Category (e.g., Illness, Injury)
  - Severity level
  - Date range (start → end)
  - User notes (if provided)
- **"Recent" badge** for events within last 30 days (orange highlight)
- Shows count of additional events if more than 3 exist
- Full light/dark theme support

**Visual Design:**
- Light: `bg-green-50` with `border-green-200`
- Dark: `bg-green-950/30` with `border-green-800`
- Recent events: Orange accent to draw attention
- CheckCircle icon for positive confirmation

### 3. **Backend Integration**
Illness history is now included in the plan generation API request:

```javascript
{
  activities,
  goals: { ... },
  constraints: { ... },
  userProfile,
  illnessHistory // NEW - array of health events
}
```

### 4. **Smart UI Updates**
- Removed "Recent injuries or health concerns" from AI context helpful prompts
- Added "Preferred training style or philosophy" instead
- Prevents duplicate information entry

## 🔧 Technical Implementation

### State Management
```javascript
const [illnessHistory, setIllnessHistory] = useState([]);
```

### Data Loading
```javascript
const loadIllnessHistory = async () => {
  try {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) return;

    const response = await fetch('/api/adaptation/history', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });

    if (response.ok) {
      const data = await response.json();
      setIllnessHistory(data.events || []);
    }
  } catch (error) {
    console.error('Error loading illness history:', error);
  }
};
```

### Visual Indicator Component
```jsx
{illnessHistory.length > 0 && (
  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg">
    {/* Health history display */}
  </div>
)}
```

## 📊 Data Structure

### Illness History Event Object
```javascript
{
  id: number,
  category: string,        // "Illness", "Injury", etc.
  severity: string,        // "Mild", "Moderate", "Severe"
  start_date: string,      // ISO date
  end_date: string | null, // ISO date or null if ongoing
  notes: string | null,    // User notes
  created_at: string,
  updated_at: string
}
```

## 🎨 UI/UX Benefits

### 1. **Transparency**
Users can see exactly what health data the AI is considering, building trust in the system.

### 2. **Prevents Duplication**
Visual indicator prevents users from re-entering illness information in the AI context box.

### 3. **Recent Event Awareness**
Orange "Recent" badge highlights events within 30 days, showing the AI will be extra cautious.

### 4. **System Integration**
Demonstrates that the app is an integrated system, not isolated features.

### 5. **Peace of Mind**
Users with injury history can see the AI is aware and will create safer plans.

## 🚀 Backend Recommendations

The backend `/api/training/plan/generate` endpoint should use illness history to:

### 1. **Adjust Training Load**
```javascript
// If recent injury (< 30 days), reduce initial load
if (hasRecentInjury) {
  initialWeeklyTSS *= 0.7; // 30% reduction
  rampRate *= 0.8; // Slower progression
}
```

### 2. **Add Recovery Time**
```javascript
// More recovery sessions for injury history
if (illnessHistory.some(e => e.category === 'Injury')) {
  recoverySessionsPerWeek += 1;
}
```

### 3. **Modify Intensity Distribution**
```javascript
// Less high-intensity work if recently ill
if (hasRecentIllness) {
  vo2MaxPercentage *= 0.5;
  endurancePercentage *= 1.2;
}
```

### 4. **AI Prompt Enhancement**
```javascript
const healthContext = illnessHistory.length > 0 ? `
Health History (${illnessHistory.length} events):
${illnessHistory.map(event => {
  const isRecent = event.end_date && 
    (new Date() - new Date(event.end_date)) < (30 * 24 * 60 * 60 * 1000);
  
  return `- ${event.category} (${event.severity})${isRecent ? ' [RECENT]' : ''}
    Dates: ${event.start_date} to ${event.end_date || 'ongoing'}
    ${event.notes ? `Notes: ${event.notes}` : ''}`;
}).join('\n')}

IMPORTANT: Consider this health history when creating the plan.
${illnessHistory.some(e => isRecent(e)) ? 
  'User has RECENT health events - be conservative with training load and progression.' : 
  'Be mindful of past health issues when designing high-intensity sessions.'}
` : '';
```

### 5. **Specific Adaptations**
- **Recent injury**: Longer warm-ups, more mobility work
- **Recurring issues**: Avoid session types that may aggravate
- **Severe events**: Extended base-building phase
- **Multiple events**: Focus on consistency over intensity

## 📋 Example User Experience

### Scenario: User with Recent Knee Injury

**What User Sees:**
```
✓ Health History Detected

Your AI coach is aware of 2 recorded health events and will 
create a safer, more personalized plan.

┌─────────────────────────────────────────┐
│ Knee Injury - Moderate          Recent  │
│ Jan 15, 2025 → Feb 10, 2025            │
│ "Patellar tendinitis, need gradual     │
│  return to training"                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Cold/Flu - Mild                         │
│ Dec 1, 2024 → Dec 7, 2024              │
└─────────────────────────────────────────┘
```

**What AI Receives:**
```json
{
  "illnessHistory": [
    {
      "category": "Injury",
      "severity": "Moderate",
      "start_date": "2025-01-15",
      "end_date": "2025-02-10",
      "notes": "Patellar tendinitis, need gradual return to training"
    },
    {
      "category": "Illness",
      "severity": "Mild",
      "start_date": "2024-12-01",
      "end_date": "2024-12-07",
      "notes": null
    }
  ]
}
```

**What AI Does:**
- Reduces initial weekly TSS by 30%
- Adds extra recovery days
- Includes more low-intensity endurance work
- Slower progression rate (4-6 weeks base building)
- Adds warm-up/cool-down emphasis
- Avoids high-torque intervals initially

## ✅ Testing Checklist

- [x] Illness history loads on component mount
- [x] Visual indicator displays when history exists
- [x] No indicator shown when no history
- [x] Recent events (< 30 days) show orange badge
- [x] Event details display correctly
- [x] "Ongoing" shown for events without end date
- [x] Notes display when present
- [x] Shows "+ X more events" when > 3 events
- [x] Light theme styling correct
- [x] Dark theme styling correct
- [x] illnessHistory included in API payload
- [x] Helpful prompts updated (removed injury mention)
- [ ] Backend uses illness history in plan generation
- [ ] Plan is more conservative with recent injuries
- [ ] Plan includes appropriate recovery for illness history

## 🎯 Future Enhancements

### Phase 2
1. **Clickable events** - Click to see full details or edit
2. **Filter by severity** - Only show moderate/severe events
3. **Time-based filtering** - Only show events from last 6 months
4. **Add event button** - Quick link to log new illness/injury

### Phase 3
1. **Injury-specific adaptations** - Different plans for knee vs shoulder
2. **Recovery timeline** - Show expected return-to-training timeline
3. **Progress tracking** - Track how plan adapts as recovery progresses
4. **Preventive suggestions** - AI suggests exercises to prevent recurrence

## 📝 User Documentation

### How It Works
"When you generate a new training plan, the AI automatically reviews your recorded illness and injury history. This ensures your plan is tailored to your specific health situation, with appropriate recovery time and conservative progression if you've had recent setbacks."

### Why It Matters
"Training plans that don't account for injury history can lead to re-injury or overtraining. By automatically incorporating your health history, we create safer, more sustainable plans that help you reach your goals while protecting your long-term health."

### What You Should Do
"Continue logging any illnesses or injuries using the 'Log Illness/Injury' button on the dashboard. The more information you provide, the better your AI coach can personalize your training plan."
