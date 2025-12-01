/**
 * Theme Service - FIXED VERSION
 * Copy this to: src/lib/themeService.js
 * 
 * This version properly handles dark mode by injecting CSS that changes
 * the CSS variables when .dark class is present on <html>
 */

const THEME_CACHE_KEY = 'active_theme';
const THEME_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Fetch the active theme from the API
 * @returns {Promise<Object|null>} Theme configuration or null
 */
export async function fetchActiveTheme() {
  try {
    const response = await fetch('/api/admin/theme-configs/active');
    const data = await response.json();

    if (data.success && data.theme) {
      // Cache the theme
      const cacheData = {
        theme: data.theme,
        timestamp: Date.now()
      };
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cacheData));
      return data.theme;
    }

    return null;
  } catch (error) {
    console.error('Error fetching active theme:', error);
    return null;
  }
}

/**
 * Get cached theme if available and not expired
 * @returns {Object|null} Cached theme or null
 */
export function getCachedTheme() {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (!cached) return null;

    const { theme, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > THEME_CACHE_DURATION;

    if (isExpired) {
      localStorage.removeItem(THEME_CACHE_KEY);
      return null;
    }

    return theme;
  } catch (error) {
    console.error('Error reading cached theme:', error);
    return null;
  }
}

/**
 * Clear theme cache
 */
export function clearThemeCache() {
  localStorage.removeItem(THEME_CACHE_KEY);
}

/**
 * Apply theme colors to CSS custom properties
 * FIXED: Now properly handles dark mode by injecting CSS
 * @param {Object} themeConfig - Theme configuration object
 */
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

  // Apply each color
  Object.keys(config).forEach(colorName => {
    const colorValue = config[colorName];

    if (colorValue && typeof colorValue === 'object') {
      // Set light mode color on :root
      if (colorValue.light) {
        root.style.setProperty(`--color-${colorName}`, colorValue.light);
      }
      // Add dark mode color to injected CSS
      if (colorValue.dark) {
        darkCSS += `  --color-${colorName}: ${colorValue.dark};\n`;
      }
    }
  });

  darkCSS += '}';
  darkStyle.textContent = darkCSS;

  console.log(`✅ Applied theme: ${themeConfig.name} (${Object.keys(config).length} colors)`);
  console.log(`🌙 Dark mode CSS injected with ${Object.keys(config).length} color overrides`);

  // Dispatch custom event so components can react to theme changes
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: themeConfig }));
}

/**
 * Get default theme configuration (fallback)
 * @returns {Object} Default theme config
 */
export function getDefaultTheme() {
  return {
    name: 'Default',
    description: 'Default RiderLabs theme - Consolidated 12 colors',
    config: {
      // Brand colors (2)
      'primary': { light: '#2563EB', dark: '#3B82F6', label: 'Primary', category: 'brand' },
      'accent': { light: '#4F46E5', dark: '#6366F1', label: 'Accent', category: 'brand' },

      // Status colors (3)
      'success': { light: '#10B981', dark: '#34D399', label: 'Success', category: 'status' },
      'warning': { light: '#F59E0B', dark: '#FBBF24', label: 'Warning', category: 'status' },
      'error': { light: '#EF4444', dark: '#F87171', label: 'Error', category: 'status' },

      // Activity colors (6)
      'recovery': { light: '#10B981', dark: '#34D399', label: 'Recovery', category: 'activity' },
      'endurance': { light: '#3B82F6', dark: '#60A5FA', label: 'Endurance', category: 'activity' },
      'tempo': { light: '#F59E0B', dark: '#FBBF24', label: 'Tempo', category: 'activity' },
      'threshold': { light: '#F97316', dark: '#FB923C', label: 'Threshold', category: 'activity' },
      'vo2max': { light: '#EF4444', dark: '#F87171', label: 'VO2 Max', category: 'activity' },
      'sprint': { light: '#4F46E5', dark: '#6366F1', label: 'Sprint', category: 'activity' },
    }
  };
}

/**
 * Initialize theme system
 * Loads cached theme or fetches from API
 * @returns {Promise<Object>} Applied theme configuration
 */
export async function initializeTheme() {
  // Try to get cached theme first
  let theme = getCachedTheme();

  if (theme) {
    console.log('📦 Using cached theme:', theme.name);
    applyTheme(theme);

    // Fetch fresh theme in background
    fetchActiveTheme().then(freshTheme => {
      if (freshTheme && freshTheme.id !== theme.id) {
        console.log('🔄 Theme updated, applying new theme');
        applyTheme(freshTheme);
      }
    });

    return theme;
  }

  // No cache, fetch from API
  theme = await fetchActiveTheme();

  if (theme) {
    applyTheme(theme);
    return theme;
  }

  // No theme from API, use default
  console.log('⚠️ No active theme found, using default');
  const defaultTheme = getDefaultTheme();
  applyTheme(defaultTheme);
  return defaultTheme;
}

/**
 * Reload theme from API (useful after admin changes)
 * @returns {Promise<Object|null>} New theme configuration
 */
export async function reloadTheme() {
  clearThemeCache();
  const theme = await fetchActiveTheme();

  if (theme) {
    applyTheme(theme);
    return theme;
  }

  return null;
}
