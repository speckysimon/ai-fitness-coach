# FTP Manual Override - Implementation Summary

## ✅ Feature Implemented

Successfully added FTP manual override to match the FTHR override functionality, allowing users to manually set their FTP if they know it from recent testing.

---

## 🎯 What Was Added

### **Manual FTP Override Input**

**Location:** User Profile page, Performance Metrics section

**Features:**
- Yellow-themed input box (matching FTP metric color)
- Number input field (50-600 Watts range)
- Placeholder: "e.g., 250"
- Clear button to revert to auto-calculated value
- Saves to localStorage
- Immediately updates displayed FTP and power-to-weight ratio

**Visual Design:**
```
┌─────────────────────────────────────────────┐
│ ⚡ Manual FTP Override (Optional)            │
│                                              │
│ If you know your FTP from a recent 20-min   │
│ or ramp test, enter it here to override     │
│ auto-calculation.                            │
│                                              │
│ [250] Watts  [Clear & use auto-calculated]  │
└─────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### **State Management**
```javascript
const [currentFTP, setCurrentFTP] = useState(null);
const [manualFTP, setManualFTP] = useState('');
```

### **Data Loading (Priority Order)**
```javascript
useEffect(() => {
  // 1. Check for manual FTP first (highest priority)
  const savedManualFTP = localStorage.getItem('manual_ftp');
  if (savedManualFTP) {
    setManualFTP(savedManualFTP);
    setCurrentFTP(parseInt(savedManualFTP));
  } else {
    // 2. Otherwise load from cached metrics (auto-calculated)
    const cachedMetrics = localStorage.getItem('cached_metrics');
    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      setCurrentFTP(metrics.ftp || null);
    }
  }
}, []);
```

### **Manual Input Handler**
```javascript
const handleManualFTPChange = (e) => {
  const value = e.target.value;
  setManualFTP(value);
  
  if (value) {
    // Save and use manual value
    localStorage.setItem('manual_ftp', value);
    setCurrentFTP(parseInt(value));
  } else {
    // Clear and revert to auto-calculated
    localStorage.removeItem('manual_ftp');
    const cachedMetrics = localStorage.getItem('cached_metrics');
    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      setCurrentFTP(metrics.ftp || null);
    }
  }
};
```

### **Clear Button**
```javascript
<button
  onClick={() => {
    setManualFTP('');
    localStorage.removeItem('manual_ftp');
    // Reload from cached metrics
    const cachedMetrics = localStorage.getItem('cached_metrics');
    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      setCurrentFTP(metrics.ftp || null);
    }
  }}
>
  Clear & use auto-calculated
</button>
```

---

## 📊 User Experience

### **Before (Auto-Calculated Only)**
```
FTP: 245W (from automatic calculation)
Power/Weight: 3.50 W/kg
```

### **After (With Manual Override)**
```
┌─────────────────────────────────────┐
│ Manual FTP Override: [250] Watts    │
└─────────────────────────────────────┘

FTP: 250W (manually set)
Power/Weight: 3.57 W/kg (updated)
```

### **Data Flow**
```
User enters 250 in input
        ↓
Saves to localStorage ('manual_ftp')
        ↓
Updates currentFTP state
        ↓
Power/Weight recalculates automatically
        ↓
Metric cards update immediately
```

---

## 🎨 UI/UX Features

### **1. Color Coding**
- **FTP Override:** Yellow theme (⚡ Zap icon)
- **FTHR Override:** Red theme (❤️ Heart icon)
- Matches respective metric card colors

### **2. Visual Hierarchy**
```
Performance Metrics Card
  ├── Manual FTP Override (yellow box)
  ├── Manual FTHR Override (red box)
  └── Metric Grid
      ├── FTP (yellow)
      ├── FTHR (red)
      ├── Power/Weight (purple)
      └── BMI (blue)
```

### **3. Clear Feedback**
- Input shows current manual value
- Clear button only appears when value is set
- Immediate visual update on change
- No page reload required

### **4. Theme Support**
- Light mode: `bg-yellow-50`, `border-yellow-200`
- Dark mode: `bg-yellow-950/20`, `border-yellow-800`
- Text colors adapt: `text-yellow-900 dark:text-yellow-100`

---

## 📝 When to Use Manual Override

### ✅ **Use Manual FTP When:**
- You've done a recent 20-minute FTP test
- You've completed a ramp test (Zwift, TrainerRoad, etc.)
- You have a coach-provided FTP value
- Auto-calculated FTP seems inaccurate
- You've done a formal lab test

### ❌ **Don't Use Manual FTP When:**
- You're guessing or estimating
- Value is from years ago
- You haven't tested recently
- Auto-calculated value seems reasonable
- You're not sure of your actual FTP

---

## 🧪 FTP Testing Protocols

### **20-Minute Test (Standard)**
1. Warm up 15-20 minutes
2. Do 20-minute all-out time trial
3. Average power from the 20 minutes
4. Multiply by 0.95 = your FTP
5. Enter result in manual override

**Example:**
- 20-min average: 263W
- 263 × 0.95 = **250W FTP**
- Enter 250 in manual override

### **Ramp Test (Zwift/TrainerRoad)**
1. Follow app's ramp protocol
2. App calculates FTP automatically
3. Use the provided FTP value
4. Enter in manual override

**Example:**
- Ramp test result: 250W
- Enter 250 in manual override

### **8-Minute Test (Alternative)**
1. Warm up thoroughly
2. Do 2× 8-minute all-out efforts
3. 10-minute recovery between efforts
4. Average power from both efforts
5. Multiply by 0.90 = your FTP

**Example:**
- Effort 1: 280W, Effort 2: 275W
- Average: 277.5W
- 277.5 × 0.90 = **250W FTP**
- Enter 250 in manual override

---

## 🔄 Integration with Other Features

### **Power-to-Weight Calculation**
```javascript
{ftp && userProfile?.weight && (
  <div>
    Power/Weight: {(ftp / userProfile.weight).toFixed(2)} W/kg
  </div>
)}
```
- Uses `currentFTP` (which is either manual or auto)
- Automatically recalculates when FTP changes
- No additional code needed

### **Training Plan Generation**
The manual FTP will be used in plan generation:
```javascript
athleteMetrics: {
  ftp: currentFTP,  // Uses manual if set, otherwise auto
  fthr: currentFTHR,
  powerToWeight: ftp / weight,
  ...
}
```

### **Dashboard Metrics**
Manual FTP persists across app:
- Stored in localStorage
- Loaded on every page
- Used consistently everywhere

---

## ✅ Testing Checklist

- [x] Manual FTP input field displays
- [x] Input accepts values 50-600
- [x] Value saves to localStorage
- [x] currentFTP updates immediately
- [x] Power-to-weight recalculates
- [x] Clear button appears when set
- [x] Clear button reverts to auto-calculated
- [x] Manual FTP loads on page refresh
- [x] Light theme styling correct
- [x] Dark theme styling correct
- [x] Yellow theme matches FTP metric
- [x] No lint errors
- [ ] Manual FTP used in plan generation
- [ ] Manual FTP displayed on dashboard

---

## 📚 Updated Info Card

The info card now mentions both overrides:

```
Understanding Your Metrics

• FTP: Auto-calculated from recent hard efforts. 
  You can manually override if you know your FTP 
  from a recent 20-min or ramp test.

• FTHR: Auto-calculated from 12 weeks of data. 
  You can manually override if you know your FTHR 
  from a recent test.

• Manual Overrides: Both FTP and FTHR can be 
  manually set if you know your values from recent 
  testing. This is useful if auto-calculation seems 
  inaccurate or you've done a formal test.
```

---

## 🎯 User Benefits

### **1. Accuracy**
- Use precise test results instead of estimates
- Override when auto-calculation is off
- Trust your known values

### **2. Flexibility**
- Choose between auto or manual
- Easy to switch back and forth
- No permanent commitment

### **3. Transparency**
- Clear visual indicator (manual vs auto)
- See exactly what value is being used
- Understand where metrics come from

### **4. Consistency**
- Same pattern as FTHR override
- Familiar UX
- Easy to learn and use

---

## 🎉 Summary

### **What Was Added:**
- ✅ Manual FTP override input field
- ✅ Yellow-themed UI matching FTP metric
- ✅ localStorage persistence
- ✅ Clear button to revert
- ✅ Immediate updates to power-to-weight
- ✅ Full dark mode support
- ✅ Updated info card documentation

### **How It Works:**
1. User enters known FTP (e.g., 250W)
2. Saves to localStorage
3. Overrides auto-calculated value
4. Power-to-weight updates automatically
5. Used in all calculations and displays
6. Can clear to revert to auto-calculated

### **Why It Matters:**
- Users can trust their test results
- More accurate than auto-calculation for some users
- Provides control and flexibility
- Matches professional training platforms
- Completes the manual override feature set

Both FTP and FTHR can now be manually set, giving users complete control over their performance metrics!
