import React, { useState, useEffect } from 'react';
import { Settings, Save, Shield, AlertCircle } from 'lucide-react';
import { AdminCard as Card, AdminCardContent as CardContent, AdminCardHeader as CardHeader, AdminCardTitle as CardTitle, AdminCardDescription as CardDescription } from '../../components/ui/AdminCard';
import { AdminButton as Button } from '../../components/ui/AdminButton';

const GlobalSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      console.log('📊 Loaded settings:', data.settings);
      console.log('📊 Limits settings:', data.settings?.filter(s => s.category === 'limits'));
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Setting updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    const category = setting.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {});

  // Helper to get validation rules for specific settings
  const getValidationRules = (key) => {
    const rules = {
      max_ai_chats_per_day: { min: 1, max: 100, step: 1 },
      max_plan_generations_per_day: { min: 1, max: 50, step: 1 },
      max_users: { min: 1, max: 100000, step: 1 },
      notification_frequency_hours: { min: 1, max: 24, step: 1 },
    };
    return rules[key] || { min: 0, step: 1 };
  };

  // Helper to get category descriptions
  const getCategoryDescription = (category) => {
    const descriptions = {
      limits: 'Control usage limits and rate limiting for users',
      notifications: 'Configure notification behavior and frequency',
      system: 'System-wide configuration options',
    };
    return descriptions[category] || '';
  };

  // Helper to get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      limits: Shield,
      notifications: AlertCircle,
      system: Settings,
    };
    const Icon = icons[category] || Settings;
    return <Icon className="w-5 h-5 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Global Settings</h1>
        <p className="text-gray-600 mt-1">Configure application-wide settings</p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <Card key={category}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {getCategoryIcon(category)}
              <div>
                <CardTitle className="capitalize">{category} Settings</CardTitle>
                {getCategoryDescription(category) && (
                  <CardDescription className="mt-1">
                    {getCategoryDescription(category)}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categorySettings.map((setting) => (
                <div
                  key={setting.setting_key}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {setting.setting_key.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="ml-4">
                    {setting.setting_type === 'boolean' ? (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setting.setting_value === 'true'}
                          onChange={(e) =>
                            handleUpdateSetting(setting.setting_key, e.target.checked.toString())
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    ) : setting.setting_type === 'number' ? (
                      <input
                        type="number"
                        value={setting.setting_value}
                        {...getValidationRules(setting.setting_key)}
                        onChange={(e) => {
                          const newSettings = settings.map((s) =>
                            s.setting_key === setting.setting_key
                              ? { ...s, setting_value: e.target.value }
                              : s
                          );
                          setSettings(newSettings);
                        }}
                        onBlur={(e) =>
                          handleUpdateSetting(setting.setting_key, e.target.value)
                        }
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={setting.setting_value}
                        onChange={(e) => {
                          const newSettings = settings.map((s) =>
                            s.setting_key === setting.setting_key
                              ? { ...s, setting_value: e.target.value }
                              : s
                          );
                          setSettings(newSettings);
                        }}
                        onBlur={(e) =>
                          handleUpdateSetting(setting.setting_key, e.target.value)
                        }
                        className="w-64 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GlobalSettings;
