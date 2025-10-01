// GPX file parser and route analysis

export const parseGPX = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          reject(new Error('Invalid GPX file format'));
          return;
        }
        
        const trackPoints = xmlDoc.querySelectorAll('trkpt');
        
        if (trackPoints.length === 0) {
          reject(new Error('No track points found in GPX file'));
          return;
        }
        
        const points = [];
        trackPoints.forEach(point => {
          const lat = parseFloat(point.getAttribute('lat'));
          const lon = parseFloat(point.getAttribute('lon'));
          const eleNode = point.querySelector('ele');
          const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
          
          points.push({ lat, lon, ele });
        });
        
        const routeAnalysis = analyzeRoute(points);
        
        resolve({
          points,
          analysis: routeAnalysis,
          name: getRouteName(xmlDoc),
          rawXML: e.target.result
        });
      } catch (error) {
        reject(new Error(`Failed to parse GPX: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

const getRouteName = (xmlDoc) => {
  const nameNode = xmlDoc.querySelector('trk > name');
  return nameNode ? nameNode.textContent : 'Unnamed Route';
};

const analyzeRoute = (points) => {
  if (points.length < 2) {
    return {
      distance: 0,
      elevation: { gain: 0, loss: 0, max: 0, min: 0 },
      segments: [],
      difficulty: 'unknown'
    };
  }
  
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxElevation = points[0].ele;
  let minElevation = points[0].ele;
  
  const segments = [];
  let currentSegment = null;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    // Calculate distance between points (Haversine formula)
    const distance = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    totalDistance += distance;
    
    // Calculate elevation change
    const elevationChange = curr.ele - prev.ele;
    const gradient = distance > 0 ? (elevationChange / distance) * 100 : 0;
    
    if (elevationChange > 0) {
      elevationGain += elevationChange;
    } else {
      elevationLoss += Math.abs(elevationChange);
    }
    
    maxElevation = Math.max(maxElevation, curr.ele);
    minElevation = Math.min(minElevation, curr.ele);
    
    // Segment detection (climbs, descents, flats)
    const segmentType = getSegmentType(gradient);
    
    if (!currentSegment || currentSegment.type !== segmentType) {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        type: segmentType,
        startDistance: totalDistance - distance,
        distance: distance,
        elevationChange: elevationChange,
        avgGradient: gradient,
        startElevation: prev.ele,
        endElevation: curr.ele
      };
    } else {
      currentSegment.distance += distance;
      currentSegment.elevationChange += elevationChange;
      currentSegment.avgGradient = (currentSegment.elevationChange / currentSegment.distance) * 100;
      currentSegment.endElevation = curr.ele;
    }
  }
  
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  // Merge small segments
  const mergedSegments = mergeSmallSegments(segments);
  
  // Classify climbs
  const climbs = classifyClimbs(mergedSegments);
  
  // Calculate difficulty score
  const difficulty = calculateDifficulty(totalDistance, elevationGain, climbs);
  
  return {
    distance: totalDistance / 1000, // Convert to km
    elevation: {
      gain: Math.round(elevationGain),
      loss: Math.round(elevationLoss),
      max: Math.round(maxElevation),
      min: Math.round(minElevation)
    },
    segments: mergedSegments,
    climbs,
    difficulty,
    estimatedTime: estimateTime(totalDistance, elevationGain, difficulty)
  };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

const getSegmentType = (gradient) => {
  if (gradient > 3) return 'climb';
  if (gradient < -3) return 'descent';
  return 'flat';
};

const mergeSmallSegments = (segments) => {
  const merged = [];
  const minDistance = 0.5; // 500m minimum segment length
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (segment.distance / 1000 < minDistance && merged.length > 0) {
      // Merge with previous segment
      const prev = merged[merged.length - 1];
      prev.distance += segment.distance;
      prev.elevationChange += segment.elevationChange;
      prev.avgGradient = (prev.elevationChange / prev.distance) * 100;
      prev.endElevation = segment.endElevation;
      prev.type = getSegmentType(prev.avgGradient);
    } else {
      merged.push({ ...segment });
    }
  }
  
  return merged;
};

const classifyClimbs = (segments) => {
  const climbs = segments
    .filter(s => s.type === 'climb' && s.distance > 500) // At least 500m
    .map((climb, index) => {
      const distanceKm = climb.distance / 1000;
      const category = getClimbCategory(distanceKm, climb.avgGradient, climb.elevationChange);
      
      return {
        name: `Climb ${index + 1}`,
        distance: distanceKm,
        elevationGain: Math.round(climb.elevationChange),
        avgGradient: Math.round(climb.avgGradient * 10) / 10,
        maxGradient: Math.round(climb.avgGradient * 1.5 * 10) / 10, // Estimate
        category,
        startDistance: Math.round(climb.startDistance / 1000 * 10) / 10,
        difficulty: calculateClimbDifficulty(distanceKm, climb.avgGradient, climb.elevationChange)
      };
    });
  
  return climbs;
};

const getClimbCategory = (distanceKm, avgGradient, elevationGain) => {
  // Simplified categorization based on elevation gain and gradient
  const score = elevationGain * (1 + avgGradient / 10);
  
  if (score > 8000) return 'HC'; // Hors Catégorie
  if (score > 3200) return '1';
  if (score > 1600) return '2';
  if (score > 800) return '3';
  if (score > 300) return '4';
  return 'Uncategorized';
};

const calculateClimbDifficulty = (distanceKm, avgGradient, elevationGain) => {
  // 0-100 difficulty score
  const distanceScore = Math.min(distanceKm * 5, 50);
  const gradientScore = Math.min(avgGradient * 3, 30);
  const elevationScore = Math.min(elevationGain / 50, 20);
  
  return Math.round(distanceScore + gradientScore + elevationScore);
};

const calculateDifficulty = (distanceM, elevationGain, climbs) => {
  const distanceKm = distanceM / 1000;
  
  // Base difficulty from distance and elevation
  let score = 0;
  
  // Distance component (0-30 points)
  if (distanceKm < 50) score += distanceKm * 0.3;
  else if (distanceKm < 100) score += 15 + (distanceKm - 50) * 0.2;
  else score += 25 + (distanceKm - 100) * 0.1;
  
  // Elevation component (0-40 points)
  score += Math.min(elevationGain / 100, 40);
  
  // Climb component (0-30 points)
  const climbScore = climbs.reduce((sum, climb) => sum + climb.difficulty / 10, 0);
  score += Math.min(climbScore, 30);
  
  score = Math.min(score, 100);
  
  if (score < 20) return { level: 'Easy', score: Math.round(score), color: 'green' };
  if (score < 40) return { level: 'Moderate', score: Math.round(score), color: 'yellow' };
  if (score < 60) return { level: 'Hard', score: Math.round(score), color: 'orange' };
  if (score < 80) return { level: 'Very Hard', score: Math.round(score), color: 'red' };
  return { level: 'Extreme', score: Math.round(score), color: 'purple' };
};

const estimateTime = (distanceM, elevationGain, difficulty) => {
  const distanceKm = distanceM / 1000;
  
  // Base speed depends on difficulty
  let avgSpeed;
  if (difficulty.level === 'Easy') avgSpeed = 30;
  else if (difficulty.level === 'Moderate') avgSpeed = 27;
  else if (difficulty.level === 'Hard') avgSpeed = 24;
  else if (difficulty.level === 'Very Hard') avgSpeed = 21;
  else avgSpeed = 18;
  
  // Adjust for elevation (add time for climbing)
  const climbingTime = elevationGain / 300; // ~300m/hour climbing penalty
  
  const baseTime = distanceKm / avgSpeed;
  const totalTime = baseTime + climbingTime;
  
  const hours = Math.floor(totalTime);
  const minutes = Math.round((totalTime - hours) * 60);
  
  return {
    hours,
    minutes,
    total: totalTime,
    formatted: `${hours}h ${minutes}m`
  };
};

// Generate route profile data for charting
export const generateRouteProfile = (points, maxPoints = 200) => {
  if (points.length === 0) return [];
  
  const step = Math.max(1, Math.floor(points.length / maxPoints));
  const profile = [];
  let cumulativeDistance = 0;
  
  for (let i = 0; i < points.length; i += step) {
    if (i > 0) {
      const prev = points[i - step] || points[i - 1];
      const curr = points[i];
      const distance = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      cumulativeDistance += distance;
    }
    
    profile.push({
      distance: Math.round(cumulativeDistance / 1000 * 10) / 10,
      elevation: Math.round(points[i].ele),
      gradient: i > 0 ? calculateGradient(points[i - step] || points[i - 1], points[i]) : 0
    });
  }
  
  return profile;
};

const calculateGradient = (point1, point2) => {
  const distance = calculateDistance(point1.lat, point1.lon, point2.lat, point2.lon);
  const elevationChange = point2.ele - point1.ele;
  return distance > 0 ? Math.round((elevationChange / distance) * 100 * 10) / 10 : 0;
};
