// Utility functions for race tagging

export const isActivityRace = (activityId) => {
  const raceTags = JSON.parse(localStorage.getItem('race_tags') || '{}');
  return raceTags[activityId] || false;
};

export const setActivityRace = (activityId, isRace) => {
  const raceTags = JSON.parse(localStorage.getItem('race_tags') || '{}');
  if (isRace) {
    raceTags[activityId] = true;
  } else {
    delete raceTags[activityId];
  }
  localStorage.setItem('race_tags', JSON.stringify(raceTags));
};

export const getAllRaceTags = () => {
  return JSON.parse(localStorage.getItem('race_tags') || '{}');
};
