import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  NotificationStatus,
} from '../lib/notificationService';
import { getCoachPersona, getUserCoach } from '../lib/coachPersonas';

const NotificationPrompt = () => {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const navigate = useNavigate();

  const coach = getCoachPersona(getUserCoach());

  useEffect(() => {
    // Check if we should show the prompt
    const checkShouldShow = () => {
      // Don't show if notifications not supported
      if (!isNotificationSupported()) {
        return false;
      }

      // Don't show if user dismissed it recently (within 7 days)
      const dismissed = localStorage.getItem('notification_prompt_dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDays) {
          return false;
        }
      }

      // Don't show if already enabled
      const prefs = getNotificationPreferences();
      if (prefs.enabled) {
        return false;
      }

      // Don't show if permission denied
      const permission = getNotificationPermission();
      if (permission === NotificationStatus.DENIED) {
        return false;
      }

      // Show if permission not granted yet
      return permission !== NotificationStatus.GRANTED;
    };

    setVisible(checkShouldShow());
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === NotificationStatus.GRANTED) {
        // Navigate to settings to complete setup
        navigate('/settings');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setRequesting(false);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_prompt_dismissed', Date.now().toString());
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Coach Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-2xl shadow-lg">
            {coach.avatar}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Never Miss a Workout! 🔔
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                Let {coach.name} remind you about upcoming workouts. Get personalized notifications 
                on your phone and computer so you're always prepared.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleEnable}
              disabled={requesting}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bell className="w-4 h-4 inline mr-2" />
              {requesting ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;
