#!/usr/bin/env bash
# streams_sanity.sh — quick DB sanity check for streams backfill state
# Usage: bash scripts/streams_sanity.sh
set -euo pipefail

DB="server/fitness-coach.db"
USER_ID=1

echo "== Candidate count Jan 2025+ (non-race, no stream row) =="
sqlite3 "$DB" "
SELECT COUNT(*)
FROM activity_sources s
JOIN activities a ON a.id = s.activity_id
LEFT JOIN activity_streams st ON st.activity_id = s.activity_id
WHERE s.user_id = $USER_ID AND s.provider = 'strava'
  AND (s.streams_unavailable IS NULL OR s.streams_unavailable = 0)
  AND st.activity_id IS NULL
  AND DATE(a.start_time) >= '2025-01-01';
"

echo "== Race-tagged candidates outside Jan 2025 (no stream row) =="
sqlite3 "$DB" "
SELECT COUNT(*)
FROM activity_sources s
JOIN activities a ON a.id = s.activity_id
LEFT JOIN activity_streams st ON st.activity_id = s.activity_id
JOIN race_tags rt ON rt.activity_id = s.provider_id
                 AND rt.user_id = s.user_id
                 AND rt.activity_source = 'strava'
                 AND rt.is_race = 1
WHERE s.user_id = $USER_ID AND s.provider = 'strava'
  AND (s.streams_unavailable IS NULL OR s.streams_unavailable = 0)
  AND st.activity_id IS NULL
  AND DATE(a.start_time) < '2025-01-01';
"

echo "== Streams rows Jan 2025+ =="
sqlite3 "$DB" "
SELECT COUNT(*)
FROM activity_streams st
JOIN activities a ON a.id = st.activity_id
WHERE st.user_id = $USER_ID AND DATE(a.start_time) >= '2025-01-01';
"

echo "== Total activity_streams rows =="
sqlite3 "$DB" "SELECT COUNT(*) FROM activity_streams WHERE user_id = $USER_ID;"

echo "== Anomalies: stream_points > 0 but no activity_streams row =="
sqlite3 "$DB" "
SELECT COUNT(*) FROM activity_sources s
LEFT JOIN activity_streams st ON st.activity_id = s.activity_id
WHERE s.user_id = $USER_ID AND s.provider = 'strava'
  AND (s.stream_points IS NOT NULL AND s.stream_points > 0)
  AND st.activity_id IS NULL;
"

echo "== Any forbidden ignore_reason =="
sqlite3 "$DB" "
SELECT COUNT(*) FROM activity_sources
WHERE ignore_reason = 'pre_jan_2025_backfill_skip';
"

echo "== provider_sync_state (strava) =="
sqlite3 "$DB" "
SELECT streams_backfill_enabled, streams_backfill_total_candidates,
       streams_backfill_completed, streams_backfill_failed,
       streams_backfill_is_complete, streams_backfill_last_run_at
FROM provider_sync_state WHERE user_id = $USER_ID AND provider = 'strava';
"

echo "== Analytics table counts =="
sqlite3 "$DB" "SELECT 'normalised', COUNT(*) FROM activity_normalised WHERE user_id = $USER_ID
UNION ALL SELECT 'stress', COUNT(*) FROM activity_stress WHERE user_id = $USER_ID
UNION ALL SELECT 'durability', COUNT(*) FROM activity_durability WHERE user_id = $USER_ID;"
