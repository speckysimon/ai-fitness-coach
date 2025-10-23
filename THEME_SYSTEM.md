# Theme System Implementation

## Overview
A complete dark/light theme system has been implemented based on the Brigetto KSE Komarom club logo colors.

## Club Colors Used
- **Primary Blue**: `#0066CC` (hsl: 211 100% 50%)
- **Black**: `#000000` (for dark mode backgrounds)
- **White**: `#FFFFFF` (for light mode backgrounds)

## Components Created

### 1. ThemeContext (`src/contexts/ThemeContext.jsx`)
- Manages theme state across the application
- Persists theme preference to localStorage
- Detects system preference on first load
- Provides `useTheme()` hook for components

### 2. ThemeSwitcher (`src/components/ThemeSwitcher.jsx`)
- Toggle button to switch between light and dark modes
- Shows Moon icon for dark mode, Sun icon for light mode
- Integrated into the sidebar Layout

## Files Modified

### 1. `src/index.css`
Updated CSS variables for both light and dark themes:

**Light Theme:**
- Background: White
- Primary: Club Blue (#0066CC)
- Text: Dark gray

**Dark Theme:**
- Background: Near black (#121212)
- Cards: Dark gray (#1A1A1A)
- Primary: Club Blue (#0066CC) - maintains brand identity
- Accent: Lighter blue for hover states
- Text: White/light gray

### 2. `tailwind.config.js`
- Added `darkMode: 'class'` to enable class-based dark mode

### 3. `src/App.jsx`
- Wrapped entire app with `<ThemeProvider>`

### 4. `src/components/Layout.jsx`
- Updated all color classes to use CSS variables
- Added ThemeSwitcher component to sidebar
- Changed hardcoded colors to theme-aware classes:
  - `bg-gray-50` → `bg-background`
  - `bg-white` → `bg-card`
  - `text-gray-900` → `text-foreground`
  - `border-gray-200` → `border-border`
  - etc.

## Usage

### For Users
1. Click the theme switcher button in the sidebar
2. Theme preference is automatically saved
3. Theme persists across sessions

### For Developers
To use the theme in components:

```jsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  return (
    <div className="bg-background text-foreground">
      Current theme: {theme}
    </div>
  );
}
```

### CSS Variables Available
Use these Tailwind classes for theme-aware styling:
- `bg-background` - Main background
- `bg-card` - Card backgrounds
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `bg-primary` - Primary brand color (blue)
- `text-primary` - Primary color text
- `border-border` - Borders
- `bg-muted` - Muted backgrounds
- `bg-accent` - Accent backgrounds

## Dark Mode Color Scheme
The dark theme uses a sophisticated color palette:
- **Background**: Very dark gray (almost black) for reduced eye strain
- **Cards**: Slightly lighter dark gray for depth
- **Primary Blue**: Maintains the club's signature blue color
- **Text**: High contrast white/light gray for readability
- **Borders**: Subtle dark borders for definition

## Benefits
1. **Brand Consistency**: Club blue color maintained in both themes
2. **User Preference**: Respects system preference and user choice
3. **Accessibility**: High contrast ratios in both modes
4. **Performance**: CSS variables enable instant theme switching
5. **Developer Experience**: Simple, consistent API for theme-aware components

## Next Steps
If you want to customize colors further, edit the CSS variables in `src/index.css` under the `:root` and `.dark` selectors.
