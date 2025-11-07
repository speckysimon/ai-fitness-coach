# Calculation Info Updates - Performance Metrics & Methodology

**Date:** November 2, 2025
**Status:** ✅ COMPLETE

## 🎯 Overview

Successfully added collapsible calculation info sections to the Performance Metrics page and comprehensive methodology documentation with citations for FTP, FTHR, and Aerobic Efficiency calculations.

---

## ✅ What Was Implemented

### **1. Performance Metrics Page - Collapsible Info Sections**

**Location:** `/src/pages/PerformanceMetrics.jsx`

**Changes Made:**
- Replaced single static info card with **3 collapsible sections**
- Added `ChevronDown` icon for expand/collapse indicator
- Added state management for section expansion
- Each section can be independently expanded/collapsed

**Three Collapsible Sections:**

#### **A. FTP Calculation Info**
- **Icon:** ⚡ Zap (yellow)
- **Content:**
  - Definition of FTP
  - Auto-detection method (6 weeks, 20-60 min efforts)
  - Test protocols (20 min = 95%, 30-60 min = 100%)
  - Normalized Power usage
  - Tips for accurate tracking
  - **Citation:** Allen & Coggan (2010) - Training and Racing with a Power Meter

#### **B. FTHR Calculation Info**
- **Icon:** ❤️ Heart (red)
- **Content:**
  - Definition of FTHR
  - Auto-detection method (6 weeks, 20-60 min efforts)
  - Test protocols (20-30 min = 95%, 30-60 min = 100%)
  - Steady-state effort filtering
  - Tips for accurate measurement
  - **Citation:** Friel (2009) - The Cyclist's Training Bible

#### **C. Aerobic Efficiency Calculation Info**
- **Icon:** 📈 TrendingUp (green)
- **Content:**
  - Definition (Pw:HR ratio, W/bpm)
  - Why it matters (cardiovascular fitness indicator)
  - Calculation method (Power ÷ HR)
  - Trend tracking (4 weeks)
  - Interpretation guide (improving/stable/declining)
  - Tips for improvement
  - **Citation:** Seiler (2010) - Training intensity and duration distribution

---

### **2. Methodology Page - New Sections**

**Location:** `/src/pages/Methodology.jsx`

**Changes Made:**
- Added **2 new CollapsibleCard sections** after FTP section
- Added comprehensive explanations with examples
- Added clickable citation links
- Updated "Last updated" footer

**Two New Sections:**

#### **A. FTHR Section**
- **Full definition and purpose**
- **Auto-detection method:**
  - 6 weeks analysis
  - 20-60 minute efforts
  - Test protocols with percentages
  - Steady-state filtering
  - Automatic updates
- **Heart Rate Training Zones:**
  - Zone 1 (Recovery): <68% FTHR
  - Zone 2 (Endurance): 69-83% FTHR
  - Zone 3 (Tempo): 84-94% FTHR
  - Zone 4 (Threshold): 95-105% FTHR
  - Zone 5 (VO2 Max): >106% FTHR
- **Citations:**
  - Friel, J. (2009). The Cyclist's Training Bible
  - TrainingPeaks link: Joe Friel's Guide to Setting Zones

#### **B. Aerobic Efficiency Section**
- **Full definition (Pw:HR ratio)**
- **Why it matters:**
  - Cardiovascular fitness indicator
  - Training adaptation marker
  - Fatigue/overtraining signal
- **Calculation method:**
  - Power and HR data analysis
  - Efficiency ratio calculation
  - 4-week trend tracking
  - Percentage change reporting
- **Interpreting results:**
  - Improving (+): Continue training
  - Stable (0): Consider progressive overload
  - Declining (-): Add recovery
- **Citations:**
  - Seiler, S. (2010). IJSPP paper
  - NIH link: Cardiac Output and Aerobic Capacity
  - TrainingPeaks link: Understanding Aerobic Decoupling

---

## 🎨 UI/UX Features

### **Collapsible Sections (Performance Metrics)**
```javascript
// State management
const [expandedSections, setExpandedSections] = useState({
  ftp: false,
  fthr: false,
  aerobic: false
});

// Toggle function
const toggleSection = (section) => {
  setExpandedSections(prev => ({
    ...prev,
    [section]: !prev[section]
  }));
};
```

**Visual Features:**
- **Hover effect:** Background changes on hover
- **Cursor:** Pointer cursor indicates clickability
- **Chevron animation:** Rotates 180° when expanded
- **Smooth transitions:** CSS transitions for expand/collapse
- **Color-coded:** Each section has its own color theme
  - FTP: Yellow/Blue
  - FTHR: Red
  - Aerobic: Green

---

## 📚 Citations Added

### **Performance Metrics Page**

1. **FTP:**
   - Allen, H., & Coggan, A. (2010). *Training and Racing with a Power Meter*. VeloPress.

2. **FTHR:**
   - Friel, J. (2009). *The Cyclist's Training Bible*. VeloPress.

3. **Aerobic Efficiency:**
   - Seiler, S. (2010). "What is best practice for training intensity and duration distribution in endurance athletes?" *International Journal of Sports Physiology and Performance*, 5(3), 276-291.

### **Methodology Page**

1. **FTHR:**
   - Friel, J. (2009). *The Cyclist's Training Bible* (4th ed.). VeloPress.
   - Link: https://www.trainingpeaks.com/blog/joe-friel-s-quick-guide-to-setting-zones/

2. **Aerobic Efficiency:**
   - Seiler, S. (2010). IJSPP paper
   - Link: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3912323/
   - Link: https://www.trainingpeaks.com/blog/aerobic-decoupling-in-cycling/

---

## 📁 Files Modified

### **1. PerformanceMetrics.jsx**
**Lines Modified:** ~150 lines
**Changes:**
- Added `ChevronDown` icon import
- Added `expandedSections` state
- Added `toggleSection` function
- Replaced single info card with 3 collapsible sections
- Added detailed calculation explanations
- Added citations

### **2. Methodology.jsx**
**Lines Modified:** ~140 lines
**Changes:**
- Added FTHR CollapsibleCard section
- Added Aerobic Efficiency CollapsibleCard section
- Added HR training zones table
- Added interpretation guides
- Added clickable citation links
- Updated "Last updated" footer

---

## 🎯 Key Benefits

### **1. Better User Education**
- Users understand how metrics are calculated
- Transparency builds trust
- Scientific backing with citations

### **2. Improved UX**
- Collapsible sections reduce clutter
- Users can expand only what they need
- Visual indicators (icons, colors) aid understanding

### **3. Scientific Credibility**
- Proper citations to authoritative sources
- Links to external resources
- Industry-standard methodologies

### **4. Comprehensive Documentation**
- Performance Metrics page: Quick reference
- Methodology page: Deep dive with examples
- Consistent information across both pages

---

## 📊 Content Structure

### **Performance Metrics Page**
```
┌─────────────────────────────────────┐
│ Charts & Metrics (above)            │
├─────────────────────────────────────┤
│ ⚡ How FTP is Calculated [▼]        │
│   (Collapsible content)             │
├─────────────────────────────────────┤
│ ❤️ How FTHR is Calculated [▼]      │
│   (Collapsible content)             │
├─────────────────────────────────────┤
│ 📈 How Aerobic Efficiency [▼]      │
│   is Calculated                     │
│   (Collapsible content)             │
└─────────────────────────────────────┘
```

### **Methodology Page**
```
┌─────────────────────────────────────┐
│ Other sections (above)              │
├─────────────────────────────────────┤
│ FTP Section                         │
├─────────────────────────────────────┤
│ FTHR Section (NEW)                  │
│  • Definition                       │
│  • Auto-detection                   │
│  • HR Zones table                   │
│  • Citations + Links                │
├─────────────────────────────────────┤
│ Aerobic Efficiency Section (NEW)   │
│  • Definition                       │
│  • Why it matters                   │
│  • Calculation method               │
│  • Interpretation guide             │
│  • Citations + Links                │
├─────────────────────────────────────┤
│ Other sections (below)              │
└─────────────────────────────────────┘
```

---

## 🔍 Technical Details

### **State Management**
```javascript
// Tracks which sections are expanded
const [expandedSections, setExpandedSections] = useState({
  ftp: false,      // FTP section collapsed by default
  fthr: false,     // FTHR section collapsed by default
  aerobic: false   // Aerobic section collapsed by default
});
```

### **Toggle Function**
```javascript
const toggleSection = (section) => {
  setExpandedSections(prev => ({
    ...prev,
    [section]: !prev[section]  // Toggle specific section
  }));
};
```

### **Conditional Rendering**
```javascript
{expandedSections.ftp && (
  <CardContent>
    {/* Content only shown when expanded */}
  </CardContent>
)}
```

---

## 🎨 Styling Details

### **Color Themes**
- **FTP:** Yellow/Blue gradient boxes
- **FTHR:** Red gradient boxes
- **Aerobic:** Green gradient boxes

### **Interactive Elements**
- **Hover:** `hover:bg-gray-50 dark:hover:bg-gray-800`
- **Cursor:** `cursor-pointer`
- **Transition:** `transition-colors` and `transition-transform`
- **Chevron rotation:** `rotate-180` when expanded

### **Dark Mode Support**
- All sections fully support dark mode
- Color adjustments for readability
- Border and background color variants

---

## 📱 Mobile Responsive

**All sections are mobile-friendly:**
- Collapsible sections work on touch devices
- Text sizes adjust for smaller screens
- Links are touch-friendly
- No horizontal scrolling

---

## 🎉 Summary

### **What Users Get:**

1. **Performance Metrics Page:**
   - Clean, organized calculation info
   - Expand only what they need
   - Quick reference with citations

2. **Methodology Page:**
   - Deep dive into each metric
   - Training zone tables
   - Interpretation guides
   - External resource links

3. **Overall:**
   - Transparency in calculations
   - Scientific backing
   - Educational content
   - Professional presentation

---

## ✅ Completion Checklist

- [x] Add collapsible sections to Performance Metrics
- [x] Add FTP calculation info with citation
- [x] Add FTHR calculation info with citation
- [x] Add Aerobic Efficiency info with citation
- [x] Add FTHR section to Methodology page
- [x] Add Aerobic Efficiency section to Methodology page
- [x] Add HR training zones table
- [x] Add interpretation guides
- [x] Add clickable citation links
- [x] Update "Last updated" footer
- [x] Test dark mode support
- [x] Verify mobile responsiveness

---

**Status:** Production ready! All calculation info is documented, cited, and beautifully presented! 🚀
