# Page Reorganization Plan

## 🎯 Objective
Reorganize User Profile and Rider Profile pages for better UX and clearer separation of concerns.

---

## 📋 Current Structure (Confusing)

```
Navigation:
├── Dashboard
├── User Profile (mixed: personal data + performance metrics)
│   ├── Basic Info (name, age, weight, height, gender)
│   ├── Manual FTP Override
│   ├── Manual FTHR Override
│   ├── Performance Metrics (FTP, FTHR, Power/Weight, BMI)
│   └── HR Training Zones
├── Rider Profile (analytics: rider type, power curve, zones)
└── Settings (separate page)
```

**Problems:**
- ❌ User Profile mixes personal data with performance metrics
- ❌ Unclear difference between "User Profile" and "Rider Profile"
- ❌ Settings is separate but should contain User Profile
- ❌ Performance metrics scattered across two pages

---

## ✅ Proposed Structure (Better)

```
Navigation:
├── Dashboard
├── Rider Profile (ALL performance data)
│   ├── Performance Metrics Section
│   │   ├── Manual FTP Override
│   │   ├── Manual FTHR Override
│   │   ├── Current Metrics (FTP, FTHR, Power/Weight, BMI)
│   │   └── HR Training Zones
│   ├── Rider Type & Analytics
│   │   ├── Rider Classification
│   │   ├── Power Curve
│   │   ├── Zone Distribution
│   │   └── Smart Insights
│   └── Efficiency Metrics
└── Settings
    ├── User Profile (ONLY basic personal data)
    │   ├── Name
    │   ├── Email
    │   ├── Age
    │   ├── Weight
    │   ├── Height
    │   └── Gender
    ├── Strava Connection
    └── Other Settings
```

**Benefits:**
- ✅ Clear separation: Personal data vs Performance data
- ✅ "Rider Profile" = Complete athlete dashboard
- ✅ "User Profile" = Basic account settings
- ✅ Settings contains all configuration
- ✅ Logical grouping of related features

---

## 🔄 Migration Steps

### **Step 1: Update Rider Profile**
Add performance metrics section at the top:
- Manual FTP Override
- Manual FTHR Override
- Current Metrics Grid (FTP, FTHR, Power/Weight, BMI)
- HR Training Zones

### **Step 2: Simplify User Profile**
Remove performance metrics, keep only:
- Name
- Email
- Age
- Weight
- Height
- Gender

### **Step 3: Update Navigation**
- Keep "Rider Profile" in main nav
- Move "User Profile" under Settings
- Update routing

### **Step 4: Update Links**
- Dashboard → "View Profile" should go to Rider Profile
- Settings → "Edit Profile" should go to User Profile (under Settings)

---

## 📄 File Changes

### **Files to Modify:**

1. **`src/pages/RiderProfile.jsx`**
   - Add performance metrics section at top
   - Import FTP/FTHR calculation logic
   - Add manual override inputs
   - Display current metrics grid
   - Display HR zones

2. **`src/pages/UserProfile.jsx`**
   - Remove all performance metrics
   - Remove FTP/FTHR state and calculations
   - Keep only basic user data form
   - Simplify to just personal information

3. **`src/pages/Settings.jsx`**
   - Add User Profile as a section
   - Or create tabbed interface with User Profile tab

4. **`src/App.jsx` or routing file**
   - Update routes
   - Nest User Profile under Settings

5. **`src/components/Navigation.jsx`** (if exists)
   - Update nav links
   - Remove User Profile from main nav (if present)

---

## 🎨 New Rider Profile Layout

```
┌─────────────────────────────────────────────────────────┐
│ Rider Profile                                            │
│ Your complete performance dashboard                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Performance Metrics                                      │
│ Your current fitness indicators                          │
│                                                          │
│ [Manual FTP Override]                                   │
│ [Manual FTHR Override]                                  │
│                                                          │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│ │ FTP  │ │ FTHR │ │ W/kg │ │ BMI  │                   │
│ └──────┘ └──────┘ └──────┘ └──────┘                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ HR Training Zones                                        │
│ Z1-Z5 with ranges and descriptions                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Rider Type & Power Profile                              │
│ (existing analytics)                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 New User Profile (Under Settings)

```
┌─────────────────────────────────────────────────────────┐
│ Settings                                                 │
│                                                          │
│ Tabs: [User Profile] [Strava] [Preferences]            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ User Profile                                             │
│ Basic personal information                               │
│                                                          │
│ Name:    [________________]                             │
│ Email:   [________________]                             │
│ Age:     [___]                                          │
│ Weight:  [___] kg                                       │
│ Height:  [___] cm                                       │
│ Gender:  [▼ Select]                                     │
│                                                          │
│ [Save Changes]                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Priority

### **Phase 1: Move Metrics to Rider Profile** ✅ Do First
1. Copy performance metrics section from UserProfile to RiderProfile
2. Copy manual FTP/FTHR override inputs
3. Copy HR zones display
4. Test that everything works

### **Phase 2: Simplify User Profile**
1. Remove performance metrics from UserProfile
2. Keep only basic personal data form
3. Test that saving still works

### **Phase 3: Update Navigation** (Optional for now)
1. Update routing if needed
2. Update nav links
3. Update breadcrumbs

---

## ✅ Benefits Summary

### **For Users:**
- 🎯 **Clearer Purpose**: "Rider Profile" = performance, "User Profile" = personal data
- 🚀 **Better UX**: All performance data in one place
- 📊 **Comprehensive View**: See all metrics together
- ⚙️ **Logical Settings**: Personal data where you'd expect it

### **For Developers:**
- 📦 **Better Organization**: Clear separation of concerns
- 🔧 **Easier Maintenance**: Related features grouped together
- 🎨 **Cleaner Code**: Less confusion about where features belong
- 📈 **Scalability**: Easy to add more performance features to Rider Profile

---

## 🧪 Testing Checklist

After implementation:
- [ ] Rider Profile displays all performance metrics
- [ ] Manual FTP override works in Rider Profile
- [ ] Manual FTHR override works in Rider Profile
- [ ] HR zones display correctly in Rider Profile
- [ ] User Profile only shows basic personal data
- [ ] Saving user data still works
- [ ] Navigation links work correctly
- [ ] No broken links or 404s
- [ ] Mobile responsive on both pages
- [ ] Dark mode works on both pages

---

## 📝 Next Steps

1. **Implement Phase 1**: Move metrics to Rider Profile
2. **Test thoroughly**: Ensure everything works
3. **Implement Phase 2**: Simplify User Profile
4. **Optional Phase 3**: Update navigation structure

Let's start with Phase 1 - moving the performance metrics to Rider Profile!
