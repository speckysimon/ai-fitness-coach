import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, TestTube2 } from 'lucide-react';
import { Button } from './ui/Button';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  sendTestNotification,
  sendMotivationalNotification,
  NotificationStatus,
} from '../lib/notificationService';
import { getCoachPersona, getUserCoach } from '../lib/coachPersonas';

const NotificationSettings = () => {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [preferences, setPreferences] = useState(getNotificationPreferences());
  const [requesting, setRequesting] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [saved, setSaved] = useState(false);

  const coach = getCoachPersona(getUserCoach());
  const isSupported = isNotificationSupported();

  useEffect(() => {
    // Update permission status when component mounts
    setPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);

      if (result === NotificationStatus.GRANTED) {
        // Auto-enable notifications when permission granted
        const newPrefs = { ...preferences, enabled: true };
        setPreferences(newPrefs);
        saveNotificationPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      alert('Failed to request notification permission. Please check your browser settings.');
    } finally {
      setRequesting(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    saveNotificationPreferences(newPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestNotification = async () => {
    if (permission !== NotificationStatus.GRANTED) {
      alert('Please enable notifications first');
      return;
    }

    try {
      await sendTestNotification();
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification. Please check your browser settings.');
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <BellOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Notifications Not Supported</h3>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Your browser doesn't support notifications. Please use a modern browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {permission === NotificationStatus.GRANTED ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-gray-400" />
            )}
            <span className="font-semibold text-gray-900 dark:text-white">
              Browser Permission
            </span>
          </div>
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${permission === NotificationStatus.GRANTED
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : permission === NotificationStatus.DENIED
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}
          >
            {permission === NotificationStatus.GRANTED
              ? 'Enabled'
              : permission === NotificationStatus.DENIED
                ? 'Blocked'
                : 'Not Set'}
          </span>
        </div>

        {permission !== NotificationStatus.GRANTED && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {permission === NotificationStatus.DENIED
                ? 'You previously blocked notifications. Please enable them in your browser settings.'
                : 'Allow notifications to receive workout reminders on your device.'}
            </p>
            {permission !== NotificationStatus.DENIED && (
              <Button
                onClick={handleRequestPermission}
                disabled={requesting}
                className="w-full"
              >
                {requesting ? 'Requesting...' : 'Enable Notifications'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Notification Settings (only show if permission granted) */}
      {permission === NotificationStatus.GRANTED && (
        <>
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Workout Reminders
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notified before your scheduled workouts
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) => handlePreferenceChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Reminder Timing */}
          <div className="space-y-3">
            <label className="block">
              <span className="font-semibold text-gray-900 dark:text-white">
                Reminder Time
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                How many hours before your workout should we remind you?
              </p>
              <select
                value={preferences.reminderHours}
                onChange={(e) =>
                  handlePreferenceChange('reminderHours', parseInt(e.target.value))
                }
                disabled={!preferences.enabled}
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value={1}>1 hour before</option>
                <option value={2}>2 hours before</option>
                <option value={3}>3 hours before</option>
                <option value={4}>4 hours before</option>
                <option value={6}>6 hours before</option>
                <option value={12}>12 hours before</option>
                <option value={24}>24 hours before</option>
              </select>
            </label>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-3">
            <span className="font-semibold text-gray-900 dark:text-white">
              Quiet Hours
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't send notifications during these hours
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Start</span>
                <select
                  value={preferences.quietHoursStart}
                  onChange={(e) =>
                    handlePreferenceChange('quietHoursStart', parseInt(e.target.value))
                  }
                  disabled={!preferences.enabled}
                  className="w-full mt-1 px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">End</span>
                <select
                  value={preferences.quietHoursEnd}
                  onChange={(e) =>
                    handlePreferenceChange('quietHoursEnd', parseInt(e.target.value))
                  }
                  disabled={!preferences.enabled}
                  className="w-full mt-1 px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Key Workouts Only */}
          <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Key Workouts Only
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Only notify for hard sessions (threshold, VO2max, race, long rides)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notifyOnlyKeyWorkouts}
                onChange={(e) =>
                  handlePreferenceChange('notifyOnlyKeyWorkouts', e.target.checked)
                }
                disabled={!preferences.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Workout Motivation Frequency */}
          <div className="space-y-3">
            <label className="block">
              <span className="font-semibold text-gray-900 dark:text-white">
                Workout Motivation
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                How often should {coach.name} send you motivational messages?
              </p>
              <select
                value={preferences.motivationFrequency}
                onChange={(e) =>
                  handlePreferenceChange('motivationFrequency', e.target.value)
                }
                disabled={!preferences.enabled}
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="never">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>

          {/* Test Notification */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleTestNotification}
              disabled={!preferences.enabled || testSent}
              variant="outline"
              className="w-full"
            >
              <TestTube2 className="w-4 h-4 mr-2" />
              {testSent ? 'Test Sent!' : 'Test Workout'}
            </Button>
            <Button
              onClick={async () => {
                try {
                  await sendMotivationalNotification();
                  setTestSent(true);
                  setTimeout(() => setTestSent(false), 3000);
                } catch (error) {
                  console.error('Error sending motivation test:', error);
                  alert('Failed to send motivational test notification.');
                }
              }}
              disabled={!preferences.enabled || testSent || preferences.motivationFrequency === 'never'}
              variant="outline"
              className="w-full"
            >
              <TestTube2 className="w-4 h-4 mr-2" />
              {testSent ? 'Test Sent!' : 'Test Motivation'}
            </Button>
          </div>

          {/* Save Confirmation */}
          {saved && (
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Settings saved!</span>
            </div>
          )}

          {/* Preview Messages */}
          {preferences.enabled && (
            <div className="space-y-4">
              {/* Workout Reminder Preview */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Workout Reminder Example:
                </p>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{coach.avatar}</span>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {coach.name}
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {coach.tone === 'enthusiastic' &&
                        "Let's go! Your 90min endurance ride is coming up in 4h. Ready to crush it? 🔥"}
                      {coach.tone === 'analytical' &&
                        'Workout scheduled: Endurance Ride in 4h (90min). Optimal preparation window. 📊'}
                      {coach.tone === 'supportive' &&
                        "Hey there! Your 90min workout is in 4h. Remember to hydrate and fuel up. 💙"}
                      {coach.tone === 'strategic' &&
                        'Strategic reminder: Endurance Ride in 4h. This 90min session builds toward your goal. 🎯'}
                      {coach.tone === 'experienced' &&
                        'Pro tip: Endurance Ride in 4h. 90min well spent builds champions. 🏆'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Motivation Preview */}
              {preferences.motivationFrequency !== 'never' && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-pink-50 dark:from-indigo-900/20 dark:to-pink-900/20 border-2 border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
                    Motivation Example:
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{coach.avatar}</span>
                    <div>
                      <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                        {coach.name}
                      </p>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        {coach.tone === 'enthusiastic' &&
                          "Champions are made in the dark! Every workout counts. Let's go! 💪"}
                        {coach.tone === 'analytical' &&
                          'Data point: Consistency drives performance. Today\'s session contributes to long-term gains. 📊'}
                        {coach.tone === 'supportive' &&
                          "You're doing amazing! Every workout is a step toward your goals. Keep going! 💙"}
                        {coach.tone === 'strategic' &&
                          'Strategic advantage: Every completed session builds your competitive edge. Execute today. 🎯'}
                        {coach.tone === 'experienced' &&
                          'Old coach wisdom: The days you don\'t want to train are the days you need it most. 🏆'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationSettings;
