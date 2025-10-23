# Theme Migration Guide

## Quick Reference: Color Class Replacements

When updating components to support dark mode, replace hardcoded Tailwind color classes with theme-aware CSS variables:

### Backgrounds
| Old Class | New Class | Usage |
|-----------|-----------|-------|
| `bg-white` | `bg-card` | Card/panel backgrounds |
| `bg-gray-50` | `bg-background` or `bg-muted` | Page backgrounds or subtle backgrounds |
| `bg-gray-100` | `bg-muted` | Muted backgrounds |
| `bg-gray-900` | `bg-card dark:bg-card` | Already theme-aware via CSS vars |

### Text Colors
| Old Class | New Class | Usage |
|-----------|-----------|-------|
| `text-gray-900` | `text-foreground` | Primary text |
| `text-gray-800` | `text-foreground` | Primary text |
| `text-gray-700` | `text-foreground` | Primary text |
| `text-gray-600` | `text-muted-foreground` | Secondary text |
| `text-gray-500` | `text-muted-foreground` | Muted text |
| `text-gray-400` | `text-muted-foreground` | Muted text |

### Borders
| Old Class | New Class | Usage |
|-----------|-----------|-------|
| `border-gray-200` | `border-border` | Standard borders |
| `border-gray-300` | `border-border` | Standard borders |

### Primary/Brand Colors
Keep these as-is - they're already theme-aware:
- `bg-blue-500`, `bg-blue-600` → Use `bg-primary` for brand color
- `text-blue-600`, `text-blue-700` → Use `text-primary` for brand color

### Special Cases
- Terminal/code blocks: Keep `bg-gray-900` and `text-green-400` for that terminal aesthetic
- Colored badges/alerts: Keep specific colors (green, red, yellow, etc.) for semantic meaning
- Gradients: Keep as-is or create dark mode variants

## Example Migration

### Before:
```jsx
<div className="bg-white border border-gray-200 rounded-lg">
  <h2 className="text-gray-900 font-bold">Title</h2>
  <p className="text-gray-600">Description</p>
</div>
```

### After:
```jsx
<div className="bg-card border border-border rounded-lg">
  <h2 className="text-foreground font-bold">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

## Priority Pages to Update

1. **High Priority** (User-facing, frequently used):
   - Dashboard
   - Calendar
   - PlanGenerator
   - AllActivities
   - Settings

2. **Medium Priority**:
   - RaceAnalytics
   - RiderProfile
   - FTPHistory
   - Form

3. **Low Priority** (Less frequently accessed):
   - Methodology
   - PrivacyPolicy
   - TermsOfService
   - ChangelogPage

## Testing Checklist

After updating a page:
- [ ] Check in light mode - everything readable?
- [ ] Check in dark mode - everything readable?
- [ ] Check hover states work in both modes
- [ ] Check focus states are visible
- [ ] Check any custom colored elements (charts, badges) still look good

## Notes
- The Card component (`src/components/ui/Card.jsx`) is already theme-aware
- The Layout component is already updated
- Any component using the Card component will automatically get theme support for the card itself
- Focus on updating the content inside cards and page-level backgrounds
