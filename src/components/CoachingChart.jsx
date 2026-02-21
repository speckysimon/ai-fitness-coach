import React, { useState, useEffect } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, Zap, Heart, Activity, Mountain, Eye, EyeOff } from 'lucide-react';

/**
 * CoachingChart — Time-series overlay of Power, HR, Cadence, Elevation
 * 
 * Fetches streams from /api/intervals/activity/:id/streams on mount.
 * X-axis = time (minutes), Left Y = Power (W) / HR (bpm), Right Y = Elevation (m)
 * Cadence scaled visually. Elevation as subtle area fill.
 */

const STREAM_CONFIG = {
  watts: {
    label: 'Power',
    color: '#eab308',
    darkColor: '#facc15',
    unit: 'W',
    icon: Zap,
    yAxisId: 'left',
    defaultOn: true,
  },
  heartrate: {
    label: 'Heart Rate',
    color: '#ef4444',
    darkColor: '#f87171',
    unit: 'bpm',
    icon: Heart,
    yAxisId: 'left',
    defaultOn: true,
  },
  cadence: {
    label: 'Cadence',
    color: '#8b5cf6',
    darkColor: '#a78bfa',
    unit: 'rpm',
    icon: Activity,
    yAxisId: 'left',
    defaultOn: false,
  },
  altitude: {
    label: 'Elevation',
    color: '#6b7280',
    darkColor: '#9ca3af',
    unit: 'm',
    icon: Mountain,
    yAxisId: 'right',
    defaultOn: true,
  },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{label} min</p>
      {payload.map((entry) => {
        const config = STREAM_CONFIG[entry.dataKey];
        if (!config || entry.value == null) return null;
        return (
          <p key={entry.dataKey} style={{ color: entry.color }} className="flex items-center gap-2">
            <span className="font-medium">{config.label}:</span>
            <span>{Math.round(entry.value)} {config.unit}</span>
          </p>
        );
      })}
    </div>
  );
};

const CoachingChart = ({ activity }) => {
  const [streams, setStreams] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toggles, setToggles] = useState(() => {
    const t = {};
    for (const [key, cfg] of Object.entries(STREAM_CONFIG)) {
      t[key] = cfg.defaultOn;
    }
    return t;
  });

  const intervalsId = activity?.intervals_id;
  const hasStreams = activity?.stream_types?.some(t => ['watts', 'heartrate', 'cadence', 'altitude'].includes(t));

  useEffect(() => {
    if (!intervalsId || !hasStreams) return;

    const fetchStreams = async () => {
      setLoading(true);
      setError(null);
      try {
        const sessionToken = localStorage.getItem('session_token');
        const resp = await fetch(
          `/api/intervals/activity/${intervalsId}/streams?types=time,watts,heartrate,cadence,altitude`,
          { headers: { Authorization: `Bearer ${sessionToken}` } }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        if (!data.streams?.time?.length) {
          setStreams(null);
          return;
        }

        // Build chart data: array of { time, watts, heartrate, cadence, altitude }
        const chartData = data.streams.time.map((t, i) => {
          const point = { time: t };
          for (const key of ['watts', 'heartrate', 'cadence', 'altitude']) {
            if (data.streams[key]) {
              point[key] = data.streams[key][i];
            }
          }
          return point;
        });

        setStreams({
          data: chartData,
          available: data.availableStreams || [],
          pointCount: data.pointCount,
        });
      } catch (err) {
        console.error('[CoachingChart] Failed to fetch streams:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, [intervalsId, hasStreams]);

  // No Intervals ID or no streams available
  if (!intervalsId || !hasStreams) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading activity streams...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
        Unable to load time-series data
      </div>
    );
  }

  if (!streams?.data?.length) return null;

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  // Calculate Y-axis domains
  const activeLeftStreams = ['watts', 'heartrate', 'cadence'].filter(k => toggles[k] && streams.available.includes(k));
  let leftMax = 0;
  for (const point of streams.data) {
    for (const key of activeLeftStreams) {
      if (point[key] != null && point[key] > leftMax) leftMax = point[key];
    }
  }
  leftMax = Math.ceil(leftMax * 1.1 / 10) * 10; // Round up with 10% headroom

  return (
    <div>
      {/* Toggle Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {Object.entries(STREAM_CONFIG).map(([key, cfg]) => {
          if (!streams.available.includes(key)) return null;
          const Icon = cfg.icon;
          const isOn = toggles[key];
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                isOn
                  ? 'border-current opacity-100'
                  : 'border-gray-300 dark:border-gray-600 opacity-40 hover:opacity-70'
              }`}
              style={{ color: isOn ? cfg.color : undefined }}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
              {isOn ? (
                <Eye className="w-3 h-3 ml-0.5" />
              ) : (
                <EyeOff className="w-3 h-3 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="w-full h-[300px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={streams.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v) => `${Math.round(v)}m`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              stroke="#d1d5db"
            />
            <YAxis
              yAxisId="left"
              domain={[0, leftMax || 'auto']}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              stroke="#d1d5db"
              width={45}
            />
            {toggles.altitude && streams.available.includes('altitude') && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                stroke="#d1d5db"
                width={45}
                tickFormatter={(v) => `${Math.round(v)}m`}
              />
            )}
            <Tooltip content={<CustomTooltip />} />

            {/* Elevation area fill (render first so it's behind lines) */}
            {toggles.altitude && streams.available.includes('altitude') && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="altitude"
                fill="#d1d5db"
                fillOpacity={0.3}
                stroke="#9ca3af"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Power line */}
            {toggles.watts && streams.available.includes('watts') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="watts"
                stroke={STREAM_CONFIG.watts.color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Heart Rate line */}
            {toggles.heartrate && streams.available.includes('heartrate') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heartrate"
                stroke={STREAM_CONFIG.heartrate.color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Cadence line */}
            {toggles.cadence && streams.available.includes('cadence') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cadence"
                stroke={STREAM_CONFIG.cadence.color}
                strokeWidth={1}
                strokeDasharray="4 2"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CoachingChart;
