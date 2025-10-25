/**
 * Weather Service using OpenWeather API
 * Free tier: 1000 calls/day
 * Caches data for 30 minutes to minimize API calls
 */

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || 'demo';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get weather data from cache or API
 */
export async function getWeatherData(lat, lon) {
  const cacheKey = `weather_${lat}_${lon}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }

  try {
    // Get current weather and hourly forecast
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
      ),
    ]);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const current = await currentResponse.json();
    const forecast = await forecastResponse.json();

    const weatherData = {
      current: {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        condition: current.weather[0].main,
        description: current.weather[0].description,
        icon: current.weather[0].icon,
        humidity: current.main.humidity,
        windSpeed: Math.round(current.wind.speed * 3.6), // m/s to km/h
        windDirection: current.wind.deg,
        pressure: current.main.pressure,
        visibility: current.visibility / 1000, // meters to km
        clouds: current.clouds.all,
        sunrise: current.sys.sunrise,
        sunset: current.sys.sunset,
      },
      hourly: forecast.list.slice(0, 12).map(item => ({
        time: item.dt,
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        condition: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        pop: Math.round(item.pop * 100), // Probability of precipitation
        windSpeed: Math.round(item.wind.speed * 3.6),
        windDirection: item.wind.deg,
        humidity: item.main.humidity,
      })),
      location: {
        name: current.name,
        country: current.sys.country,
      },
    };

    // Cache the data
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: weatherData,
        timestamp: Date.now(),
      })
    );

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

/**
 * Get location from browser geolocation API
 */
export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
}

/**
 * Geocode location name to coordinates
 */
export async function geocodeLocation(locationName) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        locationName
      )}&limit=5&appid=${OPENWEATHER_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to geocode location');
    }

    const results = await response.json();
    
    if (results.length === 0) {
      throw new Error('Location not found');
    }

    return results.map(result => ({
      name: result.name,
      country: result.country,
      state: result.state,
      lat: result.lat,
      lon: result.lon,
      displayName: `${result.name}${result.state ? ', ' + result.state : ''}, ${result.country}`,
    }));
  } catch (error) {
    console.error('Error geocoding location:', error);
    throw error;
  }
}

/**
 * Get saved location from localStorage
 */
export function getSavedLocation() {
  const saved = localStorage.getItem('weather_location');
  return saved ? JSON.parse(saved) : null;
}

/**
 * Save location to localStorage
 */
export function saveLocation(location) {
  localStorage.setItem('weather_location', JSON.stringify(location));
}

/**
 * Get weather icon URL
 */
export function getWeatherIconUrl(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Get weather condition emoji
 */
export function getWeatherEmoji(condition) {
  const emojiMap = {
    Clear: '☀️',
    Clouds: '☁️',
    Rain: '🌧️',
    Drizzle: '🌦️',
    Thunderstorm: '⛈️',
    Snow: '❄️',
    Mist: '🌫️',
    Fog: '🌫️',
    Haze: '🌫️',
  };
  return emojiMap[condition] || '🌤️';
}

/**
 * Get wind direction as compass point
 */
export function getWindDirection(degrees) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Format time from unix timestamp
 */
export function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get training recommendation based on weather
 */
export function getTrainingRecommendation(weather) {
  const { temp, condition, windSpeed, pop } = weather.current;
  
  // Too cold
  if (temp < 0) {
    return {
      type: 'warning',
      message: 'Very cold - consider indoor training',
      icon: '❄️',
    };
  }
  
  // Too hot
  if (temp > 35) {
    return {
      type: 'warning',
      message: 'Very hot - train early/late, stay hydrated',
      icon: '🔥',
    };
  }
  
  // Rain
  if (condition === 'Rain' || pop > 70) {
    return {
      type: 'caution',
      message: 'Rain expected - indoor or wet weather gear',
      icon: '🌧️',
    };
  }
  
  // Strong wind
  if (windSpeed > 40) {
    return {
      type: 'caution',
      message: 'Strong winds - adjust route accordingly',
      icon: '💨',
    };
  }
  
  // Perfect conditions
  if (temp >= 15 && temp <= 25 && condition === 'Clear' && windSpeed < 20) {
    return {
      type: 'perfect',
      message: 'Perfect conditions for training!',
      icon: '✨',
    };
  }
  
  // Good conditions
  return {
    type: 'good',
    message: 'Good conditions for outdoor training',
    icon: '👍',
  };
}
