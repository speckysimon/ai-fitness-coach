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
    description: 'Default RiderLabs theme',
    config: {
      // Primary colors
      'primary': { light: '#2563EB', dark: '#3B82F6', label: 'Primary', category: 'primary' },
      'primary-hover': { light: '#1D4ED8', dark: '#2563EB', label: 'Primary Hover', category: 'primary' },
      
      // Secondary colors
      'secondary': { light: '#06B6D4', dark: '#22D3EE', label: 'Secondary', category: 'secondary' },
      'accent': { light: '#9333EA', dark: '#A855F7', label: 'Accent', category: 'secondary' },
      
      // Status colors
      'success': { light: '#10B981', dark: '#34D399', label: 'Success', category: 'status' },
      'warning': { light: '#F59E0B', dark: '#FBBF24', label: 'Warning', category: 'status' },
      'error': { light: '#EF4444', dark: '#F87171', label: 'Error', category: 'status' },
      'info': { light: '#3B82F6', dark: '#60A5FA', label: 'Info', category: 'status' },
      
      // Neutral colors
      'gray-50': { light: '#F9FAFB', dark: '#1F2937', label: 'Gray 50', category: 'neutral' },
      'gray-100': { light: '#F3F4F6', dark: '#374151', label: 'Gray 100', category: 'neutral' },
      'gray-200': { light: '#E5E7EB', dark: '#4B5563', label: 'Gray 200', category: 'neutral' },
      'gray-300': { light: '#D1D5DB', dark: '#6B7280', label: 'Gray 300', category: 'neutral' },
      'gray-400': { light: '#9CA3AF', dark: '#9CA3AF', label: 'Gray 400', category: 'neutral' },
      'gray-500': { light: '#6B7280', dark: '#D1D5DB', label: 'Gray 500', category: 'neutral' },
      'gray-600': { light: '#4B5563', dark: '#E5E7EB', label: 'Gray 600', category: 'neutral' },
      'gray-700': { light: '#374151', dark: '#F3F4F6', label: 'Gray 700', category: 'neutral' },
      'gray-800': { light: '#1F2937', dark: '#F9FAFB', label: 'Gray 800', category: 'neutral' },
      'gray-900': { light: '#111827', dark: '#FFFFFF', label: 'Gray 900', category: 'neutral' },
      
      // Activity colors
      'recovery': { light: '#10B981', dark: '#34D399', label: 'Recovery', category: 'activity' },
      'endurance': { light: '#3B82F6', dark: '#60A5FA', label: 'Endurance', category: 'activity' },
      'tempo': { light: '#F59E0B', dark: '#FBBF24', label: 'Tempo', category: 'activity' },
      'threshold': { light: '#F97316', dark: '#FB923C', label: 'Threshold', category: 'activity' },
      'vo2max': { light: '#EF4444', dark: '#F87171', label: 'VO2 Max', category: 'activity' },
      'sprint': { light: '#A855F7', dark: '#C084FC', label: 'Sprint', category: 'activity' },
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
