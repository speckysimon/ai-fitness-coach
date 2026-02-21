import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

/**
 * RouteMap Component - DEFINITIVE VERSION
 * 
 * Simple logic:
 * 1. If activity has summary_polyline (Strava), decode and display it
 * 2. If activity is from Intervals.icu, don't try to fetch streams (unreliable)
 * 3. Show "No route data" for activities without GPS
 * 
 * This avoids the error loop of trying to fetch streams that don't exist.
 */

// Decode Google Polyline format (used by Strava)
const decodePolyline = (encoded) => {
  if (!encoded) return [];
  
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
};

const RouteMap = ({ activity }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Get coordinates from activity - only use what's already available
  const coordinates = React.useMemo(() => {
    // Priority 1: Strava summary_polyline (most reliable)
    if (activity?.map?.summary_polyline) {
      const decoded = decodePolyline(activity.map.summary_polyline);
      if (decoded.length > 0) {
        return decoded;
      }
    }
    
    // Priority 2: Direct coordinates if provided (some activities have this)
    if (activity?.coordinates && Array.isArray(activity.coordinates) && activity.coordinates.length > 0) {
      return activity.coordinates;
    }
    
    // Priority 3: latlngs array if provided
    if (activity?.latlngs && Array.isArray(activity.latlngs) && activity.latlngs.length > 0) {
      return activity.latlngs;
    }
    
    return null;
  }, [activity]);

  // Check if this is an indoor/virtual activity
  const isIndoorActivity = React.useMemo(() => {
    const name = (activity?.name || '').toLowerCase();
    const type = (activity?.type || '').toLowerCase();
    
    // Check for indoor indicators
    const indoorKeywords = ['indoor', 'trainer', 'zwift', 'trainerroad', 'wahoo', 'sufferfest', 'rouvy'];
    const hasIndoorKeyword = indoorKeywords.some(k => name.includes(k));
    const isVirtualType = type === 'virtualride' || type === 'virtual_ride';
    const isTrainer = activity?.trainer === true;
    
    return hasIndoorKeyword || isVirtualType || isTrainer;
  }, [activity]);

  useEffect(() => {
    if (!coordinates || coordinates.length === 0) {
      return;
    }

    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      // Add Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      setMapReady(true);
    };

    loadLeaflet().catch(err => {
      console.error('[RouteMap] Error loading Leaflet:', err);
    });
  }, [coordinates]);

  useEffect(() => {
    if (!mapReady || !coordinates || coordinates.length === 0 || !mapContainerRef.current) {
      return;
    }

    // Don't reinitialize if map already exists
    if (mapRef.current) {
      return;
    }

    const L = window.L;
    if (!L) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    
    mapRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add route polyline
    const polyline = L.polyline(coordinates, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
    }).addTo(map);

    // Add start marker (green)
    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
    L.marker(coordinates[0], { icon: startIcon }).addTo(map);

    // Add end marker (red)
    if (coordinates.length > 1) {
      const endIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker(coordinates[coordinates.length - 1], { icon: endIcon }).addTo(map);
    }

    // Fit map to route bounds
    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapReady, coordinates]);

  // No GPS data available
  if (!coordinates || coordinates.length === 0) {
    // Show appropriate message based on activity type
    if (isIndoorActivity) {
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 text-center border border-blue-200 dark:border-blue-800">
          <div className="text-3xl mb-2">🏠</div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">Indoor/Virtual Activity</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Route map not available for this activity
          </p>
        </div>
      );
    }
    
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
        <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">No route data</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          GPS data not available for this activity
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="w-full h-[400px] rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700"
        style={{ zIndex: 0 }}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
            <span>Start</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
            <span>Finish</span>
          </div>
        </div>
        <span>© OpenStreetMap</span>
      </div>
    </div>
  );
};

export default RouteMap;
