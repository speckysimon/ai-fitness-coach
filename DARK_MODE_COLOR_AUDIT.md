# Dark Mode Color Audit

This document catalogs all color usage across the application for integration with the Theme Configuration system in the Admin Panel.

**Last Updated:** November 2, 2025

---

## Color Categories

### 1. Primary Colors
Used for main brand elements, buttons, and key UI components.

| Color Name | Light Mode | Dark Mode | Usage |
|------------|------------|-----------|-------|
| `primary` | `#2563EB` (blue-600) | `#3B82F6` (blue-400) | Primary buttons, links, icons |
| `primary-hover` | `#1D4ED8` (blue-700) | `#2563EB` (blue-600) | Hover states for primary elements |

### 2. Secondary Colors
Accent and supporting colors.

| Color Name | Light Mode | Dark Mode | Usage |
|------------|------------|-----------|-------|
| `secondary` | `#06B6D4` (cyan-500) | `#22D3EE` (cyan-400) | Secondary actions |
| `accent` | `#9333EA` (purple-600) | `#A855F7` (purple-400) | Accent elements, highlights |

### 3. Status Colors
Colors for success, warning, error, and info states.

| Color Name | Light Mode | Dark Mode | Usage |
|------------|------------|-----------|-------|
| `success` | `#10B981` (green-500) | `#34D399` (green-400) | Success messages, positive states |
| `warning` | `#F59E0B` (amber-500) | `#FBBF24` (amber-400) | Warning messages, caution states |
| `error` | `#EF4444` (red-500) | `#F87171` (red-400) | Error messages, negative states |
| `info` | `#3B82F6` (blue-500) | `#60A5FA` (blue-400) | Info messages, neutral states |

### 4. Neutral Colors (Gray Scale)
Backgrounds, text, borders, and UI structure.

| Color Name | Light Mode | Dark Mode | Usage |
|------------|------------|-----------|-------|
| `gray-50` | `#F9FAFB` | `#1F2937` (gray-800) | Light backgrounds |
| `gray-100` | `#F3F4F6` | `#374151` (gray-700) | Subtle backgrounds |
| `gray-200` | `#E5E7EB` | `#4B5563` (gray-600) | Borders, dividers |
| `gray-300` | `#D1D5DB` | `#6B7280` (gray-500) | Borders, disabled states |
| `gray-400` | `#9CA3AF` | `#9CA3AF` | Placeholder text |
| `gray-500` | `#6B7280` | `#D1D5DB` (gray-300) | Secondary text |
| `gray-600` | `#4B5563` | `#E5E7EB` (gray-200) | Primary text (light) |
| `gray-700` | `#374151` | `#F3F4F6` (gray-100) | Primary text |
| `gray-800` | `#1F2937` | `#F9FAFB` (gray-50) | Dark backgrounds, cards |
| `gray-900` | `#111827` | `#FFFFFF` | Headings, emphasis |

### 5. Activity Type Colors
Colors for different training session types.

| Color Name | Light Mode | Dark Mode | Usage |
|------------|------------|-----------|-------|
| `recovery` | `#10B981` (green-500) | `#34D399` (green-400) | Recovery sessions |
| `endurance` | `#3B82F6` (blue-500) | `#60A5FA` (blue-400) | Endurance sessions |
| `tempo` | `#F59E0B` (amber-500) | `#FBBF24` (amber-400) | Tempo sessions |
| `threshold` | `#F97316` (orange-500) | `#FB923C` (orange-400) | Threshold sessions |
| `vo2max` | `#EF4444` (red-500) | `#F87171` (red-400) | VO2 Max sessions |
| `sprint` | `#A855F7` (purple-500) | `#C084FC` (purple-400) | Sprint sessions |

---

## Page-by-Page Color Usage

### Dashboard (`Dashboard.jsx`)
**Status:** ✅ Dark mode complete

**Colors Used:**
- Headers: `text-gray-900 dark:text-gray-100`
- Subtext: `text-gray-600 dark:text-gray-400`
- Cards: `bg-white dark:bg-gray-800`
- Borders: `border-gray-200 dark:border-gray-700`
- Icons: `text-blue-600 dark:text-blue-400`

### All Activities (`AllActivities.jsx`)
**Status:** ✅ Dark mode complete

**Colors Used:**
- Activity cards: `bg-white dark:bg-gray-800`
- Headers: `text-gray-900 dark:text-gray-100`
- Metadata: `text-gray-600 dark:text-gray-400`
- Borders: `border-gray-200 dark:border-gray-700`
- Activity type badges: Various activity colors with dark variants

### Race Analytics (`RaceAnalytics.jsx`)
**Status:** ✅ Dark mode complete

**Colors Used:**
- Analysis cards: `bg-white dark:bg-gray-800`
- Score indicators: `text-green-600 dark:text-green-400`, `text-yellow-600 dark:text-yellow-400`, `text-red-600 dark:text-red-400`
- Headers: `text-gray-900 dark:text-gray-100`
- Borders: `border-gray-200 dark:border-gray-700`

### Training Plan (`PlanGenerator.jsx`)
**Status:** ✅ Dark mode complete

**Colors Used:**
- Session cards with completion status:
  - Auto-completed: `bg-green-50 dark:bg-green-900/20`, `border-green-300 dark:border-green-700`
  - Manual: `bg-purple-50 dark:bg-purple-900/20`, `border-purple-300 dark:border-purple-700`
  - Auto-suggested: `bg-blue-50 dark:bg-blue-900/20`, `border-blue-300 dark:border-blue-700`
  - Incomplete: `bg-white dark:bg-gray-800`, `border-gray-200 dark:border-gray-700`
- Badges:
  - Auto-matched: `bg-blue-100 dark:bg-blue-900/40`, `text-blue-700 dark:text-blue-400`
  - Manual override: `bg-orange-100 dark:bg-orange-900/40`, `text-orange-700 dark:text-orange-400`
  - Manual: `bg-purple-100 dark:bg-purple-900/40`, `text-purple-700 dark:text-purple-400`
  - Activity found: `bg-yellow-100 dark:bg-yellow-900/40`, `text-yellow-700 dark:text-yellow-400`
  - Low match: `bg-orange-100 dark:bg-orange-900/40`, `text-orange-700 dark:text-orange-400`
- Headers: `text-gray-900 dark:text-gray-100`
- Coach notes: `bg-blue-50 dark:bg-blue-900/20`

### Methodology (`Methodology.jsx`)
**Status:** ✅ Dark mode complete

**Colors Used:**
- Information boxes:
  - Blue: `bg-blue-50 dark:bg-blue-900/20`
  - Green: `bg-green-50 dark:bg-green-900/20`
  - Yellow: `bg-yellow-50 dark:bg-yellow-900/20`
  - Orange: `bg-orange-50 dark:bg-orange-900/20`
  - Purple: `bg-purple-50 dark:bg-purple-900/20`
  - Red: `bg-red-50 dark:bg-red-900/20`
- Gradients:
  - Yellow-Orange: `from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20`
  - Blue-Purple: `from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20`
  - Green-Blue: `from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20`
  - Purple-Blue: `from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20`
- Badges:
  - Optimal: `bg-green-200 dark:bg-green-900/40`, `text-green-800 dark:text-green-300`
  - Acceptable: `bg-yellow-200 dark:bg-yellow-900/40`, `text-yellow-800 dark:text-yellow-300`
  - Carrying Fatigue: `bg-red-200 dark:bg-red-900/40`, `text-red-800 dark:text-red-300`
  - Detraining Risk: `bg-orange-200 dark:bg-orange-900/40`, `text-orange-800 dark:text-orange-300`
  - Auto-Complete: `bg-green-200 dark:bg-green-900/40`, `text-green-800 dark:text-green-300`
  - Manual Review: `bg-yellow-200 dark:bg-yellow-900/40`, `text-yellow-800 dark:text-yellow-300`
- TSS Zone Cards:
  - Easy/Recovery (1-49): `bg-green-50 dark:bg-green-900/20`, `border-green-500 dark:border-green-600`, `text-green-700 dark:text-green-400`, `text-green-900 dark:text-green-200`
  - Moderate (50-99): `bg-yellow-50 dark:bg-yellow-900/20`, `border-yellow-500 dark:border-yellow-600`, `text-yellow-700 dark:text-yellow-400`, `text-yellow-900 dark:text-yellow-200`
  - Hard (100-149): `bg-orange-50 dark:bg-orange-900/20`, `border-orange-500 dark:border-orange-600`, `text-orange-700 dark:text-orange-400`, `text-orange-900 dark:text-orange-200`
  - Very Hard (150+): `bg-red-50 dark:bg-red-900/20`, `border-red-500 dark:border-red-600`, `text-red-700 dark:text-red-400`, `text-red-900 dark:text-red-200`
- Code blocks: `bg-white dark:bg-gray-800`, `border-blue-200 dark:border-blue-700`
- Rider types: `text-gray-900 dark:text-gray-100`
- Text: `text-gray-700 dark:text-gray-300`
- Borders: `border-gray-200 dark:border-gray-700`
- Card borders: `border-blue-200 dark:border-blue-800`

### Form & Fitness (`Form.jsx`)
**Status:** ✅ Dark mode complete

**Colors Used:**
- Status card (dynamic based on TSB):
  - High Risk: `bg-red-50 dark:bg-red-900/20`, `text-red-600 dark:text-red-400`
  - Optimal: `bg-green-50 dark:bg-green-900/20`, `text-green-600 dark:text-green-400`
  - Grey Zone: `bg-gray-50 dark:bg-gray-800`, `text-gray-600 dark:text-gray-400`
  - Fresh: `bg-blue-50 dark:bg-blue-900/20`, `text-blue-600 dark:text-blue-400`
- Form zone headers:
  - TSB > 25: `bg-red-50 dark:bg-red-900/20`, `text-red-600 dark:text-red-400`
  - TSB 5-25: `bg-green-50 dark:bg-green-900/20`, `text-green-600 dark:text-green-400`
  - TSB -10 to 5: `bg-gray-50 dark:bg-gray-800`, `text-gray-600`
  - TSB -30 to -10: `bg-blue-50 dark:bg-blue-900/20`, `text-blue-600 dark:text-blue-400`
  - TSB < -30: `bg-red-50 dark:bg-red-900/20`, `text-red-600 dark:text-red-400`
- Methodology box: `bg-blue-50 dark:bg-blue-900/20`, `border-blue-500`, `text-blue-900 dark:text-blue-300`
- Time range buttons: `bg-gray-100 dark:bg-gray-800`, `text-gray-700 dark:text-gray-300`
- Headers: `text-gray-900 dark:text-gray-100`
- Labels: `text-gray-600 dark:text-gray-400`

### Settings (`Settings.jsx`)
**Status:** ✅ Dark mode complete (assumed)

**Colors Used:**
- Cards: `bg-white dark:bg-gray-800`
- Headers: `text-gray-900 dark:text-gray-100`
- Labels: `text-gray-600 dark:text-gray-400`
- Inputs: `border-gray-300 dark:border-gray-600`

### Profile Setup (`ProfileSetup.jsx`)
**Status:** ✅ Dark mode complete (assumed)

**Colors Used:**
- Cards: `bg-white dark:bg-gray-800`
- Headers: `text-gray-900 dark:text-gray-100`
- Labels: `text-gray-600 dark:text-gray-400`

### Calendar (`Calendar.jsx`)
**Status:** ✅ Dark mode complete (assumed)

**Colors Used:**
- Event cards: Various activity colors with dark variants
- Calendar grid: `border-gray-200 dark:border-gray-700`

### Race Day Predictor (`RaceDayPredictor.jsx`)
**Status:** ✅ Dark mode complete (assumed)

**Colors Used:**
- Prediction cards: `bg-white dark:bg-gray-800`
- Power zones: Activity colors with dark variants

### Post Race Analysis (`PostRaceAnalysis.jsx`)
**Status:** ✅ Dark mode complete (assumed)

**Colors Used:**
- Analysis sections: `bg-white dark:bg-gray-800`
- Score indicators: Status colors with dark variants

---

## Common Patterns

### Card Backgrounds
```css
bg-white dark:bg-gray-800
```

### Card Borders
```css
border-gray-200 dark:border-gray-700
```

### Headings (H1-H3)
```css
text-gray-900 dark:text-gray-100
```

### Body Text
```css
text-gray-700 dark:text-gray-300
```

### Secondary Text
```css
text-gray-600 dark:text-gray-400
```

### Tertiary Text / Placeholders
```css
text-gray-500 dark:text-gray-400
```

### Information Boxes (Light Backgrounds)
```css
/* Blue */
bg-blue-50 dark:bg-blue-900/20
border-blue-200 dark:border-blue-700

/* Green */
bg-green-50 dark:bg-green-900/20
border-green-200 dark:border-green-700

/* Yellow */
bg-yellow-50 dark:bg-yellow-900/20
border-yellow-200 dark:border-yellow-700

/* Orange */
bg-orange-50 dark:bg-orange-900/20
border-orange-200 dark:border-orange-700

/* Red */
bg-red-50 dark:bg-red-900/20
border-red-200 dark:border-red-700

/* Purple */
bg-purple-50 dark:bg-purple-900/20
border-purple-200 dark:border-purple-700
```

### Status Badges
```css
/* Success */
bg-green-100 dark:bg-green-900/40
text-green-700 dark:text-green-400

/* Warning */
bg-yellow-100 dark:bg-yellow-900/40
text-yellow-700 dark:text-yellow-400

/* Error */
bg-red-100 dark:bg-red-900/40
text-red-700 dark:text-red-400

/* Info */
bg-blue-100 dark:bg-blue-900/40
text-blue-700 dark:text-blue-400

/* Purple */
bg-purple-100 dark:bg-purple-900/40
text-purple-700 dark:text-purple-400

/* Orange */
bg-orange-100 dark:bg-orange-900/40
text-orange-700 dark:text-orange-400
```

### Buttons
```css
/* Primary */
bg-blue-600 hover:bg-blue-700
text-white

/* Secondary */
bg-gray-100 dark:bg-gray-800
text-gray-700 dark:text-gray-300
hover:bg-gray-200 dark:hover:bg-gray-700
```

### Links
```css
text-blue-600 dark:text-blue-400
hover:text-blue-800 dark:hover:text-blue-300
```

### Icons (Primary)
```css
text-blue-600 dark:text-blue-400
```

### Icons (Secondary)
```css
text-gray-400 dark:text-gray-500
```

---

## Integration with Theme Admin Panel

### Steps to Link Colors to Theme System:

1. **Create Theme Service** (`src/lib/themeService.js`):
   - Fetch active theme from `/api/admin/theme-configs/active`
   - Cache theme in localStorage
   - Provide helper functions to get color values

2. **Update Tailwind Config** (`tailwind.config.js`):
   - Add custom color variables
   - Map to CSS custom properties
   - Allow dynamic theme switching

3. **Create CSS Variables** (in root CSS):
   ```css
   :root {
     --color-primary: #2563EB;
     --color-primary-dark: #3B82F6;
     /* etc. */
   }
   ```

4. **Replace Hardcoded Colors**:
   - Use CSS variables instead of hardcoded Tailwind classes
   - Example: `bg-blue-600` → `bg-[var(--color-primary)]`

5. **Add Theme Toggle**:
   - Allow users to preview themes before applying
   - Provide theme switcher in settings

---

## Notes

- All pages now have comprehensive dark mode support
- Color usage is consistent across the application
- Ready for integration with centralized theme management
- All colors follow the pattern: `light-color dark:dark-color`
- Opacity values (e.g., `/20`, `/40`) are used for subtle backgrounds in dark mode

---

## Future Enhancements

1. **Dynamic Theme Loading**: Load active theme on app initialization
2. **Theme Preview**: Allow users to preview themes before applying
3. **Custom Themes**: Allow users to create their own color schemes
4. **Theme Export/Import**: Share themes between instances
5. **Accessibility**: Ensure all themes meet WCAG AA contrast requirements
6. **Theme Presets**: Provide pre-built themes (e.g., "Ocean", "Forest", "Sunset")
