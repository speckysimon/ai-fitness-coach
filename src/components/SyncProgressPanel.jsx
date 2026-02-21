import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Download, CheckCircle2, AlertTriangle, Clock, Zap, Copy, ChevronDown, ChevronUp } from 'lucide-react';

const POLL_INTERVAL_MS = 3000;

function fmt(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

function ProgressBar({ value, max, color = 'blue' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color] || colors.blue}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * SyncProgressPanel
 *
 * Props:
 *   syncStatus      - 'idle' | 'running' | 'complete' | 'error' | 'cooldown'
 *   syncResult      - last sync result object from server
 *   onFullSync      - callback to trigger full sync
 *   onRefresh       - callback to trigger incremental sync
 *   isLoading       - bool: any sync in progress
 */
const SyncProgressPanel = ({ syncStatus = 'idle', syncResult = null, onFullSync, onRefresh, isLoading = false }) => {
  const [statusData, setStatusData] = useState(null);
  const [pollError, setPollError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [streamsExpanded, setStreamsExpanded] = useState(true);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token');
      if (!token) return;
      const res = await fetch('/api/providers/sync-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setStatusData(data);
        setPollError(null);
      }
    } catch (err) {
      setPollError(err.message);
    }
  }, []);

  // Poll while running, fetch once on mount and after sync completes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, syncStatus]);

  useEffect(() => {
    if (isLoading) {
      pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    } else {
      clearInterval(pollRef.current);
      // Final fetch after sync ends
      if (syncStatus === 'complete' || syncStatus === 'error') {
        setTimeout(fetchStatus, 500);
      }
    }
    return () => clearInterval(pollRef.current);
  }, [isLoading, syncStatus, fetchStatus]);

  const streams = statusData?.providers?.strava?.streams;
  const strava = statusData?.providers?.strava;
  const intervals = statusData?.providers?.intervals;

  const streamsTotal = streams?.total_candidates || 0;
  const streamsCompleted = streams?.completed || 0;
  const streamsFailed = streams?.failed || 0;
  const streamsIsComplete = streams?.is_complete || false;
  const streamsEnabled = streams?.enabled || false;
  const streamsRateLimited = streams?.last_error === 'rate_limited';
  const streamsRemaining = Math.max(0, streamsTotal - streamsCompleted - streamsFailed);
  const streamsPct = streamsTotal > 0 ? Math.round((streamsCompleted / streamsTotal) * 100) : 0;

  const totals = syncResult?.totals || {};

  const handleCopyDebug = () => {
    const report = {
      timestamp: new Date().toISOString(),
      syncResult,
      statusData
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Status badge
  const statusBadge = () => {
    if (syncStatus === 'running' || isLoading) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Running
        </span>
      );
    }
    if (syncStatus === 'complete') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </span>
      );
    }
    if (syncStatus === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-3 h-3" />
          Error
        </span>
      );
    }
    if (syncStatus === 'cooldown') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
          <Clock className="w-3 h-3" />
          Cooldown
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
        Idle
      </span>
    );
  };

  const showPanel = syncStatus !== 'idle' || syncResult || statusData !== null;
  if (!showPanel) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sync Status</span>
          {statusBadge()}
        </div>
        <button
          onClick={handleCopyDebug}
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Copy debug report to clipboard"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? 'Copied!' : 'Copy debug'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Running phase message */}
        {(syncStatus === 'running' || isLoading) && (
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
            <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>
              {totals.fetched > 0
                ? `Fetching streams… (${streamsCompleted} / ${streamsTotal || '?'} activities)`
                : 'Importing activities from providers…'}
            </span>
          </div>
        )}

        {/* Activity import summary */}
        {syncResult && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Activity Import</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Fetched', value: totals.fetched ?? '—' },
                { label: 'New', value: totals.canonicals_created ?? '—' },
                { label: 'Updated', value: totals.canonicals_updated ?? '—' },
                { label: 'Errors', value: totals.errors ?? '—', warn: (totals.errors ?? 0) > 0 }
              ].map(({ label, value, warn }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-center">
                  <div className={`text-lg font-bold ${warn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {value}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                </div>
              ))}
            </div>
            {strava?.last_full_sync_at && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Last full sync: {fmt(strava.last_full_sync_at)}
                {strava.last_full_sync_activities_fetched > 0 && ` · ${strava.last_full_sync_activities_fetched.toLocaleString()} activities`}
              </p>
            )}
          </div>
        )}

        {/* Streams backfill section */}
        {streamsEnabled && (
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setStreamsExpanded(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Streams Backfill</span>
                {streamsIsComplete && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Complete
                  </span>
                )}
                {streamsRateLimited && !isLoading && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                    <Clock className="w-3 h-3" />
                    Rate limited
                  </span>
                )}
              </div>
              {streamsExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {streamsExpanded && (
              <div className="px-3 py-3 space-y-3">
                {/* Progress bar */}
                {streamsTotal > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {streamsCompleted.toLocaleString()} / {streamsTotal.toLocaleString()} cycling activities
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{streamsPct}%</span>
                    </div>
                    <ProgressBar
                      value={streamsCompleted}
                      max={streamsTotal}
                      color={streamsIsComplete ? 'green' : streamsRateLimited ? 'orange' : 'blue'}
                    />
                    {streamsFailed > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {streamsFailed} unavailable (private/deleted)
                      </p>
                    )}
                  </div>
                )}

                {/* Status messages */}
                {streamsIsComplete ? (
                  <p className="text-xs text-green-700 dark:text-green-400">
                    All cycling activity streams have been fetched.
                  </p>
                ) : streamsRateLimited && !isLoading ? (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-2.5">
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">
                      Strava rate limit reached
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      {streamsRemaining.toLocaleString()} activities remaining. Click Full Sync again to continue — Strava allows ~100 stream requests per 15 minutes.
                    </p>
                  </div>
                ) : streamsTotal > 0 && !streamsIsComplete && !isLoading ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {streamsRemaining.toLocaleString()} activities remaining. Click <strong>Full Sync</strong> again to continue.
                  </p>
                ) : streamsTotal === 0 && !isLoading ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    No cycling activities found yet. Run Full Sync to import your history first.
                  </p>
                ) : null}

                {/* Explanation */}
                <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <p>Full Sync imports activity summaries for all history.</p>
                  <p>Streams backfill is processed in batches to respect Strava rate limits.</p>
                  {!streamsIsComplete && <p>Click Full Sync again to continue until complete.</p>}
                </div>

                {streams?.last_run_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Last run: {fmt(streams.last_run_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Last sync timestamps */}
        {!syncResult && statusData && (
          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
            {strava?.last_incremental_sync_at && (
              <p>Last incremental sync: {fmt(strava.last_incremental_sync_at)}</p>
            )}
            {intervals?.last_incremental_sync_at && (
              <p>Intervals last sync: {fmt(intervals.last_incremental_sync_at)}</p>
            )}
          </div>
        )}

        {/* Cooldown message */}
        {syncStatus === 'cooldown' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
            <p className="text-xs font-medium text-orange-800 dark:text-orange-200">Full Sync cooldown active</p>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
              Full Sync can only run once every 10 minutes. Use Refresh for incremental updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncProgressPanel;
