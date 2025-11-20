/**
 * Global Settings Service
 * Manages application-wide settings that affect all users
 * Uses better-sqlite3 via adminDb helper (migrated from sqlite3)
 */

const adminDb = require('../adminDb.cjs');

class GlobalSettingsService {
  /**
   * Get a setting by key
   */
  async getSetting(key) {
    return new Promise((resolve, reject) => {
      try {
        const setting = adminDb.get(
          `SELECT * FROM global_settings WHERE setting_key = ?`,
          [key]
        );
        
        if (!setting) {
          reject(new Error(`Setting ${key} not found`));
        } else {
          resolve({
            ...setting,
            value: this.parseValue(setting.setting_value, setting.setting_type),
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    return new Promise((resolve, reject) => {
      try {
        const settings = adminDb.all(
          `SELECT * FROM global_settings ORDER BY category, setting_key`
        );
        
        resolve(
          settings.map((setting) => ({
            ...setting,
            value: this.parseValue(setting.setting_value, setting.setting_type),
          }))
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category) {
    return new Promise((resolve, reject) => {
      try {
        const settings = adminDb.all(
          `SELECT * FROM global_settings WHERE category = ? ORDER BY setting_key`,
          [category]
        );
        
        resolve(
          settings.map((setting) => ({
            ...setting,
            value: this.parseValue(setting.setting_value, setting.setting_type),
          }))
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Update a setting
   */
  async updateSetting(key, value, updatedBy) {
    return new Promise((resolve, reject) => {
      try {
        // First get the setting to know its type
        const setting = adminDb.get(
          `SELECT setting_type FROM global_settings WHERE setting_key = ?`,
          [key]
        );
        
        if (!setting) {
          reject(new Error(`Setting ${key} not found`));
        } else {
          const stringValue = this.stringifyValue(value, setting.setting_type);

          const result = adminDb.run(
            `UPDATE global_settings 
             SET setting_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE setting_key = ?`,
            [stringValue, updatedBy, key]
          );
          
          if (result.changes === 0) {
            reject(new Error(`Setting ${key} not found`));
          } else {
            resolve({ key, value });
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Create a new setting
   */
  async createSetting({ key, value, type = 'string', category, description }) {
    const stringValue = this.stringifyValue(value, type);

    return new Promise((resolve, reject) => {
      try {
        const result = adminDb.run(
          `INSERT INTO global_settings 
           (setting_key, setting_value, setting_type, category, description) 
           VALUES (?, ?, ?, ?, ?)`,
          [key, stringValue, type, category, description]
        );
        
        resolve({ id: result.lastInsertRowid, key, value });
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          reject(new Error(`Setting ${key} already exists`));
        } else {
          reject(err);
        }
      }
    });
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key) {
    return new Promise((resolve, reject) => {
      try {
        const result = adminDb.run(
          `DELETE FROM global_settings WHERE setting_key = ?`,
          [key]
        );
        
        if (result.changes === 0) {
          reject(new Error(`Setting ${key} not found`));
        } else {
          resolve({ key });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Parse value based on type
   */
  parseValue(stringValue, type) {
    switch (type) {
      case 'boolean':
        return stringValue === 'true';
      case 'number':
        return parseFloat(stringValue);
      case 'json':
        return JSON.parse(stringValue);
      default:
        return stringValue;
    }
  }

  /**
   * Stringify value based on type
   */
  stringifyValue(value, type) {
    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
        return value.toString();
      case 'json':
        return JSON.stringify(value);
      default:
        return value.toString();
    }
  }

  /**
   * Get notification settings (convenience method)
   */
  async getNotificationSettings() {
    return this.getSettingsByCategory('notifications');
  }

  /**
   * Update notification settings (convenience method)
   */
  async updateNotificationSettings({ enabled, frequencyHours }, updatedBy) {
    const updates = [];

    if (enabled !== undefined) {
      updates.push(this.updateSetting('notifications_enabled', enabled, updatedBy));
    }

    if (frequencyHours !== undefined) {
      updates.push(
        this.updateSetting('notification_frequency_hours', frequencyHours, updatedBy)
      );
    }

    return Promise.all(updates);
  }

  /**
   * Get system settings (convenience method)
   */
  async getSystemSettings() {
    return this.getSettingsByCategory('system');
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(featureKey) {
    try {
      const setting = await this.getSetting(featureKey);
      return setting.value === true;
    } catch (error) {
      // If setting doesn't exist, assume feature is enabled
      return true;
    }
  }

  /**
   * Get all categories
   */
  async getCategories() {
    return new Promise((resolve, reject) => {
      try {
        const rows = adminDb.all(
          `SELECT DISTINCT category FROM global_settings WHERE category IS NOT NULL ORDER BY category`
        );
        
        resolve(rows.map((row) => row.category));
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new GlobalSettingsService();
