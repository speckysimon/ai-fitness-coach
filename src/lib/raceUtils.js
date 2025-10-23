// Utility functions for race tagging

// Race type definitions
export const RACE_TYPES = [
  { value: '', label: 'Select Type...' },
  { value: 'road_race', label: '🚴 Road Race' },
  { value: 'criterium', label: '🔄 Criterium' },
  { value: 'time_trial', label: '⏱️ Time Trial' },
  { value: 'hill_climb', label: '⛰️ Hill Climb' },
  { value: 'gran_fondo', label: '🏔️ Gran Fondo' },
  { value: 'stage_race', label: '📅 Stage Race' },
  { value: 'cyclocross', label: '🌲 Cyclocross' },
  { value: 'gravel', label: '🪨 Gravel Race' },
  { value: 'track', label: '🏟️ Track Race' },
  { value: 'other', label: '🏁 Other' }
];

// Get race type label
export const getRaceTypeLabel = (raceType) => {
  const type = RACE_TYPES.find(t => t.value === raceType);
  return type ? type.label : '🏁 Race';
};

// Fetch race tags from backend
export const fetchRaceTags = async () => {
  try {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      console.warn('No session token, using empty race tags');
      return {};
    }

    const response = await fetch('/api/race-tags', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch race tags:', response.statusText);
      return {};
    }

    const data = await response.json();
    return data.raceTags || {};
  } catch (error) {
    console.error('Error fetching race tags:', error);
    return {};
  }
};

// Save race tag to backend
export const setActivityRace = async (activityId, isRace, raceType = null) => {
  try {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      console.error('No session token');
      return false;
    }

    const response = await fetch('/api/race-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ activityId, isRace, raceType })
    });

    if (!response.ok) {
      console.error('Failed to save race tag:', response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving race tag:', error);
    return false;
  }
};

// Bulk save race tags to backend
export const saveRaceTagsBulk = async (raceTags) => {
  try {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      console.error('No session token');
      return false;
    }

    const response = await fetch('/api/race-tags/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ raceTags })
    });

    if (!response.ok) {
      console.error('Failed to save race tags:', response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving race tags:', error);
    return false;
  }
};
