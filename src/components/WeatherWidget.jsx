import React, { useState, useEffect } from 'react';
import { Cloud, MapPin, Droplets, Wind, Eye, Gauge, Sunrise, Sunset, RefreshCw, Settings, X, Search } from 'lucide-react';
import {
  getWeatherData,
  getBrowserLocation,
  geocodeLocation,
  getSavedLocation,
  saveLocation,
  getWeatherEmoji,
  getWindDirection,
  formatTime,
  getTrainingRecommendation,
} from '../lib/weatherService';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try saved location first
      let location = getSavedLocation();

      // If no saved location, try browser location
      if (!location) {
        try {
          const browserLoc = await getBrowserLocation();
          location = {
            lat: browserLoc.lat,
            lon: browserLoc.lon,
            name: 'Current Location',
            source: 'browser',
          };
          saveLocation(location);
        } catch (err) {
          // If browser location fails, use default (London)
          location = {
            lat: 51.5074,
            lon: -0.1278,
            name: 'London',
            country: 'GB',
            source: 'default',
          };
          saveLocation(location);
        }
      }

      const data = await getWeatherData(location.lat, location.lon);
      setWeather(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) return;

    setSearching(true);
    try {
      const results = await geocodeLocation(locationSearch);
      setSearchResults(results);
    } catch (err) {
      setError('Failed to search location');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectLocation = async (location) => {
    saveLocation(location);
    setShowLocationModal(false);
    setLocationSearch('');
    setSearchResults([]);
    await loadWeather();
  };

  const handleUseBrowserLocation = async () => {
    try {
      const browserLoc = await getBrowserLocation();
      const location = {
        lat: browserLoc.lat,
        lon: browserLoc.lon,
        name: 'Current Location',
        source: 'browser',
      };
      saveLocation(location);
      setShowLocationModal(false);
      await loadWeather();
    } catch (err) {
      setError('Failed to get browser location');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading weather...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <Cloud className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600 dark:text-red-400">Weather unavailable</span>
        <button
          onClick={loadWeather}
          className="ml-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!weather) return null;

  const recommendation = getTrainingRecommendation(weather);

  return (
    <>
      {/* Compact widget in top bar */}
      <div
        className="relative flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 group"
        onMouseEnter={() => setShowModal(true)}
        onMouseLeave={() => setShowModal(false)}
      >
        {/* Weather icon */}
        <div className="text-3xl">
          {getWeatherEmoji(weather.current.condition)}
        </div>

        {/* Temperature and condition */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {weather.current.temp}°
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">C</span>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {weather.current.description}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="w-3 h-3" />
          <span>{weather.location.name}</span>
        </div>

        {/* Settings button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowLocationModal(true);
          }}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
          title="Change location"
        >
          <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Refresh button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            loadWeather();
          }}
          className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
          title="Refresh weather"
        >
          <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Hover modal */}
        {showModal && (
          <div
            className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 z-50 animate-fadeIn"
            onMouseEnter={() => setShowModal(true)}
            onMouseLeave={() => setShowModal(false)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {weather.location.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {weather.current.description}
                </p>
              </div>
              <div className="text-4xl">
                {getWeatherEmoji(weather.current.condition)}
              </div>
            </div>

            {/* Current temperature */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold text-gray-900 dark:text-white">
                {weather.current.temp}°
              </span>
              <span className="text-xl text-gray-500 dark:text-gray-400">
                Feels like {weather.current.feelsLike}°
              </span>
            </div>

            {/* Training recommendation */}
            <div
              className={`mb-4 p-3 rounded-lg ${
                recommendation.type === 'perfect'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : recommendation.type === 'good'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : recommendation.type === 'caution'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{recommendation.icon}</span>
                <span
                  className={`text-sm font-medium ${
                    recommendation.type === 'perfect'
                      ? 'text-green-700 dark:text-green-300'
                      : recommendation.type === 'good'
                      ? 'text-blue-700 dark:text-blue-300'
                      : recommendation.type === 'caution'
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {recommendation.message}
                </span>
              </div>
            </div>

            {/* Weather details grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {weather.current.windSpeed} km/h {getWindDirection(weather.current.windDirection)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {weather.current.humidity}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {weather.current.visibility} km
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Gauge className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {weather.current.pressure} hPa
                </span>
              </div>
            </div>

            {/* Sunrise/Sunset */}
            <div className="flex items-center justify-around mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sunrise className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatTime(weather.current.sunrise)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sunset className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatTime(weather.current.sunset)}
                </span>
              </div>
            </div>

            {/* Hourly forecast */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Next 12 Hours
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {weather.hourly.map((hour, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                      {formatTime(hour.time)}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{getWeatherEmoji(hour.condition)}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {hour.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {hour.pop > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          {hour.pop}%
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-10 text-right">
                        {hour.temp}°
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location settings modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Set Location
              </h2>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Browser location */}
              <button
                onClick={handleUseBrowserLocation}
                className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <MapPin className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Use Current Location
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically detect from browser
                  </div>
                </div>
              </button>

              {/* Search location */}
              <div>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
                    placeholder="Search city or location..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleLocationSearch}
                    disabled={searching || !locationSearch.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {searching ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectLocation(result)}
                        className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {result.displayName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default WeatherWidget;
