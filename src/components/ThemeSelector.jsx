import React, { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSelector = ({ className = '' }) => {
  const { availableThemes, selectedThemeId, setSelectedThemeId } = useTheme();
  const [allThemes, setAllThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadAllThemes();
  }, []);

  const loadAllThemes = async () => {
    try {
      // Fetch all themes (not just active one)
      const response = await fetch('/api/admin/theme-configs/all');
      const data = await response.json();

      if (data.success && data.themes) {
        setAllThemes(data.themes);
      } else {
        // Fallback to available themes from context
        setAllThemes(availableThemes);
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
      setAllThemes(availableThemes);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTheme = (themeId) => {
    setSelectedThemeId(themeId);
    setShowDropdown(false);
  };

  const selectedTheme = allThemes.find(t => t.id === selectedThemeId) || allThemes[0];

  if (loading || allThemes.length === 0) {
    return null;
  }

  const handleToggleDropdown = () => {
    if (!showDropdown) {
      // Reload themes when opening dropdown to ensure we have latest
      loadAllThemes();
    }
    setShowDropdown(!showDropdown);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleToggleDropdown}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500"
        title="Choose theme"
      >
        <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedTheme?.name || 'Select Theme'}
        </span>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Choose Theme
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select a color theme for the app
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {allThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${theme.id === selectedThemeId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {theme.name}
                        </span>
                        {theme.id === selectedThemeId && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      {theme.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {theme.description}
                        </p>
                      )}

                      {/* Color preview */}
                      {theme.config && (
                        <div className="flex gap-1 mt-2">
                          {theme.config.primary && (
                            <div
                              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: theme.config.primary.light }}
                              title="Primary"
                            />
                          )}
                          {theme.config.secondary && (
                            <div
                              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: theme.config.secondary.light }}
                              title="Secondary"
                            />
                          )}
                          {theme.config.accent && (
                            <div
                              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: theme.config.accent.light }}
                              title="Accent"
                            />
                          )}
                          {theme.config.success && (
                            <div
                              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: theme.config.success.light }}
                              title="Success"
                            />
                          )}
                          {theme.config.warning && (
                            <div
                              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: theme.config.warning.light }}
                              title="Warning"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Themes managed in Admin Panel
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;
