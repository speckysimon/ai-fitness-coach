# 🚀 RiderLabs v2.8.0 Release Notes

**Release Date:** November 1, 2025  
**Focus:** Navigation & Settings UX Improvements

---

## 🎯 Overview

Version 2.8.0 focuses on cleaning up the user interface, improving navigation structure, and making the Settings page more organized and user-friendly. This release removes clutter, groups related features, and introduces collapsible sections for a cleaner experience.

---

## ✨ What's New

### 1. Race Intelligence Menu 🧠

**Problem:** Race-related pages were scattered across the main navigation, making the menu feel cluttered.

**Solution:** Introduced a collapsible "Race Intelligence" section that groups:
- Race Day Predictor
- Race Analysis
- Race Analytics

**Benefits:**
- ✅ Cleaner navigation menu (3 fewer top-level items)
- ✅ Related features grouped together
- ✅ Sparkles icon (✨) represents AI-powered insights
- ✅ Collapsible by default to save space
- ✅ Parent button highlights when any race page is active

---

### 2. Compact Sidebar 📏

**Problem:** Sidebar was getting cramped with text labels under API logos and changelog link.

**Solution:** 
- Removed text labels from Strava, Garmin, and Zwift logos
- Displayed logos horizontally instead of vertically
- Added tooltips for full text on hover
- Moved changelog link to Settings page

**Benefits:**
- ✅ Saved significant vertical space
- ✅ Still fully trademark compliant
- ✅ Cleaner, more professional appearance
- ✅ More room for navigation items

---

### 3. Settings Page Overhaul ⚙️

**Problem:** Settings page had legacy sections, poor organization, and everything expanded by default.

**Solution:** Complete reorganization with smart defaults:

#### Removed Legacy Sections:
- ❌ API Configuration (now in Admin panel)
- ❌ Account/Logout section (now in sidebar)

#### New Collapsible Sections (collapsed by default):
- 👤 Choose Your Coach
- ⏰ Workout Reminders
- Click header to expand/collapse

#### Layout Improvements:
- **Timezone & Data Management**: Now side-by-side (2-column grid)
- Moved directly under Connected Accounts
- Responsive: stacks on mobile, side-by-side on desktop

#### About Section Enhanced:
- Added Changelog link with beautiful card design
- Dynamic version number from package.json (always current)
- Version badge shows current version
- Package icon for visual consistency

**Benefits:**
- ✅ Less overwhelming on first visit
- ✅ Logical grouping of related settings
- ✅ Better space efficiency
- ✅ Version number always accurate
- ✅ Easy access to changelog

---

## 🔧 Technical Improvements

### Dynamic Versioning
- Version number pulled from `package.json` automatically
- No more hardcoded version numbers
- Always shows latest version

### Component Refactoring
- `CoachAvatarSelector` no longer wraps in Card (handled by parent)
- `NotificationSettings` no longer wraps in Card (handled by parent)
- Cleaner component architecture

### Dark Mode Consistency
- All new sections have proper dark mode classes
- Consistent styling across light and dark themes

---

## 📝 Files Changed

### Modified:
- `src/components/Layout.jsx` - Navigation restructure, sidebar cleanup
- `src/pages/Settings.jsx` - Major reorganization and improvements
- `src/components/CoachAvatarSelector.jsx` - Removed Card wrapper
- `src/components/NotificationSettings.jsx` - Removed Card wrapper
- `src/components/StravaAttribution.jsx` - Logo only, added tooltip
- `src/components/GarminAttribution.jsx` - Logo only, added tooltip
- `src/components/ZwiftAttribution.jsx` - Logo only, added tooltip
- `package.json` - Version bump to 2.8.0
- `CHANGELOG.md` - Added v2.8.0 entry

---

## 🎯 User Impact

### Before vs After

**Navigation Menu:**
- Before: 13 top-level items
- After: 10 top-level items + 1 collapsible section (Race Intelligence)

**Sidebar:**
- Before: Text labels under each logo, changelog link
- After: Logos only (horizontal), changelog in Settings

**Settings Page:**
- Before: Everything expanded, legacy sections visible
- After: Smart defaults (collapsed), legacy sections removed, better organization

---

## 🚀 Upgrade Notes

### For Users:
- **Navigation:** Look for race features under "Race Intelligence" menu
- **Changelog:** Now in Settings > About section
- **Settings:** Sections are collapsed by default - click to expand

### For Developers:
- Version number now pulled from `package.json`
- Update version in `package.json` only (not in code)
- CoachAvatarSelector and NotificationSettings no longer wrap themselves in Cards

---

## 🐛 Known Issues

None introduced in this release.

---

## 📊 Metrics

- **Lines Changed:** ~300
- **Files Modified:** 8
- **Components Refactored:** 5
- **Space Saved in Sidebar:** ~80px vertical height
- **Menu Items Reduced:** 3 (grouped into Race Intelligence)

---

## 🔮 What's Next (v2.9.0)

Based on current sprint priorities:

1. **Mobile Responsiveness** - Make entire site mobile-friendly
2. **Dark Mode Polish** - Comprehensive audit and WCAG AA compliance
3. **Production Testing** - Verify all features work on production

---

## 💬 Feedback

We'd love to hear your thoughts on these improvements! 

- Found a bug? Report it in the Feedback widget
- Have suggestions? Let us know in Settings > Feedback

---

**Built with ❤️ by the RiderLabs team**

🔬 Where Performance is Engineered
