# Dark Mode Issue - CSS Variables Not Switching

## The Problem

Our current implementation doesn't work because:

```jsx
// ❌ This doesn't work:
className="text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]"
```

**Why it fails:**
- Tailwind's `dark:` prefix expects a different CLASS, not a different CSS variable
- The CSS variable `--color-primary` is always the same value regardless of dark mode
- We're setting TWO separate variables (`--color-primary` and `--color-primary-dark`) but only using one

## The Solution

We need to make the CSS variable ITSELF change based on dark mode:

```css
/* In index.css */
:root {
  --color-primary: #2563EB;  /* Light mode value */
}

.dark {
  --color-primary: #3B82F6;  /* Dark mode value - SAME variable name! */
}
```

Then in components:
```jsx
// ✅ This works:
className="text-[var(--color-primary)]"  // No dark: prefix needed!
```

## Current State

**themeService.js sets:**
```javascript
root.style.setProperty('--color-primary', colorValue.light);
root.style.setProperty('--color-primary-dark', colorValue.dark);
```

**Components use:**
```jsx
className="text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]"
```

## What We Need

**themeService.js should set:**
```javascript
// Set on :root (light mode)
document.documentElement.style.setProperty('--color-primary', colorValue.light);

// Set on .dark (dark mode)
// We need to find or create the .dark selector and set the variable there
```

**Components use:**
```jsx
className="text-[var(--color-primary)]"  // Automatically switches!
```

## The Fix

### Option 1: Update themeService.js (Recommended)

Modify `applyTheme()` to set variables on both `:root` and `.dark`:

```javascript
export function applyTheme(themeConfig) {
  if (!themeConfig || !themeConfig.config) {
    console.warn('No theme config provided');
    return;
  }
  
  const root = document.documentElement;
  const config = themeConfig.config;
  
  // Create or get style element for dark mode overrides
  let darkStyle = document.getElementById('theme-dark-vars');
  if (!darkStyle) {
    darkStyle = document.createElement('style');
    darkStyle.id = 'theme-dark-vars';
    document.head.appendChild(darkStyle);
  }
  
  let darkCSS = '.dark {\n';
  
  Object.keys(config).forEach(colorName => {
    const colorValue = config[colorName];
    
    if (colorValue && typeof colorValue === 'object') {
      // Set light mode color on :root
      if (colorValue.light) {
        root.style.setProperty(`--color-${colorName}`, colorValue.light);
      }
      // Add dark mode color to CSS
      if (colorValue.dark) {
        darkCSS += `  --color-${colorName}: ${colorValue.dark};\n`;
      }
    }
  });
  
  darkCSS += '}';
  darkStyle.textContent = darkCSS;
  
  console.log(`✅ Applied theme: ${themeConfig.name} (${Object.keys(config).length} colors)`);
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: themeConfig }));
}
```

### Option 2: Update index.css (Manual)

Add dark mode overrides in index.css:

```css
.dark {
  --color-primary: var(--color-primary-dark);
  --color-secondary: var(--color-secondary-dark);
  /* ... etc for all colors */
}
```

But this requires updating index.css every time themes change.

## Recommendation

**Use Option 1** - Update themeService.js to dynamically inject dark mode CSS.

This way:
1. ✅ Themes work automatically
2. ✅ Dark mode switches colors
3. ✅ No manual CSS updates needed
4. ✅ Components simplified (no `dark:` prefix needed)

## Updated Component Pattern

### Before (doesn't work):
```jsx
<div className="text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]">
```

### After (works):
```jsx
<div className="text-[var(--color-primary)]">
```

The variable automatically changes when `.dark` class is on `<html>`!

## Action Items

1. ✅ Update `src/lib/themeService.js` with new `applyTheme()` function
2. ✅ Simplify all components - remove `dark:text-[var(--color-primary-dark)]`
3. ✅ Test with all 6 themes in both light and dark modes
4. ✅ Verify colors switch properly

## Testing

After fix:
1. Select Mountain Meadow theme
2. Toggle dark mode
3. Colors should change from #1abc9c (light) to #16a286 (dark)
4. Repeat for all themes

---

**Status:** Issue identified, solution ready to implement!
