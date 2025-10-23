# 🎯 Race Analysis TSS & Fatigue Enhancement

**Implemented:** October 21, 2025, 9:03pm  
**Status:** Complete and Ready to Test

---

## 🚀 **What's New**

The AI race analysis now examines **pre-race training load (TSS)** to determine if the athlete was properly rested or carrying fatigue before the race. This creates a **complete picture** of race performance by connecting training, recovery, and race-day execution.

---

## 📊 **Data Collection**

### **Pre-Race Window: 14 Days**
The system now collects all activities from 14 days before the race and calculates:

1. **Total TSS (14 days)** - Overall training load
2. **Average Daily TSS** - Training intensity per day
3. **Week 2 TSS (days 14-8)** - Training block before taper
4. **Week 1 TSS (days 7-1)** - Taper week
5. **Taper Ratio** - Week 1 TSS / Week 2 TSS (ideal: 40-60%)
6. **Individual Activities** - Last 7 days with TSS values

### **Example Data Sent to AI:**
```
PRE-RACE TRAINING LOAD (14 days before race):
- Total TSS (14 days): 850
- Average Daily TSS: 61
- Week 2 TSS (days 14-8): 520
- Week 1 TSS (days 7-1): 330
- Taper Ratio: 63%

Pre-Race Activities:
  7 days before: Long Endurance Ride - 180min, TSS: 180
  6 days before: Recovery Ride - 60min, TSS: 45
  5 days before: Interval Session - 90min, TSS: 120
  4 days before: Rest Day - 0min, TSS: 0
  3 days before: Easy Spin - 45min, TSS: 30
  2 days before: Openers - 30min, TSS: 40
  1 day before: Rest Day - 0min, TSS: 0
```

---

## 🧠 **AI Analysis**

### **What the AI Now Examines:**

1. **Fatigue State Assessment**
   - Was the athlete properly rested?
   - Taper ratio analysis (40-60% is ideal)
   - Training load progression

2. **Taper Quality**
   - Gradual reduction in volume?
   - Intensity maintained?
   - Appropriate rest days?

3. **Freshness Level**
   - Arrived at race fresh or tired?
   - TSS patterns indicate recovery?

4. **Performance Correlation**
   - If performance was poor + high training load → fatigue likely culprit
   - If performance was good + proper taper → taper worked
   - If performance was poor + good taper → other factors (pacing, tactics, nutrition)

5. **Actionable Recommendations**
   - Better taper strategy for next race
   - Optimal TSS targets for race week
   - Recovery protocols

---

## 💡 **Example AI Insights**

### **Scenario 1: Poor Taper**
```
"Hey Simon, looking at your training load, you came into this race carrying 
some fatigue. Your taper ratio was 75% (ideal is 40-60%), meaning you didn't 
reduce volume enough in the final week. This likely contributed to the heavy 
legs you felt in the second half."

What Didn't Go Well:
• Carried too much fatigue - taper ratio 75% vs ideal 50%
• Heavy training load right up to race week
• Insufficient recovery before race day

Recommendations:
• Reduce final week volume to 40-50% of previous week
• Include 2 full rest days in race week
• Do short "opener" workout 2 days before race
```

### **Scenario 2: Good Taper**
```
"Nice work Simon! Your taper was spot-on with a 48% ratio - you arrived 
fresh and it showed in your performance. The gradual reduction from 520 TSS 
to 330 TSS gave your body time to absorb the training and peak for race day."

What Went Well:
• Perfect taper - 48% ratio, arrived fresh
• Smart training load management before race
• Well-rested legs showed in strong finish
```

### **Scenario 3: Overtraining**
```
"Simon, I'm seeing a pattern here. Your average daily TSS was 95 in the 
two weeks before the race - that's quite high for a taper period. Combined 
with the poor pacing, this suggests you were running on empty by the time 
the race started."

Key Insights:
• Pre-race fatigue likely impacted performance significantly
• High training stress (95 TSS/day) prevented proper recovery
• Body wasn't fresh enough to execute race plan effectively
```

---

## 🔧 **Technical Implementation**

### **Frontend Changes** (`src/pages/PostRaceAnalysis.jsx`)

1. **Added TSS Calculation Function**
```javascript
const calculateTSS = (activity, ftp) => {
  // Power-based (most accurate)
  if (activity.normalizedPower && ftp) {
    const intensityFactor = activity.normalizedPower / ftp;
    return Math.round(durationHours * intensityFactor * intensityFactor * 100);
  }
  // HR-based fallback
  // Duration-based fallback
}
```

2. **Pre-Race Activity Collection**
```javascript
// Get activities from 14 days before race
const preRaceActivities = activities
  .filter(activity => {
    const activityDate = new Date(activity.date);
    return activityDate >= fourteenDaysBefore && activityDate < raceDate;
  })
  .map(activity => ({
    date, name, type, duration, distance,
    avgPower, normalizedPower, avgHeartRate,
    tss: calculateTSS(activity, ftp)
  }))
  .sort((a, b) => new Date(a.date) - new Date(b.date));
```

3. **Send to Backend**
```javascript
body: JSON.stringify({
  raceActivity: { ...selectedActivity, tss: calculateTSS(...) },
  racePlan,
  riderProfile,
  feedback,
  preRaceActivities  // NEW!
})
```

### **Backend Changes** (`server/routes/race.js`)

1. **Accept Pre-Race Activities**
```javascript
const { 
  raceActivity, 
  racePlan, 
  riderProfile, 
  feedback,
  preRaceActivities  // NEW!
} = req.body;
```

2. **Calculate Training Load Metrics**
```javascript
const totalTSS = preRaceActivities.reduce((sum, a) => sum + (a.tss || 0), 0);
const avgDailyTSS = totalTSS / 14;
const lastWeekTSS = /* activities from last 7 days */;
const secondWeekTSS = totalTSS - lastWeekTSS;
const taperRatio = (lastWeekTSS / secondWeekTSS * 100);
```

3. **Enhanced AI Prompt**
```javascript
prompt += `PRE-RACE TRAINING LOAD (14 days before race):
- Total TSS (14 days): ${totalTSS}
- Average Daily TSS: ${avgDailyTSS}
- Week 2 TSS (days 14-8): ${secondWeekTSS}
- Week 1 TSS (days 7-1): ${lastWeekTSS}
- Taper Ratio: ${taperRatio}%

Pre-Race Activities:
  [Last 7 days with TSS values]
`;
```

4. **AI Instructions**
```javascript
CRITICAL ANALYSIS REQUIREMENTS:
- ANALYZE PRE-RACE TRAINING LOAD
- ASSESS FATIGUE STATE (taper ratio 40-60% ideal)
- CONNECT DOTS (poor performance + high load = fatigue)
- TAPER QUALITY (gradual reduction, maintain intensity)
- FRESHNESS (arrived fresh or tired?)
- RECOMMENDATIONS (better taper for next time)
```

---

## 📈 **Benefits**

### **For Athletes:**
✅ **Understand WHY** performance was good or bad  
✅ **Learn** optimal taper strategies  
✅ **Avoid** overtraining before races  
✅ **Improve** race-day freshness  
✅ **Data-driven** insights, not guesswork  

### **For Coaches:**
✅ **Complete picture** of athlete preparation  
✅ **Identify** training load issues  
✅ **Teach** proper tapering  
✅ **Evidence-based** recommendations  

### **Competitive Advantage:**
🏆 **No other platform** connects pre-race training load to race performance  
🏆 **TrainingPeaks** shows TSS but doesn't analyze it in context  
🏆 **Strava** has no TSS or fatigue analysis  
🏆 **Intervals.icu** shows data but no AI insights  

---

## 🧪 **Testing the Feature**

### **To See It In Action:**

1. **Go to Race Analysis page**
2. **Select a race** that has activities in the 14 days before it
3. **Fill out feedback form**
4. **Click "Generate AI Analysis"**
5. **Check the analysis** for mentions of:
   - Taper ratio
   - Pre-race fatigue
   - Training load
   - Freshness
   - Recovery recommendations

### **Console Logs to Check:**
```javascript
console.log('Pre-race activities (14 days):', preRaceActivities);
// Should show array of activities with TSS values
```

---

## 📊 **Taper Guidelines (For Reference)**

### **Ideal Taper Ratios:**
- **40-50%** - Aggressive taper (for very hard training blocks)
- **50-60%** - Standard taper (most athletes)
- **60-70%** - Light taper (if training was moderate)
- **70%+** - Not enough taper (likely carrying fatigue)
- **<40%** - Too much taper (risk of losing fitness)

### **TSS Guidelines:**
- **Race Week TSS:** 200-400 (depending on athlete)
- **Average Daily TSS:** 30-60 in race week
- **2 Days Before Race:** <50 TSS (openers)
- **1 Day Before Race:** 0 TSS (rest)

---

## 🎯 **Future Enhancements**

1. **CTL/ATL/TSB Analysis** - Add chronic/acute training load
2. **Fatigue Score** - Calculate numerical freshness score
3. **Taper Recommendations** - AI suggests optimal taper plan
4. **Historical Comparison** - Compare taper to previous races
5. **Visual Charts** - Graph TSS progression before race
6. **Recovery Metrics** - HRV, sleep, wellness data integration

---

## 📝 **Files Modified**

1. **`src/pages/PostRaceAnalysis.jsx`**
   - Added `calculateTSS()` function
   - Collect pre-race activities (14 days)
   - Send `preRaceActivities` to backend

2. **`server/routes/race.js`**
   - Accept `preRaceActivities` parameter
   - Calculate training load metrics (total TSS, taper ratio, etc.)
   - Add pre-race data to AI prompt
   - Add AI instructions for fatigue analysis

---

## 🎉 **Result**

The AI now provides **holistic race analysis** that considers:
- ✅ Race performance data
- ✅ Rider feedback
- ✅ Race plan execution
- ✅ **Pre-race training load** (NEW!)
- ✅ **Fatigue state** (NEW!)
- ✅ **Taper quality** (NEW!)

This creates a **complete picture** of race performance and helps athletes understand the **full context** of their results, leading to better preparation and improved performance in future races! 🚀
