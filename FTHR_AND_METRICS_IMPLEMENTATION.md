# FTHR & Enhanced Athlete Metrics Implementation

## ✅ Complete Implementation Summary

### Overview
Successfully implemented FTHR (Functional Threshold Heart Rate) calculation and comprehensive athlete metrics integration into the training plan generation system. The AI now has access to both power AND heart rate data for more complete fitness assessment.

---

## 🎯 New Features Implemented

### 1. **FTHR Calculation Service** (`/server/services/fthrService.js`)

**What it does:**
- Calculates Functional Threshold Heart Rate from 6 weeks of activity data
- Generates 5-zone HR training system
- Analyzes HR trends and efficiency
- Provides confidence levels based on data quality

**Calculation Methods:**
1. **High Confidence**: Uses 3+ hard efforts (20-60 min at >85% max HR)
2. **Medium Confidence**: Uses 1-2 hard efforts
3. **Low Confidence**: Estimates from observed max HR

**FTHR Formula:**
- Hard efforts: `FTHR = avgTopHR × 0.96`
- Max HR estimate: `FTHR = maxHR × 0.87`

### 2. **HR Training Zones** (5-Zone Model)

Based on calculated FTHR, similar to Coggan's power zones:

| Zone | Name | Range | Purpose |
|------|------|-------|---------|
| Z1 | Active Recovery | 50-60% FTHR | Recovery, warm-up/cool-down |
| Z2 | Endurance | 60-75% FTHR | Aerobic base, fat burning |
| Z3 | Tempo | 75-87% FTHR | Muscular endurance |
| Z4 | Threshold | 87-95% FTHR | Lactate threshold, race pace |
| Z5 | VO2 Max | 95-105% FTHR | VO2 max development |

**Each zone includes:**
- BPM range (min/max)
- Percentage of FTHR
- Description of effort level
- Training purpose
- Color coding for UI

### 3. **API Endpoints** (`/server/routes/analytics.js`)

**New Endpoints:**
- `POST /api/analytics/fthr` - Calculate FTHR and zones
- `POST /api/analytics/hr-trends` - Analyze HR trends

**Request:**
```json
{
  "activities": [...]
}
```

**Response:**
```json
{
  "fthr": 165,
  "confidence": "high",
  "method": "hard_efforts",
  "zones": {
    "zone1": { "name": "Active Recovery", "min": 83, "max": 99, ... },
    "zone2": { "name": "Endurance", "min": 99, "max": 124, ... },
    ...
  },
  "recentActivities": 15,
  "hardEffortsFound": 5
}
```

### 4. **Enhanced Athlete Metrics Display**

**Purple-themed visual indicator** showing:

**Metrics Displayed:**
- ✅ **FTP** (Functional Threshold Power) - in Watts
- ✅ **FTHR** (Functional Threshold Heart Rate) - in BPM
- ✅ **Power-to-Weight Ratio** - W/kg (calculated)
- ✅ **BMI** (Body Mass Index) - calculated from height/weight
- ✅ **HR Training Zones** - All 5 zones with color coding

**Visual Features:**
- Grid layout (2 cols mobile, 4 cols desktop)
- Individual metric cards with labels
- HR zones displayed in expandable section
- Color-coded zones matching training intensity
- Full light/dark theme support

### 5. **Complete Data Integration**

**Data now passed to plan generation API:**

```javascript
{
  activities: [...],
  goals: { ... },
  constraints: { ... },
  userProfile: { ... },
  illnessHistory: [...],
  athleteMetrics: {
    ftp: 250,                    // Watts
    fthr: 165,                   // BPM
    hrZones: { zone1: {...}, ... },
    bmi: 22.5,                   // Calculated
    powerToWeight: 3.57,         // W/kg - Calculated
    weight: 70,                  // kg
    height: 175,                 // cm
    age: 35,
    gender: "male"
  }
}
```

---

## 🔧 Technical Implementation Details

### Frontend Changes (`PlanGenerator.jsx`)

**New State Variables:**
```javascript
const [fthr, setFthr] = useState(null);
const [hrZones, setHrZones] = useState(null);
```

**Data Loading:**
```javascript
// Calculate FTHR and HR zones
const fthrResponse = await fetch('/api/analytics/fthr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ activities: data }),
});
const fthrData = await fthrResponse.json();
setFthr(fthrData.fthr);
setHrZones(fthrData.zones);
```

**Metric Calculations:**
```javascript
const bmi = userProfile?.weight && userProfile?.height 
  ? (userProfile.weight / ((userProfile.height / 100) ** 2))
  : null;

const powerToWeight = ftp && userProfile?.weight
  ? (ftp / userProfile.weight)
  : null;
```

### Backend Service (`fthrService.js`)

**Key Methods:**
- `calculateFTHR(activities)` - Main FTHR calculation
- `calculateHRZones(fthr)` - Generate 5-zone system
- `getZoneForHeartRate(hr, zones)` - Determine zone for given HR
- `analyzeHRTrends(activities, fthr)` - Trend analysis
- `estimateMaxHR(activity, age)` - Max HR estimation

**Data Requirements:**
- Activities with `avgHeartRate` field
- At least 20 minutes duration
- From last 6 weeks

---

## 📊 Why This Matters

### Power vs Heart Rate

**Power (FTP):**
- ✅ Instant response
- ✅ Not affected by fatigue, heat, or stress
- ✅ Precise for intervals
- ❌ Requires power meter ($$$)
- ❌ Only tells mechanical output

**Heart Rate (FTHR):**
- ✅ Available to everyone (cheap HR monitors)
- ✅ Shows cardiovascular fitness
- ✅ Indicates fatigue and recovery state
- ✅ Reveals heat stress and illness
- ❌ Lag time (10-30 seconds)
- ❌ Affected by many factors

**Together = Complete Picture:**
- Power shows what you're doing
- HR shows how hard your body is working
- Decoupling (rising HR at same power) = fatigue
- Lower HR at same power = improved fitness

### Training Applications

**AI can now:**
1. **Detect fitness improvements** - Lower HR at same power
2. **Identify overtraining** - Elevated resting HR, HR drift
3. **Adjust for conditions** - High HR in heat = reduce targets
4. **Personalize zones** - Some athletes are "high HR" or "low HR"
5. **Monitor recovery** - HR variability and trends
6. **Create safer plans** - Respect cardiovascular limits

---

## 🎨 UI/UX Benefits

### 1. **Transparency**
Users see exactly what metrics the AI is using:
- FTP for power-based training
- FTHR for HR-based training
- Power-to-weight for climbing ability
- BMI for general health context

### 2. **Education**
HR zones display teaches users:
- What each zone feels like
- BPM ranges for their fitness level
- Purpose of each training zone
- How to train effectively

### 3. **Confidence**
Visual indicators show:
- ✓ System has analyzed their data
- ✓ Plan is personalized to their fitness
- ✓ Both power AND HR considered
- ✓ Integrated, intelligent system

### 4. **Prevents Duplication**
Users won't enter metrics in AI context box because they can see the system already has them.

---

## 🚀 Backend Recommendations

### How to Use Athlete Metrics in Plan Generation

**1. Adjust Training Intensity**
```javascript
// Beginner: < 2.5 W/kg
// Intermediate: 2.5-3.5 W/kg
// Advanced: 3.5-4.5 W/kg
// Elite: > 4.5 W/kg

if (athleteMetrics.powerToWeight < 2.5) {
  // More base building, less intensity
  zone2Percentage = 70%;
  vo2MaxPercentage = 5%;
} else if (athleteMetrics.powerToWeight > 4.0) {
  // Can handle more intensity
  zone2Percentage = 50%;
  vo2MaxPercentage = 15%;
}
```

**2. Use HR Zones for Non-Power Users**
```javascript
if (!athleteMetrics.ftp && athleteMetrics.fthr) {
  // Create HR-based plan instead of power-based
  sessionTargets = {
    recovery: `${hrZones.zone1.min}-${hrZones.zone1.max} bpm`,
    endurance: `${hrZones.zone2.min}-${hrZones.zone2.max} bpm`,
    tempo: `${hrZones.zone3.min}-${hrZones.zone3.max} bpm`,
    threshold: `${hrZones.zone4.min}-${hrZones.zone4.max} bpm`
  };
}
```

**3. Adjust for Age**
```javascript
if (athleteMetrics.age > 50) {
  // More recovery time
  recoveryDaysPerWeek += 1;
  // Longer warm-ups
  warmupDuration *= 1.5;
}
```

**4. Consider BMI for Volume**
```javascript
if (athleteMetrics.bmi > 27) {
  // Reduce impact activities
  runningPercentage *= 0.5;
  // More cycling, swimming
  cyclingPercentage *= 1.3;
}
```

**5. AI Prompt Enhancement**
```javascript
const metricsContext = `
Athlete Performance Metrics:
- FTP: ${athleteMetrics.ftp}W (${athleteMetrics.powerToWeight} W/kg)
- FTHR: ${athleteMetrics.fthr} bpm
- Age: ${athleteMetrics.age} years
- BMI: ${athleteMetrics.bmi}

HR Training Zones:
${Object.entries(athleteMetrics.hrZones).map(([key, zone]) => 
  `- ${zone.name}: ${zone.min}-${zone.max} bpm (${zone.percentage})`
).join('\n')}

Create a plan that:
1. Uses both power and HR targets
2. Respects the athlete's current fitness level (${athleteMetrics.powerToWeight} W/kg)
3. Provides HR zones for users without power meters
4. Adjusts volume/intensity for age: ${athleteMetrics.age}
`;
```

---

## 📋 Example User Experience

### Scenario: Intermediate Cyclist

**User Profile:**
- Age: 38
- Weight: 72 kg
- Height: 178 cm

**Calculated Metrics:**
- FTP: 260W
- FTHR: 168 bpm
- Power/Weight: 3.61 W/kg
- BMI: 22.7

**What User Sees:**

```
┌─────────────────────────────────────────────────────┐
│ ✓ Athlete Metrics Detected                          │
│                                                      │
│ Your AI coach has analyzed your performance data    │
│ to create a plan matched to your current fitness.   │
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│ │ FTP      │ │ FTHR     │ │ Power/   │ │ BMI     ││
│ │ 260W     │ │ 168 bpm  │ │ Weight   │ │ 22.7    ││
│ │ Power    │ │ HR       │ │ 3.61 W/kg│ │ Body    ││
│ │ Threshold│ │ Threshold│ │          │ │ Mass    ││
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                      │
│ 💓 HR Training Zones (based on 6-week FTHR)        │
│ ┌────────────────────────────────────────────────┐ │
│ │ Z1 - Active Recovery  │ 84-101 bpm │ 50-60%   │ │
│ │ Z2 - Endurance        │ 101-126 bpm│ 60-75%   │ │
│ │ Z3 - Tempo            │ 126-146 bpm│ 75-87%   │ │
│ │ Z4 - Threshold        │ 146-160 bpm│ 87-95%   │ │
│ │ Z5 - VO2 Max          │ 160-176 bpm│ 95-105%  │ │
│ └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**What AI Receives:**
- Intermediate level (3.61 W/kg)
- Can handle moderate intensity
- HR zones for non-power workouts
- Age-appropriate recovery
- Healthy BMI

**Plan Generated:**
- 60% Zone 2 (endurance base)
- 20% Zone 3 (tempo)
- 15% Zone 4 (threshold)
- 5% Zone 5 (VO2 max)
- Mix of power and HR targets
- Age-appropriate recovery days

---

## ✅ Testing Checklist

- [x] FTHR service calculates correctly
- [x] HR zones generated properly
- [x] API endpoints return correct data
- [x] Frontend loads FTHR on mount
- [x] Metrics display shows FTP
- [x] Metrics display shows FTHR
- [x] Power-to-weight calculated correctly
- [x] BMI calculated correctly
- [x] HR zones display with colors
- [x] Light theme styling correct
- [x] Dark theme styling correct
- [x] athleteMetrics included in API payload
- [ ] Backend uses metrics in plan generation
- [ ] Plans include HR-based targets
- [ ] Plans adjust for power-to-weight ratio
- [ ] Plans consider age appropriately

---

## 🎯 Future Enhancements

### Phase 2
1. **Resting HR tracking** - Morning HR trends
2. **HR variability (HRV)** - Recovery indicator
3. **HR efficiency trends** - Fitness improvements over time
4. **Decoupling analysis** - HR drift during long rides

### Phase 3
1. **Lactate threshold testing** - Guided test protocols
2. **Max HR testing** - Safe max HR determination
3. **HR-based TSS** - For users without power
4. **Recovery recommendations** - Based on HR trends

### Phase 4
1. **Real-time HR monitoring** - During workouts
2. **Adaptive targets** - Adjust zones based on conditions
3. **Fatigue detection** - Elevated resting HR alerts
4. **Illness prediction** - HR anomaly detection

---

## 📝 Documentation for Users

### What is FTHR?
"Functional Threshold Heart Rate (FTHR) is the highest heart rate you can sustain for approximately 60 minutes. It's similar to FTP but for heart rate, and helps us create training zones that match your cardiovascular fitness."

### Why Both Power and HR?
"Power tells us what you're doing. Heart rate tells us how hard your body is working. Together, they give a complete picture of your fitness and help us create safer, more effective training plans."

### How We Calculate Your FTHR
"We analyze your last 6 weeks of activities to find hard efforts (20-60 minutes at high intensity). Your FTHR is calculated from the average heart rate of your best sustained efforts. The more hard workouts you do, the more accurate your FTHR becomes."

### Your HR Training Zones
"Based on your FTHR, we've created 5 training zones. Each zone has a specific purpose:
- **Zone 1 (Recovery)**: Easy spinning, conversation pace
- **Zone 2 (Endurance)**: Comfortable, can talk in sentences
- **Zone 3 (Tempo)**: Moderately hard, short sentences only
- **Zone 4 (Threshold)**: Hard, difficult to talk
- **Zone 5 (VO2 Max)**: Very hard, can't sustain conversation"

---

## 🎉 Summary

This implementation provides a **complete fitness assessment** combining:
- ✅ Power metrics (FTP, W/kg)
- ✅ Heart rate metrics (FTHR, zones)
- ✅ Body composition (BMI)
- ✅ Age and gender considerations
- ✅ Visual transparency for users
- ✅ Comprehensive data for AI

The AI now has everything needed to create truly personalized, safe, and effective training plans that respect both mechanical output (power) and physiological stress (heart rate).
