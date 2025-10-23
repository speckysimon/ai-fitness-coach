# Post-Race Analysis Implementation Guide

## ✅ What's Been Implemented

### 1. Backend API Endpoints (`server/routes/race.js`)
- ✅ `POST /api/race/analysis/feedback` - Submit post-race feedback
- ✅ `POST /api/race/analysis/generate` - Generate AI analysis using GPT-4

### 2. Frontend Component (`src/pages/PostRaceAnalysis.jsx`)
- ✅ Race activity detection and listing
- ✅ Auto-detect potential races based on intensity
- ✅ Post-race feedback form (5-star rating, plan adherence, what went well/didn't, lessons, placement)
- ✅ AI analysis generation with loading states
- ✅ Beautiful analysis display with scores (overall, pacing, execution, tactical)
- ✅ Detailed breakdown: assessment, what worked, what didn't, insights, recommendations, training focus
- ✅ localStorage integration for storing analyses

## 🚧 Still Needs Implementation

### 1. Add Route to App.jsx
```javascript
// In src/App.jsx, add import:
import PostRaceAnalysis from './pages/PostRaceAnalysis';

// Add route in the protected routes section:
<Route
  path="/race-analysis"
  element={
    <PostRaceAnalysis
      stravaTokens={stravaTokens}
    />
  }
/>
```

### 2. Add to Navigation Menu
```javascript
// In src/components/Layout.jsx, add to navigation array:
{ name: 'Race Analysis', href: '/race-analysis', icon: Trophy },
```

### 3. Integrate Race History into Training Plan Generation

**File: `src/pages/PlanGenerator.jsx`**

Add function to load race history:
```javascript
const loadRaceHistory = () => {
  const storedAnalyses = localStorage.getItem('race_analyses');
  if (!storedAnalyses) return [];
  
  const analyses = JSON.parse(storedAnalyses);
  
  // Convert to array and sort by date (most recent first)
  return Object.entries(analyses)
    .map(([activityId, analysis]) => ({
      activityId,
      ...analysis
    }))
    .sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate))
    .slice(0, 3); // Last 3 races
};
```

Update `generatePlan` function to include race history:
```javascript
const generatePlan = async (skipConfirmation = false) => {
  // ... existing code ...
  
  // NEW: Load race history
  const raceHistory = loadRaceHistory();
  const latestRace = raceHistory[0];
  
  const response = await fetch('/api/training/plan/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      activities,
      goals: { ... },
      constraints: { ... },
      userProfile,
      athleteMetrics: { ... },
      
      // NEW: Include race history
      raceHistory: raceHistory.map(race => ({
        date: race.activityDate,
        performanceScore: race.performanceScore,
        pacingScore: race.pacingScore,
        executionScore: race.executionScore,
        tacticalScore: race.tacticalScore,
        whatWentWell: race.whatWentWell,
        whatDidntGoWell: race.whatDidntGoWell,
        trainingFocus: race.trainingFocus,
        recommendations: race.recommendations
      })),
      
      // NEW: Training priorities from latest race
      trainingPriorities: latestRace ? {
        primary: latestRace.trainingFocus[0],
        weaknesses: latestRace.whatDidntGoWell.slice(0, 3),
        strengths: latestRace.whatWentWell.slice(0, 3),
        pacingScore: latestRace.pacingScore
      } : null
    }),
  });
  
  // ... rest of code ...
};
```

### 4. Update AI Training Plan Generation

**File: `server/services/aiPlannerService.js`**

Update the `generateTrainingPlan` method to include race context:

```javascript
async generateTrainingPlan(data) {
  const { raceHistory, trainingPriorities, ... } = data;
  
  let raceContext = '';
  
  if (raceHistory && raceHistory.length > 0) {
    const latestRace = raceHistory[0];
    
    raceContext = `
RECENT RACE PERFORMANCE:
- Date: ${latestRace.date}
- Performance Score: ${latestRace.performanceScore}/100
- Pacing Score: ${latestRace.pacingScore}/100 ${latestRace.pacingScore < 75 ? '⚠️ NEEDS IMPROVEMENT' : '✅'}
- Execution Score: ${latestRace.executionScore}/100
- Tactical Score: ${latestRace.tacticalScore}/100

KEY LEARNINGS FROM RACE:
Strengths Confirmed:
${latestRace.whatWentWell.slice(0, 3).map(item => `- ${item}`).join('\n')}

Areas Needing Improvement:
${latestRace.whatDidntGoWell.slice(0, 3).map(item => `- ${item}`).join('\n')}

TRAINING PRIORITIES (from race analysis):
${latestRace.trainingFocus.map(focus => `- ${focus}`).join('\n')}

IMPORTANT INSTRUCTIONS:
1. Design this training plan to specifically address the weaknesses identified in the race analysis
2. Include sessions that target the training focus areas above
3. Maintain and build on confirmed strengths
4. If pacing score was low (< 75), include race simulation sessions with conservative pacing practice
5. Reference the race learnings in session descriptions to help the athlete understand why each session matters

Example session description: "Threshold Endurance Builder - Based on your recent race, you faded in the final 20km. This session builds late-race endurance at 90-95% FTP."
`;
  }
  
  const prompt = `
You are an expert cycling coach creating a personalized training plan.

${raceContext}

ATHLETE PROFILE:
... (existing athlete data)

Generate a training plan that:
1. Addresses identified weaknesses from recent races
2. Maintains confirmed strengths
3. Includes specific sessions for race learnings
4. Progressively builds toward next race
5. References race analysis in session descriptions when relevant

... (rest of prompt)
`;
  
  // ... rest of AI call ...
}
```

### 5. Show Race Context in Plan Generation UI

**File: `src/pages/PlanGenerator.jsx`**

Add visual indicator that plan is using race data:

```javascript
// After loading race history, before form:
{raceHistory.length > 0 && (
  <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
    <CardContent className="pt-6">
      <div className="flex items-start gap-3">
        <Brain className="w-6 h-6 text-purple-600 mt-0.5" />
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">
            AI Will Use Your Race Data
          </h3>
          <p className="text-gray-700 mb-3">
            Your training plan will be customized based on your recent race performance:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Addressing pacing issues (Score: {latestRace.pacingScore}/100)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Building on your strengths: {latestRace.whatWentWell[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Focus: {latestRace.trainingFocus[0]}</span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

### 6. Add Coach Notes Referencing Race Analysis

After plan generation, add a coach note:

```javascript
// In generatePlan, after receiving plan from API:
if (raceHistory.length > 0) {
  const latestRace = raceHistory[0];
  const raceNote = {
    message: `This plan has been customized based on your recent race analysis. Key focus: ${latestRace.trainingFocus[0]}. We're addressing your pacing (${latestRace.pacingScore}/100) and building on your strength in ${latestRace.whatWentWell[0]}.`,
    timestamp: new Date().toISOString(),
    type: 'Race Integration'
  };
  
  planWithDates.coachNotes = [raceNote, ...(planWithDates.coachNotes || [])];
}
```

## 📊 Data Flow

```
1. Athlete completes race
   ↓
2. Marks activity as race in PostRaceAnalysis page
   ↓
3. Submits feedback form (2 min)
   ↓
4. AI generates analysis (GPT-4)
   ↓
5. Analysis stored in localStorage (race_analyses)
   ↓
6. Athlete generates new training plan
   ↓
7. PlanGenerator loads race history from localStorage
   ↓
8. Sends race data to AI with plan generation request
   ↓
9. AI creates customized plan addressing race weaknesses
   ↓
10. Plan includes session descriptions referencing race learnings
   ↓
11. Athlete trains with race-informed plan
   ↓
12. Next race: Improved performance!
```

## 🎯 User Experience Flow

### Flow 1: Post-Race Analysis
1. Navigate to "Race Analysis" in menu
2. See list of potential races (auto-detected)
3. Click "Mark as Race" on relevant activity
4. Click "Analyze Race"
5. Fill out 2-minute feedback form
6. Click "Generate AI Analysis"
7. View comprehensive analysis with scores
8. Click "Generate Training Plan" to create race-informed plan

### Flow 2: Training Plan Generation
1. Navigate to "AI Coach" (Plan Generator)
2. See notification: "AI Will Use Your Race Data"
3. Fill out plan form
4. Click "Generate Plan"
5. AI creates plan addressing race weaknesses
6. See coach note explaining race integration
7. View sessions with race-specific descriptions

## 🔧 Testing Checklist

- [ ] Can mark activity as race
- [ ] Feedback form saves data
- [ ] AI analysis generates successfully
- [ ] Analysis displays with correct scores
- [ ] Analysis stores in localStorage
- [ ] Plan generator loads race history
- [ ] Plan generation includes race context
- [ ] AI creates race-informed sessions
- [ ] Coach notes reference race analysis
- [ ] Session descriptions mention race learnings

## 📝 Next Steps

1. Add route and navigation (5 min)
2. Integrate race history into PlanGenerator (15 min)
3. Update AI prompt in aiPlannerService (10 min)
4. Add visual indicators in UI (10 min)
5. Test complete flow (15 min)

**Total Time: ~1 hour**

## 🚀 Future Enhancements

- Database storage instead of localStorage
- Race comparison tool
- Historical trends chart
- Export analysis as PDF
- Share analysis on social media
- Team race analysis (for club feature)
- Race prediction based on historical data
- Automatic race detection improvements
