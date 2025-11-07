# Coach Avatar Size Update - October 31, 2025

## Summary
Updated coach avatar sizes to 300x300px for better visibility across the application.

## Changes Made

### 1. **CoachAvatarSelector.jsx** (Live Site - User-facing)
- **Main selector cards:** 300x300px (up from 96px)
- **Selected coach summary:** 48px (kept small for compact display)
- **Grid layout:** Changed from 3 columns to 2 columns to accommodate larger avatars
  - Before: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - After: `grid-cols-1 md:grid-cols-2`
  - Gap increased from 4 to 6 for better spacing

### 2. **CoachPersonasPage.jsx** (Admin Panel)
- **Persona list view:** 120px (up from 80px)
- **Form previews:** 64px (kept small for form context)
- **AI generated preview:** 256x256px (already large for review)

## Size Breakdown

| Location | Size | Purpose |
|----------|------|---------|
| **Live Site - Main Selector** | 300x300px | Large, easy to see coach photos |
| **Live Site - Selected Summary** | 48px | Compact confirmation display |
| **Admin - List View** | 120px | Medium size for management |
| **Admin - Form Preview** | 64px | Small preview in forms |
| **Admin - AI Preview** | 256x256px | Large preview for quality check |

## Layout Adjustments

### CoachAvatarSelector Grid
- **Mobile (< 768px):** 1 column - 300px avatars fit comfortably
- **Tablet/Desktop (≥ 768px):** 2 columns - 300px avatars fit with good spacing
- **Gap:** Increased to 6 (24px) for better visual separation

### Why Not 3 Columns?
300px avatars in a 3-column layout would be too cramped on most screens:
- Typical desktop: ~1200px width
- 3 columns with 300px avatars + padding = ~1050px minimum
- 2 columns provides better breathing room and focus

## Technical Implementation

### Using Inline Styles
```jsx
<img 
  src={coach.avatar_url}
  style={{ width: '300px', height: '300px' }}
  className="mx-auto mb-2 rounded-full object-cover border-2 border-gray-300"
/>
```

**Why inline styles instead of Tailwind?**
- Tailwind doesn't have a `w-75` class (300px)
- Custom sizes are cleaner with inline styles
- Easier to adjust exact pixel values

### Fallback for Emoji Avatars
Emoji avatars remain at `text-6xl` size, which scales appropriately with the larger cards.

## Responsive Behavior

### Mobile (< 768px)
```
┌─────────────────────┐
│   [300x300 Avatar]  │
│   Coach Name        │
│   Description       │
└─────────────────────┘
```

### Tablet/Desktop (≥ 768px)
```
┌──────────────┐  ┌──────────────┐
│ [300x300]    │  │ [300x300]    │
│ Coach 1      │  │ Coach 2      │
└──────────────┘  └──────────────┘
```

## Files Modified

1. `/src/components/CoachAvatarSelector.jsx`
   - Line 51: Grid layout (3 cols → 2 cols)
   - Line 76: Main avatar size (96px → 300px)
   - Line 121: Summary avatar size (48px, unchanged)

2. `/src/pages/admin/CoachPersonasPage.jsx`
   - Line 983: List view avatar (80px → 120px)
   - Line 992: Fallback emoji container (80px → 120px)
   - Form previews remain 64px (lines 564, 842)

## Testing Checklist

- [ ] Live site coach selector displays 300x300 avatars
- [ ] 2-column grid works on tablet/desktop
- [ ] 1-column grid works on mobile
- [ ] Selected coach summary shows 48px avatar
- [ ] Admin list view shows 120px avatars
- [ ] Admin form previews show 64px avatars
- [ ] AI generated preview shows 256x256px
- [ ] Emoji fallbacks display correctly
- [ ] No layout breaks on any screen size

## Design Rationale

### Why 300x300?
- **Better visibility:** Coach photos are now clearly visible
- **Professional appearance:** Larger images look more polished
- **User engagement:** Bigger avatars make selection more engaging
- **Photo quality:** Generated AI images (1024x1024) scale down well

### Why Different Sizes in Admin?
- **Context matters:** Form previews need to be compact
- **List view:** 120px is large enough to see clearly but doesn't dominate
- **AI preview:** 256px is perfect for quality checking before use

## Performance Impact

- **Minimal:** Images are already loaded at 1024x1024
- **Scaling down:** Browser handles downscaling efficiently
- **No additional requests:** Same image URLs, just displayed larger

## Future Enhancements

- [ ] Add lazy loading for avatars
- [ ] Optimize image sizes (serve 300x300 versions)
- [ ] Add image zoom on hover
- [ ] Consider 3-column layout for ultra-wide screens (>1600px)
