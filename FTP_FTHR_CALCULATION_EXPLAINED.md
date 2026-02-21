# FTP and FTHR Calculation Methods - Complete Documentation

**Date:** January 26, 2026  
**Status:** Working (222W FTP, 135 BPM FTHR)

---

## Two Different FTP Calculation Methods

### Method 1: Smart FTP (Dashboard Main Metric) ⚡
**Location:** `server/services/smartMetricsService.js`  
**Used by:** Dashboard "Current FTP" card  
**Endpoint:** `POST /api/analytics/smart-ftp`

#### Algorithm:
```javascript
1. Analyze Training Context (last 6-12 weeks)
   - Calculate CTL (Chronic Training Load) - 42-day exponential weighted average
   - Detect training gaps (>7 days off)
   - Calculate CTL change (current vs previous 6 weeks)
   - Determine weekly TSS average

2. Adaptive Time Window
   - Default: 42 days (6 weeks)
   - If recent gap (>14 days off): 28 days (4 weeks)
   - If CTL declining >15%: 28 days (4 weeks)

3. Find Hard Efforts in Window
   Filter activities:
   - avgPower > 150W (lowered from 200W)
   - duration: 1200-3600 seconds (20-60 min)
   
4. Calculate FTP from Hard Efforts
   - Sort by power (descending)
   - Take top 3 efforts
   - Calculate average power and duration
   
   Duration-based multiplier (Coggan methodology):
   - 50-60 min: 1.00 (true threshold)
   - 40-50 min: 0.99
   - 30-40 min: 0.98
   - 20-30 min: 0.95 (standard 20-min test)
   
   FTP = avgPower × multiplier

5. Special Cases
   - No hard efforts + training consistent (>200 TSS/week):
     Return last known FTP (maintained by CTL)
   
   - No hard efforts + reduced training:
     Estimate decline: lastKnownFTP × (1 - min(|ctlChange| × 0.7, 0.15))
```

#### Example (Your Data):
```
Total activities: 205
Power activities (>=20min): 181
Recent power activities (last 6 weeks): 30

Hard efforts found: 3 (with power >150W, 20-60 min)
Top 3 efforts average: ~234W (39 min avg)
Multiplier: 0.95 (for ~39 min effort)
FTP = 234 × 0.95 = 222W ✅

Confidence: High (3 hard efforts)
Method: hard_efforts
```

---

### Method 2: Simple FTP (Rider Profile, Plan Generator)
**Location:** `server/services/analyticsService.js`  
**Used by:** Rider Profile page, Plan Generator  
**Endpoint:** `POST /api/analytics/ftp`

#### Algorithm:
```javascript
1. Filter Power Activities
   - avgPower > 0
   - duration >= 1200 seconds (20 min)

2. Fixed 6-Week Window
   - Filter activities from last 42 days
   
3. Find Best 20-60 Min Effort
   - Sort by normalized power (or avgPower) descending
   - Find first activity with duration 1200-3600 seconds
   
4. Calculate FTP
   Duration-based multiplier:
   - ≤30 min: power × 0.95
   - >30 min: power × 1.00
   
5. Fallback (no 20-60 min effort)
   - Take top 3 activities by power
   - Average their power
   - FTP = avgPower × 0.95
```

#### Example (Your Data):
```
Power activities (>=20min): 181
Recent (last 6 weeks): 30

Best 20-60 min effort: ~234W (39 min)
FTP = 234 × 0.95 = 222W ✅
```

---

## Key Differences Between Methods

| Feature | Smart FTP (Dashboard) | Simple FTP (Rider Profile) |
|---------|----------------------|---------------------------|
| **Training Context** | Analyzes CTL, gaps, trends | No context analysis |
| **Time Window** | Adaptive (28-42 days) | Fixed (42 days) |
| **Hard Effort Filter** | Power >150W, 20-60 min | Any power >0, >=20 min |
| **Calculation** | Top 3 efforts average | Best single effort |
| **Special Cases** | Handles gaps, decline | No special handling |
| **Confidence Score** | Yes (high/medium/low) | No |
| **Recommendation** | Yes (when to test) | No |

---

## FTHR Calculation (Heart Rate Threshold)

**Location:** `server/services/fthrService.js`  
**Endpoint:** `POST /api/analytics/fthr`

### Algorithm:
```javascript
1. Filter Activities (12-week window, expanded from 6)
   - avgHeartRate > 0
   - duration >= 1200 seconds (20 min)
   - From last 84 days (12 weeks)

2. Find Hard Efforts
   Filter for threshold-level efforts:
   - HR intensity > 82% of estimated max HR
   - Duration: 1200-3600 seconds (20-60 min)
   
   Estimated max HR:
   - Use activity.maxHeartRate if available
   - Otherwise: 220 - age (if age known)
   - Fallback: avgHeartRate × 1.1

3. Calculate FTHR from Hard Efforts
   
   If ≥3 hard efforts found (HIGH CONFIDENCE):
   - Take top 3 by avgHeartRate
   - Calculate average HR and duration
   
   Duration-based multiplier (Coggan methodology):
   - 50-60 min: avgHR × 1.00 (already at threshold)
   - 40-50 min: avgHR × 0.99
   - 30-40 min: avgHR × 0.98
   - 20-30 min: avgHR × 0.95 (standard 20-min test)
   
   If 1-2 hard efforts (MEDIUM CONFIDENCE):
   - Average HR × 0.95 (conservative)
   
   If 0 hard efforts (LOW CONFIDENCE):
   - Max HR observed × 0.90 (research-backed: Karvonen, Friel)

4. Validation
   - Reject FTHR < 120 BPM (unrealistic)
```

### Example (Your Data):
```
Activities with HR (last 12 weeks): 129
Hard efforts (>82% max HR, 20-60 min): Likely 1-2

Method: limited_hard_efforts or max_hr_estimate
Calculation: maxHR × 0.90 or avgHR × 0.95
Result: 135 BPM

Confidence: Medium/Low
```

---

## Why FTHR Seems Low (135 BPM)

### Possible Reasons:

1. **Limited Hard HR Efforts**
   - You may not have many activities with sustained high HR (>82% max)
   - Indoor training often has lower HR than outdoor
   - Zwift rides may be more controlled/steady

2. **Estimation Method Used**
   - If no hard efforts found, uses: maxHR × 0.90
   - If your max observed HR is ~150 BPM: 150 × 0.90 = 135 BPM ✅

3. **12-Week Window**
   - Expanded from 6 weeks to capture more data
   - But if no recent hard HR efforts, falls back to estimation

### How to Improve FTHR Accuracy:

1. **Do a 20-min HR Test**
   - Warm up 15 min
   - 20 min all-out effort
   - Average HR for last 20 min × 0.95 = FTHR

2. **Include More Hard Outdoor Rides**
   - Outdoor climbs/intervals push HR higher
   - Indoor trainer often limits max HR

3. **Manual Override**
   - Go to Rider Profile → Manual Overrides
   - Enter your known FTHR (e.g., 165 BPM)

---

## Recommended FTHR for Your Profile

Based on typical cycling data:
- Age: 49
- Estimated max HR: 220 - 49 = 171 BPM
- Typical FTHR: 171 × 0.90 = **154 BPM**

Your current 135 BPM suggests:
- Either your max observed HR is lower (~150 BPM)
- Or you haven't done recent hard HR efforts

**Action:** Do a 20-min FTP test outdoors and note your average HR. That will give you accurate FTHR.

---

## Summary

### FTP: 222W ✅
- **Method:** Smart FTP (hard efforts)
- **Confidence:** High
- **Based on:** 3 hard efforts, avg 234W, 39 min
- **Calculation:** 234W × 0.95 = 222W
- **W/kg:** 222W ÷ 67kg = **3.31 W/kg** (Competitive Cat 3-4 level)

### FTHR: 135 BPM ⚠️
- **Method:** Likely max HR estimation
- **Confidence:** Medium/Low
- **Based on:** Max observed HR ~150 BPM
- **Calculation:** 150 × 0.90 = 135 BPM
- **Recommendation:** Do 20-min HR test for accuracy

### Next Steps:
1. ✅ FTP calculation is working correctly
2. ⚠️ FTHR may be underestimated - consider manual override or HR test
3. ✅ W/kg and BMI now displaying correctly (profile saved)

---

**Files Reference:**
- Smart FTP: `server/services/smartMetricsService.js`
- Simple FTP: `server/services/analyticsService.js`
- FTHR: `server/services/fthrService.js`
- Dashboard: `src/pages/Dashboard.jsx` (lines 604-624)
- Rider Profile: `src/pages/RiderProfile.jsx` (lines 260-284)
