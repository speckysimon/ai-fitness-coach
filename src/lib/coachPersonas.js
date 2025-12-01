/**
 * Coach Personas System
 * Different coaching styles and avatars for personalized experience
 * Now fetches from backend API with localStorage caching
 */

// Fallback personas (used if API fails)
const FALLBACK_PERSONAS = [
  {
    id: 'motivator',
    name: 'Coach Alex',
    avatar: '💪',
    style: 'Motivational',
    description: 'High-energy motivator who pushes you to exceed your limits',
    tone: 'enthusiastic',
    catchphrase: "Let's crush this!",
    color: 'from-orange-400 to-red-500',
    personality: 'Energetic, encouraging, and always positive. Uses lots of exclamation marks and motivational language.'
  },
  {
    id: 'analytical',
    name: 'Coach Jordan',
    avatar: '📊',
    style: 'Analytical',
    description: 'Data-driven coach focused on metrics and progressive overload',
    tone: 'analytical',
    catchphrase: 'The numbers don\'t lie',
    color: 'from-blue-400 to-indigo-600',
    personality: 'Precise, methodical, and detail-oriented. Focuses on data, percentages, and scientific training principles.'
  },
  {
    id: 'supportive',
    name: 'Coach Sam',
    avatar: '🤝',
    style: 'Supportive',
    description: 'Empathetic coach who listens and adapts to your needs',
    tone: 'supportive',
    catchphrase: 'We\'re in this together',
    color: 'from-green-400 to-emerald-600',
    personality: 'Understanding, patient, and empathetic. Emphasizes recovery, listening to your body, and sustainable progress.'
  },
  {
    id: 'strategic',
    name: 'Coach Taylor',
    avatar: '🎯',
    style: 'Strategic',
    description: 'Tactical coach who plans every detail for race success',
    tone: 'strategic',
    catchphrase: 'Every session has a purpose',
    color: 'from-indigo-400 to-pink-500',
    personality: 'Focused, goal-oriented, and strategic. Emphasizes race preparation, pacing strategies, and long-term planning.'
  },
  {
    id: 'experienced',
    name: 'Coach Morgan',
    avatar: '🏆',
    style: 'Experienced',
    description: 'Veteran coach with decades of racing and coaching wisdom',
    tone: 'experienced',
    catchphrase: 'I\'ve seen it all',
    color: 'from-yellow-400 to-amber-600',
    personality: 'Wise, experienced, and pragmatic. Shares insights from years of coaching, focuses on what works in real-world racing.'
  }
];

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Fetch personas from API with caching
 */
export const fetchCoachPersonas = async () => {
  try {
    // Check cache first
    const cached = localStorage.getItem('coach_personas_cache');
    const cacheTime = localStorage.getItem('coach_personas_cache_time');

    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }

    // Fetch from API
    const response = await fetch('/api/personas');
    const data = await response.json();

    if (data.success && data.personas) {
      // Cache the result
      localStorage.setItem('coach_personas_cache', JSON.stringify(data.personas));
      localStorage.setItem('coach_personas_cache_time', Date.now().toString());
      return data.personas;
    }

    // Fallback to default personas
    return FALLBACK_PERSONAS;
  } catch (error) {
    console.error('Error fetching coach personas:', error);
    // Return cached data if available, otherwise fallback
    const cached = localStorage.getItem('coach_personas_cache');
    return cached ? JSON.parse(cached) : FALLBACK_PERSONAS;
  }
};

/**
 * Get all coach personas (synchronous - uses cache or fallback)
 */
export const COACH_PERSONAS = (() => {
  const cached = localStorage.getItem('coach_personas_cache');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      return FALLBACK_PERSONAS;
    }
  }
  return FALLBACK_PERSONAS;
})();

/**
 * Clear persona cache (call this when personas are updated in admin)
 */
export const clearPersonaCache = () => {
  localStorage.removeItem('coach_personas_cache');
  localStorage.removeItem('coach_personas_cache_time');
};

// Get coach persona by ID
export const getCoachPersona = (coachId) => {
  return COACH_PERSONAS.find(coach => coach.id === coachId) || COACH_PERSONAS[0];
};

// Get user's selected coach from localStorage
export const getUserCoach = () => {
  const savedCoach = localStorage.getItem('selected_coach');
  return savedCoach || 'motivator'; // Default to motivator
};

// Save user's coach selection
export const setUserCoach = (coachId) => {
  localStorage.setItem('selected_coach', coachId);
};

// Get coach-specific message formatting
export const formatCoachMessage = (message, coachId) => {
  const coach = getCoachPersona(coachId);

  // Add coach-specific flair to messages
  switch (coach.tone) {
    case 'enthusiastic':
      return `${message} 💪`;
    case 'analytical':
      return `📊 ${message}`;
    case 'supportive':
      return `${message} 🤝`;
    case 'strategic':
      return `🎯 ${message}`;
    case 'experienced':
      return `${message} 🏆`;
    default:
      return message;
  }
};
