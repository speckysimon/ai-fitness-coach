/**
 * Notification Service
 * Handles browser notifications for workout reminders with coach persona integration
 */

import { getCoachPersona, getUserCoach } from './coachPersonas';

// Notification permission status
export const NotificationStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  DEFAULT: 'default'
};

// Check if notifications are supported
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Get current notification permission status
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return null;
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  
  // Save permission status to localStorage
  localStorage.setItem('notification_permission', permission);
  
  return permission;
};

// Get user's notification preferences
export const getNotificationPreferences = () => {
  const defaults = {
    enabled: false,
    workoutReminders: true,
    reminderHours: 4, // Hours before workout
    quietHoursStart: 22, // 10 PM
    quietHoursEnd: 7, // 7 AM
    notifyOnlyKeyWorkouts: false, // If true, only notify for hard/race sessions
    motivationFrequency: 'weekly', // How often to send motivational pushes
  };

  const saved = localStorage.getItem('notification_preferences');
  return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
};

// Save notification preferences
export const saveNotificationPreferences = (preferences) => {
  localStorage.setItem('notification_preferences', JSON.stringify(preferences));
};

// Check if current time is within quiet hours
export const isQuietHours = () => {
  const prefs = getNotificationPreferences();
  const now = new Date();
  const currentHour = now.getHours();
  
  const { quietHoursStart, quietHoursEnd } = prefs;
  
  // Handle overnight quiet hours (e.g., 22:00 to 7:00)
  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  }
  
  // Handle same-day quiet hours (e.g., 13:00 to 15:00)
  return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
};

// Generate coach-specific workout reminder message
export const generateWorkoutReminderMessage = (session, hoursUntil, isNutritionReminder = false) => {
  const coachId = getUserCoach();
  const coach = getCoachPersona(coachId);
  
  const sessionType = session.type || 'workout';
  const duration = session.duration || session.targetDuration || 60;
  const durationText = duration >= 60 ? `${Math.round(duration / 60)}h` : `${duration}min`;
  
  // Nutrition-focused messages for 2-hour reminder
  if (isNutritionReminder) {
    const nutritionMessages = {
      motivator: [
        `Fuel up, champ! ${session.title} in 2h. Time to eat and hydrate for peak performance! 🍌💧`,
        `2 hours to go! Get your nutrition dialed in for ${session.title}. Carbs + water = power! 💪🥤`,
        `Pre-workout alert! ${durationText} ${sessionType} in 2h. Fuel your body, dominate your workout! 🔥`,
      ],
      analytical: [
        `T-minus 2 hours: ${session.title}. Optimal nutrition window. 200-300 calories + 500ml water recommended. 📊`,
        `Pre-workout protocol: ${durationText} session in 2h. Carbohydrate intake and hydration critical now. 💧`,
        `Nutrition checkpoint: ${session.title} in 2h. Fuel intake window open. Hydration status: monitor. 📈`,
      ],
      supportive: [
        `Gentle reminder: ${session.title} in 2h. Take a moment to eat something light and drink water. You've got this! 💙`,
        `Hey! Your ${durationText} workout is in 2h. Don't forget to fuel up and hydrate. Your body will thank you! 🤝`,
        `Friendly heads up: ${session.title} in 2h. Grab a snack and some water. Take care of yourself! 💧`,
      ],
      strategic: [
        `Pre-workout strategy: ${session.title} in 2h. Nutrition timing is key. Fuel now for optimal ${sessionType} performance. 🎯`,
        `Mission prep: 2h until ${durationText} session. Execute nutrition protocol: light meal + hydration. 🎯`,
        `Strategic fueling window: ${session.title} in 2h. Proper nutrition = better performance. Don't skip this step. 💧`,
      ],
      experienced: [
        `Pro tip: ${session.title} in 2h. Never start a ${durationText} workout on empty. Eat light, hydrate well. 🏆`,
        `From the pros: 2h before ${sessionType} is prime fueling time. Banana + water = smart preparation. 💧`,
        `Old coach wisdom: ${session.title} in 2h. The workout starts with what you eat now. Fuel smart. 🏆`,
      ],
    };
    
    const coachMessages = nutritionMessages[coach.tone] || nutritionMessages.motivator;
    const randomIndex = Math.floor(Math.random() * coachMessages.length);
    return coachMessages[randomIndex];
  }
  
  // Standard workout reminder messages
  const messages = {
    motivator: [
      `Time to shine! ${session.title} in ${hoursUntil}h. ${durationText} of pure effort! 💪`,
      `Let's go! Your ${durationText} ${sessionType} session is coming up in ${hoursUntil}h. Ready to crush it? 🔥`,
      `Gear up, champion! ${session.title} starts in ${hoursUntil}h. Time to show what you're made of! 💪`,
    ],
    analytical: [
      `Workout scheduled: ${session.title} in ${hoursUntil}h (${durationText}). Optimal preparation window. 📊`,
      `Data point: ${durationText} ${sessionType} session in ${hoursUntil}h. Time to execute the plan. 📈`,
      `${session.title} commencing in ${hoursUntil}h. Duration: ${durationText}. Prepare accordingly. 📊`,
    ],
    supportive: [
      `Friendly reminder: ${session.title} in ${hoursUntil}h. Take your time to prepare. You've got this! 🤝`,
      `Hey there! Your ${durationText} workout is in ${hoursUntil}h. Remember to hydrate and fuel up. 💙`,
      `Just a heads up: ${session.title} in ${hoursUntil}h. Listen to your body and do your best! 🤝`,
    ],
    strategic: [
      `Strategic reminder: ${session.title} in ${hoursUntil}h. This ${durationText} session builds toward your goal. 🎯`,
      `Mission briefing: ${durationText} ${sessionType} in ${hoursUntil}h. Every session counts. 🎯`,
      `${session.title} scheduled in ${hoursUntil}h. Purpose: ${sessionType} development. Duration: ${durationText}. 🎯`,
    ],
    experienced: [
      `Pro tip: ${session.title} in ${hoursUntil}h. ${durationText} well spent builds champions. 🏆`,
      `From experience: Your ${durationText} workout is in ${hoursUntil}h. Consistency is key. 🏆`,
      `${session.title} in ${hoursUntil}h. I've seen this work time and again. Trust the process. 🏆`,
    ],
  };
  
  // Get messages for this coach, fallback to motivator
  const coachMessages = messages[coach.tone] || messages.motivator;
  
  // Randomly select one message
  const randomIndex = Math.floor(Math.random() * coachMessages.length);
  return coachMessages[randomIndex];
};

// Show a notification
export const showNotification = async (title, options = {}) => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  // Check quiet hours
  if (isQuietHours()) {
    console.log('Skipping notification during quiet hours');
    return null;
  }

  try {
    // If service worker is available, use it for better mobile support
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      return await registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        vibrate: [200, 100, 200],
        tag: 'workout-reminder',
        requireInteraction: false,
        ...options,
      });
    } else {
      // Fallback to basic notification
      return new Notification(title, {
        icon: '/icon-192x192.png',
        ...options,
      });
    }
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

// Show workout reminder notification
export const showWorkoutReminder = async (session, hoursUntil, isNutritionReminder = false) => {
  const prefs = getNotificationPreferences();
  
  if (!prefs.enabled || !prefs.workoutReminders) {
    return null;
  }

  // Check if we should only notify for key workouts
  if (prefs.notifyOnlyKeyWorkouts) {
    const keyTypes = ['threshold', 'vo2max', 'race', 'long'];
    const sessionType = (session.type || '').toLowerCase();
    const isKeyWorkout = keyTypes.some(type => sessionType.includes(type));
    
    if (!isKeyWorkout) {
      console.log('Skipping notification for non-key workout');
      return null;
    }
  }

  const coachId = getUserCoach();
  const coach = getCoachPersona(coachId);
  const message = generateWorkoutReminderMessage(session, hoursUntil, isNutritionReminder);

  // Use different tag for nutrition reminder to allow both notifications
  const notificationTag = isNutritionReminder ? 'nutrition-reminder' : 'workout-reminder';

  return await showNotification(`${coach.avatar} ${coach.name}`, {
    body: message,
    tag: notificationTag,
    data: {
      sessionId: session.id,
      sessionDate: session.date,
      url: '/workout/today',
    },
    actions: [
      { action: 'view', title: 'View Workout' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
};

// Calculate when to show reminder for a session
export const calculateReminderTime = (sessionDate, sessionTime = '09:00') => {
  const prefs = getNotificationPreferences();
  const reminderHours = prefs.reminderHours || 4;
  
  // Parse session date and time
  const [hours, minutes] = sessionTime.split(':').map(Number);
  const sessionDateTime = new Date(sessionDate);
  sessionDateTime.setHours(hours, minutes, 0, 0);
  
  // Calculate reminder time (X hours before)
  const reminderTime = new Date(sessionDateTime);
  reminderTime.setHours(reminderTime.getHours() - reminderHours);
  
  return reminderTime;
};

// Check if we should show reminder now for a session
export const shouldShowReminderNow = (session) => {
  const prefs = getNotificationPreferences();
  
  if (!prefs.enabled || !prefs.workoutReminders) {
    return false;
  }

  const now = new Date();
  const sessionDate = new Date(session.date);
  
  // Get session time (default to 9 AM if not specified)
  const sessionTime = session.time || '09:00';
  const reminderTime = calculateReminderTime(session.date, sessionTime);
  
  // Check if reminder time is within the next 5 minutes
  const timeDiff = reminderTime.getTime() - now.getTime();
  const fiveMinutes = 5 * 60 * 1000;
  
  return timeDiff > 0 && timeDiff <= fiveMinutes;
};

// Get hours until session
export const getHoursUntilSession = (session) => {
  const now = new Date();
  const sessionDate = new Date(session.date);
  const sessionTime = session.time || '09:00';
  const [hours, minutes] = sessionTime.split(':').map(Number);
  sessionDate.setHours(hours, minutes, 0, 0);
  
  const diffMs = sessionDate.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  
  return diffHours;
};

// Initialize notification system
export const initializeNotifications = async () => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser');
    return false;
  }

  const permission = getNotificationPermission();
  
  if (permission === 'granted') {
    console.log('Notifications already enabled');
    return true;
  }

  return false;
};

// Test notification (for settings page)
export const sendTestNotification = async () => {
  const coachId = getUserCoach();
  const coach = getCoachPersona(coachId);
  
  return await showNotification(`${coach.avatar} ${coach.name}`, {
    body: `Test notification! This is how your workout reminders will look. ${coach.catchphrase}`,
    tag: 'test-notification',
  });
};

// Generate motivational message
export const generateMotivationalMessage = () => {
  const coachId = getUserCoach();
  const coach = getCoachPersona(coachId);
  
  const messages = {
    motivator: [
      "Champions are made in the dark! Every workout counts. Let's go! 💪",
      "Your competition is resting. You're getting stronger. Keep pushing! 🔥",
      "Excellence is a habit. Today's effort builds tomorrow's victory! 🏆",
      "The pain you feel today will be the strength you feel tomorrow. Crush it! 💪",
    ],
    analytical: [
      "Data point: Consistency drives performance. Today's session contributes to long-term gains. 📊",
      "Statistical insight: Athletes who train consistently see 23% better results. Execute the plan. 📈",
      "Performance optimization: Your training data shows positive trends. Maintain the protocol. 📊",
    ],
    supportive: [
      "You're doing amazing! Every workout is a step toward your goals. Keep going! 💙",
      "Remember why you started. You're stronger than you think. We believe in you! 🤝",
      "Training is tough, but so are you. Take it one workout at a time. You've got this! 💙",
    ],
    strategic: [
      "Strategic advantage: Every completed session builds your competitive edge. Execute today. 🎯",
      "Mission focus: Today's training serves your bigger goal. Purposeful effort required. 🎯",
      "Long-term vision: This workout is an investment in your future performance. Capitalize now. 🎯",
    ],
    experienced: [
      "Old coach wisdom: The days you don't want to train are the days you need it most. 🏆",
      "From the pros: Champions train when others don't. Today separates good from great. 🏆",
      "Experience shows: Consistency trumps intensity every time. Show up and do the work. 🏆",
    ],
  };
  
  const coachMessages = messages[coach.tone] || messages.motivator;
  const randomIndex = Math.floor(Math.random() * coachMessages.length);
  return coachMessages[randomIndex];
};

// Send motivational notification
export const sendMotivationalNotification = async () => {
  const prefs = getNotificationPreferences();
  
  if (!prefs.enabled) {
    return null;
  }

  const coachId = getUserCoach();
  const coach = getCoachPersona(coachId);
  const message = generateMotivationalMessage();

  return await showNotification(`${coach.avatar} ${coach.name}`, {
    body: message,
    tag: 'motivation-push',
    data: {
      type: 'motivation',
      url: '/dashboard',
    },
    actions: [
      { action: 'view', title: 'View Dashboard' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
};

// Check if we should send motivational notification today
export const shouldSendMotivationToday = () => {
  const prefs = getNotificationPreferences();
  
  if (!prefs.enabled || prefs.motivationFrequency === 'never') {
    return false;
  }

  const now = new Date();
  const lastMotivation = localStorage.getItem('last_motivation_date');
  
  if (lastMotivation) {
    const lastDate = new Date(lastMotivation);
    const daysDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    
    switch (prefs.motivationFrequency) {
      case 'daily':
        return daysDiff >= 1;
      case 'weekly':
        return daysDiff >= 7;
      case 'biweekly':
        return daysDiff >= 14;
      case 'monthly':
        return daysDiff >= 30;
      default:
        return false;
    }
  }
  
  return true; // Never sent before
};

// Mark motivation as sent for today
export const markMotivationSent = () => {
  localStorage.setItem('last_motivation_date', new Date().toISOString());
};
