# Performance Metrics - FTHR & Aerobic Capacity Implementation

**Date:** November 2, 2025
**Status:** ✅ COMPLETE

## 🎯 Overview

Successfully added FTHR (Functional Threshold Heart Rate) and Aerobic Capacity tracking to the Performance Metrics page, completing the full performance monitoring suite.

---

## ✅ What Was Implemented

### **1. FTHR Tracking**
- **Weekly FTHR Calculation:** Analyzes heart rate data from activities (20-60 min efforts)
- **FTHR History Chart:** Area chart showing FTHR progression over time
- **Current FTHR Card:** Displays current FTHR in BPM
- **Estimation Logic:** 
  - 20-30 min efforts: 95% of average HR
  - 30-60 min efforts: 100% of average HR
  - Carries forward previous values when no new data

### **2. Aerobic Capacity (Efficiency)**
- **Efficiency Calculation:** Watts per heartbeat (W/BPM)
- **Trend Analysis:** Shows % change over last 4 weeks
- **Efficiency Chart:** Line chart showing progression
- **Visual Indicators:** Green (improving), Red (declining), Gray (stable)
- **Explanation Card:** Helps users understand what efficiency means

### **3. Enhanced UI**
- **3-Column Metrics Cards:**
  - FTP (Functional Threshold Power)
  - FTHR (Functional Threshold Heart Rate)
  - Aerobic Efficiency (Watts per heartbeat)
- **Multiple Charts:**
  - FTP Progression (area chart)
  - FTHR Progression (area chart)
  - Aerobic Efficiency Trend (line chart)
- **Full Dark Mode Support**
- **Responsive Design**

---

## 📊 Metrics Displayed

### **FTP (Functional Threshold Power)**
- **Current Value:** Latest FTP in Watts
- **Chart:** Weekly progression over selected time range
- **Calculation:** Best 20-60 min power efforts

### **FTHR (Functional Threshold Heart Rate)**
- **Current Value:** Latest FTHR in BPM
- **Chart:** Weekly progression over selected time range
- **Calculation:** Best 20-60 min HR efforts
- **NEW:** Heart rate based threshold tracking

### **Aerobic Efficiency**
- **Current Value:** Watts per heartbeat (W/BPM)
- **Trend:** % change over last 4 weeks
- **Chart:** Daily efficiency progression
- **Interpretation:** Higher = better fitness
- **NEW:** Power-to-HR ratio tracking

---

## 🔧 Technical Implementation

### **State Management**
```javascript
const [ftpHistory, setFtpHistory] = useState([]);
const [fthrHistory, setFthrHistory] = useState([]);  // NEW
const [currentFTP, setCurrentFTP] = useState(null);
const [currentFTHR, setCurrentFTHR] = useState(null);  // NEW
const [efficiencyMetrics, setEfficiencyMetrics] = useState(null);  // NEW
```

### **Calculation Functions**
1. **`calculateWeeklyFTP(activities, weekStart)`** - Existing FTP calculation
2. **`calculateWeeklyFTHR(activities, weekStart)`** - NEW FTHR calculation
3. **`calculateEfficiencyMetrics(activities, ftp)`** - NEW efficiency from riderAnalytics

### **Data Flow**
```
loadFTPHistory()
    ↓
Fetch Activities from Strava
    ↓
Calculate Weekly FTP (existing)
Calculate Weekly FTHR (NEW)
Calculate Aerobic Efficiency (NEW)
    ↓
Fill gaps with previous values
    ↓
Set State & Display Charts
```

---

## 📁 Files Modified

### **PerformanceMetrics.jsx** (`src/pages/PerformanceMetrics.jsx`)

**Imports Added:**
```javascript
import { calculateEfficiencyMetrics } from '../lib/riderAnalytics';
```

**State Added:**
- `fthrHistory` - Array of weekly FTHR values
- `currentFTHR` - Current FTHR value
- `efficiencyMetrics` - Aerobic efficiency data

**Functions Added:**
- `calculateWeeklyFTHR()` - Calculate FTHR from HR data (similar to FTP logic)

**UI Components Added:**
1. **Current FTHR Card** - Shows current FTHR with Heart icon
2. **Aerobic Efficiency Card** - Shows current efficiency with trend
3. **FTHR Chart** - Area chart with red gradient
4. **Aerobic Efficiency Chart** - Line chart with green color
5. **Efficiency Summary Cards** - Current value and trend %

---

## 🎨 Visual Design

### **Color Scheme:**
- **FTP:** Blue (#3b82f6) - Power/Energy
- **FTHR:** Red (#ef4444) - Heart Rate
- **Aerobic Efficiency:** Green (#10b981) - Fitness/Growth

### **Icons:**
- **FTP:** ⚡ Zap (yellow)
- **FTHR:** ❤️ Heart (red)
- **Aerobic Efficiency:** 📈 TrendingUp (green)

### **Chart Types:**
- **FTP & FTHR:** Area charts with gradients
- **Aerobic Efficiency:** Line chart with dots

---

## 💡 Key Features

### **1. FTHR Calculation**
- Analyzes activities with heart rate data
- Filters for 20+ minute efforts
- Uses 95-100% of average HR based on duration
- Carries forward previous values when no new data
- Same logic as FTP calculation but for HR

### **2. Aerobic Efficiency**
- Calculates W/BPM from activities with both power and HR
- Shows trend over last 4 weeks
- Visual indicators (↗ improving, ↘ declining, → stable)
- Helps identify fitness improvements

### **3. Time Range Selector**
- 8, 12, 16, 24 weeks options
- "This Year" option (from Jan 1st)
- Applies to all charts simultaneously

---

## 📊 Data Requirements

### **For FTP:**
- Activities with power meter data
- 20+ minute duration
- Normalized or average power

### **For FTHR:**
- Activities with heart rate monitor data
- 20+ minute duration
- Average heart rate

### **For Aerobic Efficiency:**
- Activities with BOTH power and HR data
- Calculates efficiency ratio (W/BPM)
- Requires FTP for context

---

## 🎯 Benefits

### **1. Complete Performance Picture**
- Power metrics (FTP)
- Heart rate metrics (FTHR)
- Efficiency metrics (W/BPM)

### **2. Better Training Insights**
- Track fitness improvements via efficiency
- Monitor HR response to training
- Identify overtraining (declining efficiency)

### **3. Multi-Metric Analysis**
- FTP shows power capacity
- FTHR shows cardiovascular fitness
- Efficiency shows training effectiveness

---

## 🔜 Future Enhancements (Optional)

### **1. VO2 Max Estimation**
- Estimate VO2 max from power and HR data
- Track aerobic capacity changes
- Compare to age/gender norms

### **2. Lactate Threshold**
- Estimate lactate threshold from power curve
- Track threshold improvements
- Zone-based training recommendations

### **3. Power-to-Weight Ratio**
- Track W/kg over time
- Compare to rider type benchmarks
- Climbing performance indicator

### **4. Training Load Ratios**
- Acute:Chronic workload ratio
- Fitness:Fatigue balance
- Injury risk indicators

---

## 📱 Mobile Responsive

**All charts and cards are mobile-friendly:**
- 3-column grid stacks to 1-column on mobile
- Charts scale to screen width
- Touch-friendly time range selector
- Readable text sizes

---

## 🎉 Conclusion

The Performance Metrics page now provides a **complete performance monitoring suite** with:

✅ **FTP Tracking** - Power capacity
✅ **FTHR Tracking** - Cardiovascular fitness  
✅ **Aerobic Efficiency** - Training effectiveness

**Result:** Athletes can now track all key performance metrics in one place, with historical trends and actionable insights! 🚀

---

## 📝 Summary of Changes

**Lines Added:** ~150 lines
**Functions Added:** 1 (calculateWeeklyFTHR)
**Charts Added:** 2 (FTHR, Aerobic Efficiency)
**Cards Added:** 2 (FTHR, Aerobic Efficiency)
**State Variables Added:** 3 (fthrHistory, currentFTHR, efficiencyMetrics)

**Status:** Production ready, fully functional, dark mode supported! ✅
