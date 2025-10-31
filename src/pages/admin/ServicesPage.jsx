import React, { useState, useEffect } from 'react';
import { Cloud, Calendar, Activity, MapPin, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const ServicesPage = () => {
  const [services, setServices] = useState({
    weather: { enabled: true, name: 'Weather Widget', description: 'OpenWeather API integration for training recommendations' },
    google_calendar: { enabled: true, name: 'Google Calendar', description: 'Sync training plans to Google Calendar' },
    strava: { enabled: true, name: 'Strava Integration', description: 'Activity tracking and synchronization' },
    notifications: { enabled: true, name: 'Notifications', description: 'Push notifications for workouts and reminders' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadServiceSettings();
  }, []);

  const loadServiceSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        // Map settings to services
        const serviceSettings = {};
        data.settings.forEach(setting => {
          if (setting.key.startsWith('service_')) {
            const serviceName = setting.key.replace('service_', '');
            if (services[serviceName]) {
              serviceSettings[serviceName] = {
                ...services[serviceName],
                enabled: setting.value === 'true' || setting.value === true
              };
            }
          }
        });
        
        // Merge with defaults
        setServices({ ...services, ...serviceSettings });
      }
    } catch (error) {
      console.error('Error loading service settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleService = async (serviceKey) => {
    const newState = !services[serviceKey].enabled;
    
    // Optimistic update
    setServices({
      ...services,
      [serviceKey]: { ...services[serviceKey], enabled: newState }
    });

    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/settings/service_${serviceKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: newState }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`${services[serviceKey].name} ${newState ? 'enabled' : 'disabled'} successfully`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        // Revert on error
        setServices({
          ...services,
          [serviceKey]: { ...services[serviceKey], enabled: !newState }
        });
      }
    } catch (error) {
      console.error('Error updating service:', error);
      // Revert on error
      setServices({
        ...services,
        [serviceKey]: { ...services[serviceKey], enabled: !newState }
      });
    } finally {
      setSaving(false);
    }
  };

  const getServiceIcon = (key) => {
    const icons = {
      weather: Cloud,
      google_calendar: Calendar,
      strava: Activity,
      notifications: MapPin,
    };
    return icons[key] || Activity;
  };

  const getServiceColor = (key) => {
    const colors = {
      weather: { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-500' },
      google_calendar: { bg: 'bg-green-100', text: 'text-green-600', ring: 'ring-green-500' },
      strava: { bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-500' },
      notifications: { bg: 'bg-purple-100', text: 'text-purple-600', ring: 'ring-purple-500' },
    };
    return colors[key] || { bg: 'bg-gray-100', text: 'text-gray-600', ring: 'ring-gray-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Management</h1>
          <p className="text-gray-600 mt-1">Enable or disable third-party integrations and features</p>
        </div>
        <Button onClick={loadServiceSettings} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Disabling a service will prevent all users from accessing that feature. 
          Make sure the corresponding API keys are configured in the API Keys page.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(services).map(([key, service]) => {
          const Icon = getServiceIcon(key);
          const colors = getServiceColor(key);
          
          return (
            <Card 
              key={key} 
              className={`transition-all ${service.enabled ? `ring-2 ${colors.ring}` : 'opacity-75'}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${colors.bg}`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      service.enabled 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {service.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={service.enabled}
                      onChange={() => handleToggleService(key)}
                      disabled={saving}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Additional Info */}
                {key === 'weather' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      Requires: OpenWeather API key configured
                    </p>
                  </div>
                )}
                {key === 'google_calendar' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      Requires: Google OAuth credentials configured
                    </p>
                  </div>
                )}
                {key === 'strava' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      Requires: Strava API credentials configured
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Service Dependencies */}
      <Card>
        <CardHeader>
          <CardTitle>Service Dependencies</CardTitle>
          <CardDescription>Required API keys and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Weather Widget</p>
                <p className="text-sm text-gray-600">OpenWeather API key</p>
              </div>
              <span className="text-xs text-gray-500">API Keys → openweather</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Google Calendar</p>
                <p className="text-sm text-gray-600">Google OAuth credentials</p>
              </div>
              <span className="text-xs text-gray-500">API Keys → google</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Strava Integration</p>
                <p className="text-sm text-gray-600">Strava client secret</p>
              </div>
              <span className="text-xs text-gray-500">API Keys → strava</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicesPage;
