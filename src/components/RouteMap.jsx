import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

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

  useEffect(() => {
    // Only load map if we have polyline data
    if (!activity?.map?.summary_polyline) {
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

      // Decode polyline
      const coordinates = decodePolyline(activity.map.summary_polyline);
      
      if (coordinates.length === 0) {
        return;
      }

      // Initialize map
      if (mapContainerRef.current && !mapRef.current) {
        const L = window.L;
        
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
        if (coordinates.length > 0) {
          const startIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });
          
          L.marker(coordinates[0], { icon: startIcon }).addTo(map);
        }

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
      }
    };

    loadLeaflet().catch(err => {
      console.error('Error loading map:', err);
    });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activity]);

  // No map data available
  if (!activity?.map?.summary_polyline) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No route data available</p>
        <p className="text-sm text-gray-500 mt-1">
          This activity doesn't have GPS data
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="w-full h-[400px] rounded-lg overflow-hidden border-2 border-gray-200"
        style={{ zIndex: 0 }}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
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
        <span>© OpenStreetMap contributors</span>
      </div>
    </div>
  );
};

export default RouteMap;
