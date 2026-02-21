# ActivityCard Component Usage Guide

## Overview
The `ActivityCard` component provides a consistent, reusable way to display activities across the application with responsive breakpoints and standardized styling.

## Files Created
- `src/lib/activityUtils.jsx` - Shared utility functions for activity styling
- `src/components/ActivityCard.jsx` - Reusable activity card component

## Utility Functions (`activityUtils.jsx`)

### `getActivityIcon(activity)`
Returns the appropriate icon for an activity type (Zwift, Indoor, Ride, Run, Swim, Workout).

### `getLoadColor(tss)`
Returns Tailwind classes for border/background based on TSS (Training Stress Score):
- Red (≥150): Very hard
- Orange (≥100): Hard  
- Yellow (≥50): Moderate
- Green (>0): Easy
- Gray: No TSS data

### `getIconBackground(isRace)`
Returns background color classes for the activity icon container.

### `getCardBackground(isRace)`
Returns background color classes for the entire card.

## ActivityCard Component

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `activity` | Object | Yes | - | Activity data object |
| `isRace` | Boolean | No | false | Whether activity is tagged as race |
| `onClick` | Function | No | - | Handler when card is clicked |
| `onTagRace` | Function | No | - | Handler for race tag button |
| `onAICoach` | Function | No | - | Handler for AI coach button |
| `onEdit` | Function | No | - | Handler for edit button |
| `showActions` | Boolean | No | true | Whether to show action buttons |

### Responsive Behavior

**Desktop (≥ 1024px / lg breakpoint):**
- Horizontal single-row layout
- Metrics displayed on right side
- Action buttons on far right
- Title truncates at 500px max-width

**Tablet/Mobile (< 1024px):**
- Vertical stacked layout
- Action buttons below title (left-aligned)
- Metrics below actions (left-aligned)
- Title truncates at 280px (mobile) / 400px (tablet)

### Usage Example

```jsx
import ActivityCard from '../components/ActivityCard';

// In your component
<ActivityCard
  activity={activity}
  isRace={raceActivities[activity.id]}
  onClick={() => setSelectedActivity(activity)}
  onTagRace={(activity) => setEditingActivity(activity)}
  onAICoach={(activity) => setSelectedActivity({ ...activity, showAICoach: true })}
  onEdit={(activity) => setEditingActivity(activity)}
/>
```

### Minimal Usage (No Actions)

```jsx
<ActivityCard
  activity={activity}
  onClick={() => handleActivityClick(activity)}
  showActions={false}
/>
```

## Migration Guide

### Before (Dashboard.jsx)
```jsx
// Inline activity card with custom styling
<div className={`p-3 sm:p-4 border rounded-lg...`}>
  {/* 100+ lines of card markup */}
</div>
```

### After (Dashboard.jsx)
```jsx
import ActivityCard from '../components/ActivityCard';

<ActivityCard
  activity={activity}
  isRace={raceActivities[activity.id]}
  onClick={() => setSelectedActivity(activity)}
  onTagRace={(activity) => setEditingActivity(activity)}
  onAICoach={(activity) => setSelectedActivity({ ...activity, showAICoach: true })}
  onEdit={(activity) => setEditingActivity(activity)}
/>
```

## Benefits

1. **Consistency**: All activity cards look and behave the same across pages
2. **Maintainability**: Update styling in one place, applies everywhere
3. **Responsive**: Built-in responsive breakpoints (lg: 1024px)
4. **Flexible**: Optional action buttons, customizable handlers
5. **Dark Mode**: Full dark mode support built-in
6. **Accessibility**: Proper button labels and hover states

## Pages Using ActivityCard

- Dashboard (Recent Activities section)
- All Activities (Activity list)
- Future: Any page displaying activity lists

## Styling Customization

All styling is centralized in:
- `activityUtils.js` - Color schemes, backgrounds
- `ActivityCard.jsx` - Layout, spacing, typography

To customize globally, edit these files. For page-specific styling, wrap the component or pass custom classes via props.
