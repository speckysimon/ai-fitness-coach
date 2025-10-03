# Real-Time Race Execution Mode - MVP Specification

**Status:** Planning Phase  
**Target Version:** v2.1.0  
**Estimated Timeline:** 2-3 weeks  
**Priority:** High (Unique Differentiator)

---

## 🎯 Vision

Enable riders to execute races with AI-generated pacing strategies loaded directly onto their bike computers, with post-race analysis to close the learning loop.

---

## 📋 MVP Scope

### What We're Building

**Enhanced Pre-Race Planning System** that:
1. Generates detailed, segment-by-segment race plans
2. Exports to bike computer formats (.FIT, .ERG, .ZWO)
3. Provides post-race analysis comparing plan vs reality
4. Creates a continuous improvement loop

### What We're NOT Building (Yet)

- ❌ Live GPS tracking during race
- ❌ Real-time plan adjustments
- ❌ Mobile app with audio cues
- ❌ Bike computer native apps
- ❌ Smartwatch integration

---

## 🎯 Core Features

### Feature 1: Enhanced Race Plan Generation

**Current State:**
- AI generates text-based race plan
- General pacing advice
- No structured segments

**Enhanced Version:**
- **Segment-based breakdown** of entire race
- Each segment includes:
  - Distance range (km X-Y)
  - Duration estimate
  - Terrain type (flat, climb, descent, rolling)
  - Power target (watts)
  - Heart rate zone
  - Cadence recommendation
  - Pacing strategy ("Start easy, finish strong")
  - Nutrition cues ("Eat gel at km 20")
  - Tactical notes

**Example Output:**
```
Segment 1: Km 0-15 (Flat Approach)
- Duration: 22-24 minutes
- Terrain: Flat, slight tailwind
- Power Target: 220W (72% FTP) - Zone 2
- HR Zone: 2 (140-155 bpm)
- Cadence: 85-95 rpm
- Strategy: Start conservative, find your rhythm
- Nutrition: Sip water every 5 minutes
- Notes: Stay in the pack, don't chase early attacks

Segment 2: Km 15-23 (Main Climb)
- Duration: 28-32 minutes
- Terrain: 8km climb, 6% average, max 12%
- Power Target: 240W (80% FTP) - Zone 3
- HR Zone: 3 (155-165 bpm)
- Cadence: 70-80 rpm (lower on steep sections)
- Strategy: Steady effort, don't surge
- Nutrition: Gel at km 20
- Notes: This is the decisive climb, pace yourself
```

---

### Feature 2: Workout File Export

**Formats to Support:**

#### 2a. Garmin .FIT File
- Most common format
- Works with: Garmin Edge, Forerunner, Fenix
- Structured workout with power/HR targets
- Auto-advances through segments

#### 2b. Wahoo .ERG File
- Wahoo ELEMNT format
- Power-based workout
- Compatible with Wahoo ecosystem

#### 2c. TrainingPeaks .ZWO File
- Zwift workout format
- Also works with TrainingPeaks
- XML-based, easy to generate

#### 2d. PDF Cue Sheet
- Printable backup
- Old-school race reference
- Works when technology fails
- Fits in jersey pocket

**Technical Requirements:**
- Generate files server-side
- Downloadable from race plan page
- Include race metadata (name, date, distance)
- Validate file format before download

---

### Feature 3: Race Day Checklist

**Pre-Race Preparation:**
- [ ] Equipment checklist (bike, wheels, computer, sensors)
- [ ] Nutrition plan with timing
- [ ] Hydration strategy
- [ ] Weather forecast and adjustments
- [ ] Warm-up protocol (20-30 min routine)
- [ ] Mental preparation notes
- [ ] Emergency contact info
- [ ] Course preview notes

**Generated Automatically:**
- Weather-adjusted clothing recommendations
- Tire pressure suggestions based on conditions
- Nutrition timing based on race duration
- Warm-up routine based on event type

---

### Feature 4: Post-Race Analysis

**After Race Upload:**
1. Rider completes race
2. Strava auto-syncs activity
3. System detects race completion
4. AI analyzes: Planned vs Actual

**Analysis Includes:**

#### Segment-by-Segment Comparison
- Planned power vs Actual power
- Planned time vs Actual time
- Deviation analysis
- Energy expenditure comparison

#### Performance Insights
- "You went 15W too hard on Climb 2 - this cost you 2 minutes in the final"
- "Perfect pacing on the descent - well executed"
- "Faded in final 10km - possible nutrition issue?"
- "Started too conservatively - had 20W left at finish"

#### Learning Points
- What worked well
- What to adjust next time
- Rider profile updates
- FTP validation/adjustment

#### Visual Comparison
- Power chart: Planned (line) vs Actual (area)
- Elevation profile with segment markers
- HR comparison
- Pace/speed analysis

---

## 🎨 User Interface

### Race Plan Page Enhancements

**New Sections:**

1. **Plan Overview**
   - Race summary
   - Total distance, elevation, estimated time
   - Weather forecast
   - Key challenges

2. **Segment Breakdown** (Expandable)
   - Visual timeline
   - Each segment as card
   - Color-coded by intensity
   - Click to expand details

3. **Export Options**
   - Download .FIT (Garmin)
   - Download .ERG (Wahoo)
   - Download .ZWO (TrainingPeaks)
   - Download PDF (Printable)
   - Copy to Calendar

4. **Race Day Checklist**
   - Interactive checklist
   - Save completion state
   - Print option

5. **Nutrition Plan**
   - Timeline view
   - What to eat/drink and when
   - Calorie/carb calculations

---

## 🔧 Technical Implementation

### Backend Changes

#### New API Endpoints

```javascript
// Enhanced race plan generation
POST /api/race/plan/enhanced
- Input: GPX file, rider profile, race date
- Output: Structured plan with segments

// Workout file generation
GET /api/race/plan/:planId/export/fit
GET /api/race/plan/:planId/export/erg
GET /api/race/plan/:planId/export/zwo
GET /api/race/plan/:planId/export/pdf

// Post-race analysis
POST /api/race/analysis
- Input: planId, stravaActivityId
- Output: Comparison analysis with insights
```

#### New Services

```javascript
// services/workoutFileGenerator.js
- generateFIT(plan)
- generateERG(plan)
- generateZWO(plan)
- generatePDF(plan)

// services/raceAnalysisService.js
- compareToPlannedPower(plan, activity)
- generateInsights(comparison)
- updateRiderProfile(insights)
```

#### Database Schema

```sql
-- Enhanced race plans table
CREATE TABLE race_plans (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  name TEXT,
  race_date TEXT,
  gpx_data TEXT,
  segments JSON,  -- Structured segment data
  nutrition_plan JSON,
  checklist JSON,
  created_at DATETIME,
  updated_at DATETIME
);

-- Race results table
CREATE TABLE race_results (
  id INTEGER PRIMARY KEY,
  plan_id INTEGER,
  strava_activity_id TEXT,
  analysis JSON,  -- AI-generated insights
  completed_at DATETIME
);
```

### Frontend Changes

#### New Components

```javascript
// components/RacePlanSegments.jsx
- Visual segment timeline
- Expandable segment cards
- Power/HR zone indicators

// components/WorkoutExport.jsx
- Export buttons for each format
- Download handling
- Format explanations

// components/RaceChecklist.jsx
- Interactive checklist
- Progress tracking
- Print view

// components/RaceAnalysis.jsx
- Planned vs Actual charts
- Insight cards
- Performance metrics
```

---

## 📊 User Flow

### Pre-Race Flow

1. **Upload GPX** (existing)
2. **Generate Enhanced Plan** (new)
   - AI analyzes terrain
   - Creates segment breakdown
   - Generates nutrition plan
   - Creates checklist
3. **Review Plan**
   - Read through segments
   - Adjust if needed
   - Note key points
4. **Export to Bike Computer**
   - Choose format (.FIT for Garmin)
   - Download file
   - Upload to device
5. **Print Backup**
   - Download PDF
   - Print cue sheet
   - Pack in jersey pocket

### Race Day Flow

1. **Pre-Race Review**
   - Quick glance at plan on phone
   - Check weather updates
   - Review checklist
2. **Execute Race**
   - Follow bike computer workout
   - Targets auto-display
   - No phone interaction
3. **Post-Race**
   - Activity auto-syncs to Strava
   - System detects completion
   - Notification: "Analysis ready!"

### Post-Race Flow

1. **View Analysis**
   - See planned vs actual comparison
   - Read AI insights
   - Review performance
2. **Learn & Improve**
   - Note what worked
   - Update profile if needed
   - Apply to next race

---

## 🎯 Success Metrics

### User Engagement
- % of race plans exported to bike computer
- % of riders who complete post-race analysis
- Time spent reviewing race plans

### Feature Adoption
- Number of .FIT downloads
- Number of post-race analyses generated
- Repeat usage rate

### User Satisfaction
- "This helped me execute my race" - feedback
- Race result improvements over time
- Feature request alignment

---

## 🚀 Differentiation

### Competitive Analysis

**TrainingPeaks:**
- ❌ No GPX analysis
- ❌ Manual workout creation
- ✅ Workout export
- ❌ No AI

**Best Bike Split:**
- ✅ Race pacing calculator
- ❌ No AI adaptation
- ❌ No post-race analysis
- ❌ No learning loop

**Strava:**
- ❌ No race planning
- ✅ Activity tracking
- ❌ No structured workouts
- ❌ No AI

**Our Advantage:**
- ✅ AI-generated race plans
- ✅ GPX → Structured workout
- ✅ Bike computer export
- ✅ Post-race learning loop
- ✅ Weather integration
- ✅ Nutrition planning
- ✅ Continuous improvement

**Unique Value Prop:**
"The only platform that analyzes your race route with AI, generates a structured workout for your bike computer, and learns from your results."

---

## 📝 Implementation Phases

### Phase 1: Enhanced Plan Generation (Week 1)
- [ ] Update AI prompts for segment breakdown
- [ ] Create segment data structure
- [ ] Build segment display UI
- [ ] Add nutrition plan generation
- [ ] Create race checklist

### Phase 2: Workout Export (Week 2)
- [ ] Research .FIT file format
- [ ] Build .FIT generator
- [ ] Build .ERG generator
- [ ] Build .ZWO generator
- [ ] Build PDF generator
- [ ] Add download UI
- [ ] Test with actual bike computers

### Phase 3: Post-Race Analysis (Week 3)
- [ ] Build Strava activity comparison
- [ ] Create analysis algorithms
- [ ] Generate AI insights
- [ ] Build comparison UI
- [ ] Add learning loop
- [ ] Test with real race data

### Phase 4: Polish & Testing (Week 4)
- [ ] User testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Marketing materials
- [ ] Launch

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 2 Features
- Live tracking for coaches/spectators
- Mid-race adjustment suggestions
- Real-time weather updates
- Group race coordination

### Phase 3 Features
- Native bike computer apps
- Garmin Connect IQ app
- Wahoo ELEMNT integration
- Real-time AI coaching

### Phase 4 Features
- Voice commands
- Smartwatch companion
- Team race strategies
- Coach mode

---

## 📚 Resources Needed

### Technical
- .FIT file format documentation
- Garmin SDK (for testing)
- Wahoo API docs
- PDF generation library (jsPDF)

### Testing
- Access to Garmin bike computer
- Access to Wahoo device
- Test GPX files
- Real race data for validation

### Design
- Segment timeline UI mockups
- Export button designs
- Analysis dashboard layout
- Mobile-responsive views

---

## ⚠️ Risks & Mitigations

### Risk 1: File Format Compatibility
- **Risk:** Generated files don't work on all devices
- **Mitigation:** Test with multiple bike computers, provide fallback PDF

### Risk 2: AI Plan Quality
- **Risk:** Generated segments don't make sense
- **Mitigation:** Manual review option, user feedback loop

### Risk 3: Strava API Limits
- **Risk:** Can't fetch activity data for analysis
- **Mitigation:** Already have activity data from sync, use cached data

### Risk 4: User Adoption
- **Risk:** Users don't understand how to use exported files
- **Mitigation:** Clear documentation, video tutorials, step-by-step guides

---

## 📄 Related Documents

- `ROADMAP.md` - Overall product roadmap
- `API_DOCS.md` - API documentation
- `ARCHITECTURE.md` - System architecture

---

**Last Updated:** October 3, 2025  
**Next Review:** After MVP completion  
**Owner:** Development Team
