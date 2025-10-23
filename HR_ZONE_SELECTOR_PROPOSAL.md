# HR Zone Selector - Research & Implementation Proposal

**Date:** October 19, 2025  
**Status:** Proposal  
**Priority:** Medium

---

## 📚 Research Summary

### Overview of HR Zone Models

Heart rate training zones are used to target specific physiological adaptations. Different models exist based on training philosophy and scientific research.

---

## 🎯 The Three Main Models

### 1. **3-Zone Model (Polarized Training)**
**Origin:** Dr. Stephen Seiler's research on elite endurance athletes  
**Philosophy:** 80/20 rule - 80% easy, 20% hard, minimal "grey zone" training  
**Best For:** Endurance athletes, marathon runners, long-distance cyclists

| Zone | Name | % FTHR | % Max HR | Description | Training Focus |
|------|------|--------|----------|-------------|----------------|
| **Z1** | Low Intensity | 50-82% | 60-75% | Easy, conversational pace | Aerobic base, recovery, fat adaptation |
| **Z2** | Moderate | 82-87% | 75-85% | Tempo, "grey zone" - MINIMIZE | Lactate threshold work (sparingly) |
| **Z3** | High Intensity | 87-105% | 85-100% | Hard intervals, races | VO2max, anaerobic capacity |

**Key Principle:** Avoid Zone 2 (the "grey zone") - it's too hard to build base, too easy to improve top-end fitness.

**Scientific Backing:**
- Seiler & Kjerland (2006) - "Quantifying training intensity distribution in elite endurance athletes"
- Stöggl & Sperlich (2014) - "Polarized training has greater impact on key endurance variables"

---

### 2. **5-Zone Model (Coggan/Friel) - CURRENT**
**Origin:** Dr. Andrew Coggan (power zones) adapted for HR by Joe Friel  
**Philosophy:** Granular zones for specific training adaptations  
**Best For:** Structured training, periodization, varied workouts

| Zone | Name | % FTHR | Description | Purpose | Color |
|------|------|--------|-------------|---------|-------|
| **Z1** | Active Recovery | 50-60% | Very easy, full conversation | Recovery, warm-up/cool-down | 🟢 Green |
| **Z2** | Endurance | 60-75% | Comfortable, can talk easily | Aerobic base, fat burning | 🔵 Blue |
| **Z3** | Tempo | 75-87% | Moderately hard, short sentences | Muscular endurance, lactate clearance | 🟡 Yellow |
| **Z4** | Threshold | 87-95% | Hard, difficult to speak | Lactate threshold, race pace | 🟠 Orange |
| **Z5** | VO2 Max | 95-105% | Very hard, 3-8 min max | VO2max development, intervals | 🔴 Red |

**Key Principle:** Each zone targets a specific energy system and adaptation.

**Scientific Backing:**
- Coggan's Training and Racing with a Power Meter
- Friel's Training Bible series
- Widely adopted by TrainingPeaks, Strava, Garmin

---

### 3. **7-Zone Model (British Cycling)**
**Origin:** British Cycling coaching methodology  
**Philosophy:** Maximum granularity for elite athletes and coaches  
**Best For:** Advanced athletes, professional coaching, race-specific training

| Zone | Name | % FTHR | % Max HR | Description | Purpose |
|------|------|--------|----------|-------------|---------|
| **Z1** | Active Recovery | 50-60% | 50-60% | Very easy | Recovery only |
| **Z2** | Endurance | 60-70% | 60-70% | Easy aerobic | Base building |
| **Z3** | Tempo | 70-83% | 70-80% | Moderate aerobic | Aerobic development |
| **Z4** | Threshold | 83-94% | 80-90% | Lactate threshold | Sustainable hard effort |
| **Z5** | VO2 Max | 94-105% | 90-95% | Maximal aerobic | VO2max intervals |
| **Z6** | Anaerobic Capacity | 105-120% | 95-100% | Anaerobic | Short, hard efforts |
| **Z7** | Neuromuscular | Max effort | Max | All-out sprints | Power, sprint mechanics |

**Key Principle:** Fine-tuned control for specific race demands and periodization phases.

**Scientific Backing:**
- British Cycling Level 2 & 3 coaching manuals
- Used by Team GB Olympic cyclists
- Based on lactate testing protocols

---

## 🎨 Visual Comparison

```
3-ZONE (Polarized)
├─ Z1 (Easy) ████████████████████████████████████████ 80% of training
├─ Z2 (Moderate) ████ 5% of training (minimize!)
└─ Z3 (Hard) ████████ 15% of training

5-ZONE (Coggan/Friel) - CURRENT
├─ Z1 (Recovery) ████████
├─ Z2 (Endurance) ████████████████████
├─ Z3 (Tempo) ████████
├─ Z4 (Threshold) ████
└─ Z5 (VO2 Max) ██

7-ZONE (British Cycling)
├─ Z1 (Recovery) ████
├─ Z2 (Endurance) ████████
├─ Z3 (Tempo) ████████
├─ Z4 (Threshold) ████
├─ Z5 (VO2 Max) ██
├─ Z6 (Anaerobic) █
└─ Z7 (Neuromuscular) █
```

---

## 💡 Recommendation

**Default:** Keep **5-Zone Model** as default (current implementation)

**Why?**
1. ✅ Most widely recognized (Strava, Garmin, TrainingPeaks all use 5 zones)
2. ✅ Good balance between simplicity and granularity
3. ✅ Works well for recreational to advanced athletes
4. ✅ Already implemented and tested
5. ✅ Familiar to most users

**Add Options:**
- **3-Zone** for polarized training enthusiasts
- **7-Zone** for advanced/elite athletes

---

## 🛠️ Implementation Plan

### Phase 1: Backend Updates

#### 1.1 Update `fthrService.js`

Add methods for each zone model:

```javascript
class FTHRService {
  // Existing 5-zone method (keep as default)
  calculateHRZones(fthr) { /* current implementation */ }

  // New: 3-zone polarized model
  calculateHRZones3(fthr) {
    return {
      zone1: {
        name: 'Low Intensity (Easy)',
        min: Math.round(fthr * 0.50),
        max: Math.round(fthr * 0.82),
        percentage: '50-82% FTHR',
        description: 'Easy, conversational pace. Build aerobic base.',
        color: '#22c55e', // green
        purpose: 'Aerobic base, recovery, fat adaptation',
        trainingTime: '~80% of total training volume'
      },
      zone2: {
        name: 'Moderate (Grey Zone)',
        min: Math.round(fthr * 0.82),
        max: Math.round(fthr * 0.87),
        percentage: '82-87% FTHR',
        description: 'Tempo effort. MINIMIZE time here.',
        color: '#eab308', // yellow
        purpose: 'Lactate threshold (use sparingly)',
        trainingTime: '~5% of total training volume'
      },
      zone3: {
        name: 'High Intensity (Hard)',
        min: Math.round(fthr * 0.87),
        max: Math.round(fthr * 1.05),
        percentage: '87-105% FTHR',
        description: 'Hard intervals and races.',
        color: '#ef4444', // red
        purpose: 'VO2max, anaerobic capacity, race efforts',
        trainingTime: '~15% of total training volume'
      }
    };
  }

  // New: 7-zone British Cycling model
  calculateHRZones7(fthr, maxHR = null) {
    // If maxHR not provided, estimate as fthr / 0.95
    const estimatedMaxHR = maxHR || Math.round(fthr / 0.95);
    
    return {
      zone1: {
        name: 'Active Recovery',
        min: Math.round(fthr * 0.50),
        max: Math.round(fthr * 0.60),
        percentage: '50-60% FTHR',
        description: 'Very easy recovery only.',
        color: '#86efac', // green-300
        purpose: 'Recovery rides, active rest'
      },
      zone2: {
        name: 'Endurance',
        min: Math.round(fthr * 0.60),
        max: Math.round(fthr * 0.70),
        percentage: '60-70% FTHR',
        description: 'Easy aerobic base building.',
        color: '#22c55e', // green-500
        purpose: 'Aerobic base, long steady rides'
      },
      zone3: {
        name: 'Tempo',
        min: Math.round(fthr * 0.70),
        max: Math.round(fthr * 0.83),
        percentage: '70-83% FTHR',
        description: 'Moderate aerobic development.',
        color: '#3b82f6', // blue-500
        purpose: 'Aerobic development, sweetspot'
      },
      zone4: {
        name: 'Threshold',
        min: Math.round(fthr * 0.83),
        max: Math.round(fthr * 0.94),
        percentage: '83-94% FTHR',
        description: 'Lactate threshold, sustainable hard.',
        color: '#eab308', // yellow-500
        purpose: 'Lactate threshold, race pace'
      },
      zone5: {
        name: 'VO2 Max',
        min: Math.round(fthr * 0.94),
        max: Math.round(fthr * 1.05),
        percentage: '94-105% FTHR',
        description: 'Maximal aerobic, 3-8 min efforts.',
        color: '#f97316', // orange-500
        purpose: 'VO2max intervals'
      },
      zone6: {
        name: 'Anaerobic Capacity',
        min: Math.round(fthr * 1.05),
        max: Math.round(estimatedMaxHR * 0.98),
        percentage: '105-120% FTHR',
        description: 'Short, very hard efforts.',
        color: '#ef4444', // red-500
        purpose: 'Anaerobic capacity, 30s-3min'
      },
      zone7: {
        name: 'Neuromuscular',
        min: Math.round(estimatedMaxHR * 0.98),
        max: estimatedMaxHR,
        percentage: 'Max effort',
        description: 'All-out sprints, <30 seconds.',
        color: '#991b1b', // red-800
        purpose: 'Sprint power, neuromuscular'
      }
    };
  }

  // New: Calculate zones based on selected model
  calculateHRZonesByModel(fthr, model = '5-zone', maxHR = null) {
    switch(model) {
      case '3-zone':
        return this.calculateHRZones3(fthr);
      case '5-zone':
        return this.calculateHRZones(fthr); // existing method
      case '7-zone':
        return this.calculateHRZones7(fthr, maxHR);
      default:
        return this.calculateHRZones(fthr);
    }
  }
}
```

#### 1.2 Update API Endpoint

Modify `/api/analytics/fthr` to accept zone model parameter:

```javascript
// server/routes/analytics.js
router.post('/fthr', async (req, res) => {
  const { activities, manualFTHR, zoneModel = '5-zone', maxHR = null } = req.body;
  
  const result = fthrService.calculateFTHR(activities, manualFTHR);
  
  if (result.fthr) {
    result.zones = fthrService.calculateHRZonesByModel(
      result.fthr, 
      zoneModel,
      maxHR
    );
    result.zoneModel = zoneModel; // Return which model was used
  }
  
  res.json(result);
});
```

---

### Phase 2: Frontend Updates

#### 2.1 Add Zone Model Selector to Rider Profile

```jsx
// src/pages/RiderProfile.jsx

const [zoneModel, setZoneModel] = useState('5-zone'); // Default to 5-zone
const [maxHR, setMaxHR] = useState(''); // Optional for 7-zone

// Load preference from localStorage
useEffect(() => {
  const savedZoneModel = localStorage.getItem('hr_zone_model');
  if (savedZoneModel) {
    setZoneModel(savedZoneModel);
  }
  
  const savedMaxHR = localStorage.getItem('max_hr');
  if (savedMaxHR) {
    setMaxHR(savedMaxHR);
  }
}, []);

// Update calculateFTHR to use selected model
const calculateFTHR = async (acts, manual) => {
  try {
    const manualValue = manual && !isNaN(parseInt(manual)) ? parseInt(manual) : null;
    const maxHRValue = maxHR && !isNaN(parseInt(maxHR)) ? parseInt(maxHR) : null;
    
    const response = await fetch('/api/analytics/fthr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        activities: acts,
        manualFTHR: manualValue,
        zoneModel: zoneModel,
        maxHR: maxHRValue
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      setFthr(data.fthr);
      setHrZones(data.zones);
    }
  } catch (error) {
    console.error('Error calculating FTHR:', error);
  }
};

// Handle zone model change
const handleZoneModelChange = (newModel) => {
  setZoneModel(newModel);
  localStorage.setItem('hr_zone_model', newModel);
  
  // Recalculate zones with new model
  if (activities.length > 0) {
    calculateFTHR(activities, manualFTHR);
  }
};
```

#### 2.2 UI Component for Zone Selector

Add selector above HR Zones card:

```jsx
{/* Zone Model Selector */}
<div className="mb-4 flex items-center justify-between">
  <div>
    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 block">
      HR Zone Model
    </label>
    <select
      value={zoneModel}
      onChange={(e) => handleZoneModelChange(e.target.value)}
      className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="3-zone">3-Zone (Polarized Training)</option>
      <option value="5-zone">5-Zone (Coggan/Friel) - Recommended</option>
      <option value="7-zone">7-Zone (British Cycling)</option>
    </select>
  </div>
  
  {/* Info button to explain models */}
  <button
    onClick={() => setShowZoneInfoModal(true)}
    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
  >
    <Info className="w-5 h-5" />
  </button>
</div>

{/* Optional: Max HR input for 7-zone model */}
{zoneModel === '7-zone' && (
  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
    <label className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 block">
      Max HR (Optional for 7-Zone)
    </label>
    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
      For more accurate Zone 6 & 7 calculations. Leave blank to estimate from FTHR.
    </p>
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={maxHR}
        onChange={(e) => {
          setMaxHR(e.target.value);
          if (e.target.value) {
            localStorage.setItem('max_hr', e.target.value);
          } else {
            localStorage.removeItem('max_hr');
          }
        }}
        placeholder="e.g., 190"
        min="140"
        max="220"
        className="w-32 px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-foreground rounded-lg"
      />
      <span className="text-sm text-blue-700 dark:text-blue-300">BPM</span>
    </div>
  </div>
)}
```

#### 2.3 Zone Info Modal

Create modal to explain each model:

```jsx
{showZoneInfoModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          HR Zone Models Explained
        </h2>
        <button onClick={() => setShowZoneInfoModal(false)}>
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        {/* 3-Zone Model */}
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="text-xl font-bold mb-2">3-Zone (Polarized Training)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Based on Dr. Stephen Seiler's research on elite endurance athletes.
          </p>
          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg mb-3">
            <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
              80/20 Rule: 80% easy, 20% hard
            </p>
            <p className="text-sm text-green-800 dark:text-green-200">
              Minimize time in the "grey zone" (Zone 2) - it's too hard to build base, too easy to improve fitness.
            </p>
          </div>
          <p className="text-sm"><strong>Best for:</strong> Endurance athletes, marathon runners, long-distance cyclists</p>
        </div>

        {/* 5-Zone Model */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-xl font-bold mb-2">5-Zone (Coggan/Friel) ⭐ Recommended</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Adapted from Dr. Andrew Coggan's power zones by Joe Friel.
          </p>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg mb-3">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Most widely used model
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Each zone targets a specific energy system. Good balance between simplicity and granularity.
            </p>
          </div>
          <p className="text-sm"><strong>Best for:</strong> Most athletes, structured training, periodization</p>
        </div>

        {/* 7-Zone Model */}
        <div className="border-l-4 border-red-500 pl-4">
          <h3 className="text-xl font-bold mb-2">7-Zone (British Cycling)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Used by British Cycling and Team GB Olympic cyclists.
          </p>
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg mb-3">
            <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Maximum granularity for elite athletes
            </p>
            <p className="text-sm text-red-800 dark:text-red-200">
              Fine-tuned control for specific race demands. Includes anaerobic and neuromuscular zones.
            </p>
          </div>
          <p className="text-sm"><strong>Best for:</strong> Advanced/elite athletes, professional coaching</p>
        </div>
      </div>
    </div>
  </div>
)}
```

---

### Phase 3: Dynamic Zone Visualization

Update the HR Zones card to handle variable number of zones:

```jsx
<div className="space-y-3">
  {Object.entries(hrZones).map(([zoneKey, zone], index, allEntries) => {
    const zoneNumber = parseInt(zoneKey.replace('zone', ''));
    const allZones = allEntries.map(([, z]) => z);
    const minHR = Math.min(...allZones.map(z => z.min));
    const maxHR = Math.max(...allZones.map(z => z.max));
    const totalRange = maxHR - minHR;
    const startPercent = ((zone.min - minHR) / totalRange) * 100;
    const widthPercent = ((zone.max - zone.min) / totalRange) * 100;
    
    return (
      <div 
        key={zoneKey} 
        className="p-3 rounded-lg border-l-4"
        style={{ 
          backgroundColor: zone.color + '20', // 20% opacity
          borderLeftColor: zone.color
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: zone.color }}>
              Zone {zoneNumber}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {zone.name}
            </span>
          </div>
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
            {zone.min}-{zone.max} BPM
          </span>
        </div>
        
        {/* Zone bar */}
        <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
          <div 
            className="h-3 rounded-full transition-all absolute"
            style={{ 
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
              backgroundColor: zone.color
            }}
          />
        </div>
        
        {/* Description */}
        <p className="text-xs text-gray-600 dark:text-gray-400">{zone.description}</p>
        
        {/* Training time recommendation (for 3-zone only) */}
        {zone.trainingTime && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
            💡 {zone.trainingTime}
          </p>
        )}
      </div>
    );
  })}
</div>
```

---

## 📊 User Experience Flow

1. **User visits Rider Profile page**
   - Sees HR Zones with default 5-zone model
   - Dropdown selector above zones

2. **User selects different model**
   - Dropdown changes to "3-Zone" or "7-Zone"
   - Zones instantly recalculate and re-render
   - Preference saved to localStorage

3. **User clicks info icon**
   - Modal opens explaining each model
   - Shows which model is best for their goals
   - Can close and return to page

4. **For 7-zone users (optional)**
   - Input field appears for Max HR
   - If provided, zones 6 & 7 are more accurate
   - If not provided, estimated from FTHR

---

## ✅ Success Criteria

- [ ] Backend supports all 3 zone models
- [ ] API accepts `zoneModel` parameter
- [ ] Frontend dropdown selector works
- [ ] Zones recalculate on model change
- [ ] Preference persists in localStorage
- [ ] Info modal explains each model
- [ ] Max HR input for 7-zone model
- [ ] Visualization adapts to zone count (3, 5, or 7)
- [ ] Colors remain correct across models
- [ ] Dark mode support
- [ ] Mobile responsive

---

## 🚀 Rollout Plan

### Week 1: Backend
- [ ] Implement `calculateHRZones3()` method
- [ ] Implement `calculateHRZones7()` method
- [ ] Add `calculateHRZonesByModel()` wrapper
- [ ] Update API endpoint to accept parameters
- [ ] Test all 3 models with sample FTHR values

### Week 2: Frontend
- [ ] Add zone model selector dropdown
- [ ] Add state management for zone model
- [ ] Add localStorage persistence
- [ ] Update `calculateFTHR()` to pass model
- [ ] Test zone switching

### Week 3: Polish
- [ ] Create zone info modal
- [ ] Add Max HR input for 7-zone
- [ ] Ensure visualization works for all models
- [ ] Add tooltips and help text
- [ ] Mobile testing

### Week 4: Documentation & Launch
- [ ] Update user documentation
- [ ] Add in-app tutorial/tooltip
- [ ] Beta test with users
- [ ] Launch feature
- [ ] Monitor feedback

---

## 📚 References

1. **Seiler, S., & Kjerland, G. Ø. (2006).** "Quantifying training intensity distribution in elite endurance athletes: is there evidence for an 'optimal' distribution?" *Scandinavian Journal of Medicine & Science in Sports*, 16(1), 49-56.

2. **Stöggl, T., & Sperlich, B. (2014).** "Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training." *Frontiers in Physiology*, 5, 33.

3. **Coggan, A. R., & Allen, H. (2010).** *Training and Racing with a Power Meter*. VeloPress.

4. **Friel, J. (2018).** *The Cyclist's Training Bible*. VeloPress.

5. **British Cycling.** Level 2 & 3 Coaching Manuals. https://www.britishcycling.org.uk/coaching

6. **Mujika, I., & Padilla, S. (2003).** "Scientific bases for precompetition tapering strategies." *Medicine & Science in Sports & Exercise*, 35(7), 1182-1187.

---

## 💬 User Feedback Questions

After implementation, gather feedback:

1. Which zone model do you prefer and why?
2. Does the 3-zone model help you stick to easy/hard training?
3. Do you find 7 zones too complex or just right?
4. Is the info modal helpful in choosing a model?
5. Would you like to see training time distribution by zone?

---

**End of Proposal**
