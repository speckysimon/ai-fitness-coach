/**
 * User Preferences Service
 * Handles saving/loading preferences from backend with localStorage fallback
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const preferencesService = {
  /**
   * Save user preferences to backend (and localStorage as backup)
   */
  async savePreferences(userId, preferences) {
    try {
      // Save to localStorage first (immediate)
      if (preferences.ftp) localStorage.setItem('user_ftp', preferences.ftp);
      if (preferences.timezone) localStorage.setItem('user_timezone', preferences.timezone);
      if (preferences.theme) localStorage.setItem('theme', preferences.theme);
      
      // Then save to backend
      const response = await fetch(`${API_BASE}/api/user/preferences/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ftp: preferences.ftp,
          timezone: preferences.timezone,
          theme: preferences.theme,
          otherSettings: preferences.other,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save preferences to backend');
        return { success: false, source: 'localStorage' };
      }
      
      return { success: true, source: 'backend' };
    } catch (error) {
      console.error('Error saving preferences:', error);
      return { success: false, source: 'localStorage', error };
    }
  },

  /**
   * Load user preferences from backend (with localStorage fallback)
   */
  async loadPreferences(userId) {
    try {
      const response = await fetch(`${API_BASE}/api/user/preferences/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load preferences from backend');
      }
      
      const { preferences } = await response.json();
      
      if (preferences) {
        // Save to localStorage as cache
        if (preferences.ftp) localStorage.setItem('user_ftp', preferences.ftp);
        if (preferences.timezone) localStorage.setItem('user_timezone', preferences.timezone);
        if (preferences.theme) localStorage.setItem('theme', preferences.theme);
        
        return { 
          preferences: {
            ftp: preferences.ftp,
            timezone: preferences.timezone,
            theme: preferences.theme,
            other: preferences.other_settings,
          },
          source: 'backend' 
        };
      }
      
      // No preferences in backend, try localStorage
      const localPrefs = {
        ftp: localStorage.getItem('user_ftp'),
        timezone: localStorage.getItem('user_timezone'),
        theme: localStorage.getItem('theme'),
      };
      
      if (localPrefs.ftp || localPrefs.timezone || localPrefs.theme) {
        return { 
          preferences: localPrefs, 
          source: 'localStorage',
          needsMigration: true 
        };
      }
      
      return { preferences: null, source: null };
    } catch (error) {
      console.error('Error loading preferences from backend, using localStorage:', error);
      
      // Fallback to localStorage
      const localPrefs = {
        ftp: localStorage.getItem('user_ftp'),
        timezone: localStorage.getItem('user_timezone'),
        theme: localStorage.getItem('theme'),
      };
      
      return { 
        preferences: localPrefs, 
        source: 'localStorage',
        error 
      };
    }
  },

  /**
   * Update single preference field
   */
  async updateField(userId, field, value) {
    try {
      // Update localStorage first
      const storageKey = field === 'ftp' ? 'user_ftp' : 
                        field === 'timezone' ? 'user_timezone' : 
                        field === 'theme' ? 'theme' : null;
      
      if (storageKey) {
        localStorage.setItem(storageKey, value);
      }
      
      // Then update backend
      const response = await fetch(`${API_BASE}/api/user/preferences/${userId}/${field}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      
      if (!response.ok) {
        console.error(`Failed to update ${field} in backend`);
        return { success: false, source: 'localStorage' };
      }
      
      return { success: true, source: 'backend' };
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      return { success: false, source: 'localStorage', error };
    }
  },

  /**
   * Migrate localStorage preferences to backend
   */
  async migratePreferences(userId) {
    try {
      const preferences = {
        ftp: localStorage.getItem('user_ftp'),
        timezone: localStorage.getItem('user_timezone'),
        theme: localStorage.getItem('theme'),
      };
      
      if (!preferences.ftp && !preferences.timezone && !preferences.theme) {
        return { success: false, message: 'No preferences to migrate' };
      }
      
      const result = await this.savePreferences(userId, preferences);
      
      if (result.success) {
        localStorage.setItem('preferences_migrated', 'true');
        return { success: true };
      }
      
      return { success: false, message: 'Migration failed' };
    } catch (error) {
      console.error('Error migrating preferences:', error);
      return { success: false, error };
    }
  },
};
