/**
 * Workout Reminder Manager
 * Manages periodic checks for upcoming workouts and sends notifications
 */

import {
  getNotificationPreferences,
  showWorkoutReminder,
  getHoursUntilSession,
  initializeNotifications,
} from './notificationService';
import { logger } from './logger';

class WorkoutReminderManager {
  constructor() {
    this.checkInterval = null;
    this.notifiedSessions = new Set(); // Track which sessions we've already notified about (main reminder)
    this.nutritionNotifiedSessions = new Set(); // Track 2-hour nutrition reminders
    this.isRunning = false;
  }

  /**
   * Start the reminder manager
   * Checks for upcoming workouts every 5 minutes
   */
  start() {
    if (this.isRunning) {
      logger.log('Workout reminder manager already running');
      return;
    }

    logger.log('Starting workout reminder manager');
    this.isRunning = true;

    // Initialize notifications
    initializeNotifications();

    // Check immediately
    this.checkUpcomingWorkouts();

    // Then check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkUpcomingWorkouts();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop the reminder manager
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.log('Workout reminder manager stopped');
  }

  /**
   * Check for upcoming workouts and send notifications
   */
  async checkUpcomingWorkouts() {
    const prefs = getNotificationPreferences();

    if (!prefs.enabled || !prefs.workoutReminders) {
      return;
    }

    try {
      // Get training plan from localStorage
      const planData = localStorage.getItem('training_plan');
      if (!planData) {
        return;
      }

      const plan = JSON.parse(planData);
      if (!plan.weeks || !Array.isArray(plan.weeks)) {
        return;
      }

      const now = new Date();
      const reminderHours = prefs.reminderHours || 4;

      // Flatten all sessions from all weeks
      const allSessions = [];
      plan.weeks.forEach((week) => {
        if (week.sessions && Array.isArray(week.sessions)) {
          week.sessions.forEach((session) => {
            allSessions.push(session);
          });
        }
      });

      // Check each session
      for (const session of allSessions) {
        if (!session.date) continue;

        // Skip if already completed
        if (session.completed) continue;

        // Create unique session ID
        const sessionId = `${session.date}-${session.title}`;

        // Parse session date and time
        const sessionDate = new Date(session.date);
        const sessionTime = session.time || '09:00'; // Default to 9 AM
        const [hours, minutes] = sessionTime.split(':').map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);

        const sessionDiff = sessionDate.getTime() - now.getTime();

        // Skip if session is in the past
        if (sessionDiff <= 0) continue;

        // Check for 2-hour nutrition reminder
        const nutritionReminderTime = new Date(sessionDate);
        nutritionReminderTime.setHours(nutritionReminderTime.getHours() - 2);
        const nutritionTimeDiff = nutritionReminderTime.getTime() - now.getTime();
        const nutritionWithinWindow = nutritionTimeDiff <= 0 && nutritionTimeDiff > -(30 * 60 * 1000);

        if (nutritionWithinWindow && !this.nutritionNotifiedSessions.has(sessionId)) {
          logger.log(`Sending nutrition reminder for: ${session.title} (2h until workout)`);

          // Send nutrition-focused notification
          await showWorkoutReminder(session, 2, true);

          // Mark as nutrition-notified
          this.nutritionNotifiedSessions.add(sessionId);

          // Clean up old notifications (keep only last 50)
          if (this.nutritionNotifiedSessions.size > 50) {
            const entries = Array.from(this.nutritionNotifiedSessions);
            this.nutritionNotifiedSessions = new Set(entries.slice(-50));
          }
        }

        // Check for main workout reminder (user-configured hours)
        if (!this.notifiedSessions.has(sessionId)) {
          const reminderTime = new Date(sessionDate);
          reminderTime.setHours(reminderTime.getHours() - reminderHours);
          const timeDiff = reminderTime.getTime() - now.getTime();
          const withinWindow = timeDiff <= 0 && timeDiff > -(30 * 60 * 1000);

          if (withinWindow) {
            const hoursUntil = Math.round(sessionDiff / (1000 * 60 * 60));

            logger.log(`Sending main reminder for: ${session.title} (${hoursUntil}h until workout)`);

            // Send main notification
            await showWorkoutReminder(session, hoursUntil, false);

            // Mark as notified
            this.notifiedSessions.add(sessionId);

            // Clean up old notifications (keep only last 50)
            if (this.notifiedSessions.size > 50) {
              const entries = Array.from(this.notifiedSessions);
              this.notifiedSessions = new Set(entries.slice(-50));
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error checking upcoming workouts:', error);
    }
  }

  /**
   * Clear notification history (useful when plan changes)
   */
  clearNotificationHistory() {
    this.notifiedSessions.clear();
    this.nutritionNotifiedSessions.clear();
    logger.log('Notification history cleared');
  }

  /**
   * Get status of reminder manager
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      notifiedCount: this.notifiedSessions.size,
      nutritionNotifiedCount: this.nutritionNotifiedSessions.size,
    };
  }
}

// Create singleton instance
export const workoutReminderManager = new WorkoutReminderManager();

// Auto-start when module loads (if notifications are enabled)
if (typeof window !== 'undefined') {
  // Wait a bit for app to initialize
  setTimeout(() => {
    const prefs = getNotificationPreferences();
    if (prefs.enabled && prefs.workoutReminders) {
      workoutReminderManager.start();
    }
  }, 3000); // Start after 3 seconds
}
