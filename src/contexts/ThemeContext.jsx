import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchActiveTheme, applyTheme as applyThemeColors } from '../lib/themeService';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Light/Dark mode toggle
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('theme_mode');
    if (savedMode) return savedMode;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Available themes from admin
  const [availableThemes, setAvailableThemes] = useState([]);
  
  // Selected theme ID
  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    const saved = localStorage.getItem('selected_theme_id');
    return saved ? parseInt(saved) : null;
  });

  // Load available themes from admin API
  useEffect(() => {
    const loadThemes = async () => {
      try {
        const response = await fetch('/api/admin/theme-configs/active');
        const data = await response.json();
        
        if (data.success && data.theme) {
          // For now, we'll use the active theme from admin
          // In the future, we can fetch all themes and let users choose
          setAvailableThemes([data.theme]);
          if (!selectedThemeId) {
            setSelectedThemeId(data.theme.id);
          }
        }
      } catch (error) {
        console.error('Failed to load themes:', error);
      }
    };

    loadThemes();
  }, []);

  // Apply light/dark mode class
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    localStorage.setItem('theme_mode', mode);
  }, [mode]);

  // Apply theme colors when theme changes
  useEffect(() => {
    const applySelectedTheme = async () => {
      if (selectedThemeId) {
        try {
          // Fetch all themes to get the selected one
          const response = await fetch('/api/admin/theme-configs/all');
          const data = await response.json();
          
          if (data.success && data.themes) {
            const theme = data.themes.find(t => t.id === selectedThemeId);
            if (theme) {
              applyThemeColors(theme);
              localStorage.setItem('selected_theme_id', selectedThemeId.toString());
            }
          }
        } catch (error) {
          console.error('Failed to apply theme:', error);
        }
      }
    };

    applySelectedTheme();
  }, [selectedThemeId]);

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  const value = {
    mode,
    setMode,
    toggleMode,
    availableThemes,
    selectedThemeId,
    setSelectedThemeId,
    // Legacy support
    theme: mode,
    setTheme: setMode,
    toggleTheme: toggleMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
