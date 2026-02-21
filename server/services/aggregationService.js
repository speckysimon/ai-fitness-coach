import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

/**
 * Aggregation Service
 * 
 * Computes monthly rollups of activity data to enable:
 * - Long-term history retention without storing full activity details
 * - Efficient AI context generation (monthly summaries vs 1000s of activities)
 * - Power curve tracking over time
 * - Safe pruning of old detailed activities
 */

/**
 * Recompute monthly aggregates for a specific user and month range
 * @param {number} userId - User ID
 * @param {Array<{year: number, month: number}>} months - Months to recompute
 * @returns {Object} - { success, monthsProcessed, errors }
 */
export function recomputeMonthlyAggregates(userId, months = null) {
  if (!userId || typeof userId !== 'number') {
    return { success: false, error: 'Invalid user ID' };
  }

  try {
    // If no months specified, compute for all months with activities
    if (!months) {
      months = getMonthsWithActivities(userId);
    }

    console.log(`📊 [Aggregation] Computing ${months.length} months for user ${userId}`);

    let processed = 0;
    const errors = [];

    for (const { year, month } of months) {
      try {
        computeMonthlySummary(userId, year, month);
        computeMonthlyBests(userId, year, month);
        processed++;
      } catch (err) {
        console.error(`❌ [Aggregation] Failed ${year}-${month}:`, err.message);
        errors.push({ year, month, error: err.message });
      }
    }

    console.log(`✅ [Aggregation] Processed ${processed}/${months.length} months`);

    return {
      success: errors.length === 0,
      monthsProcessed: processed,
      monthsTotal: months.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('❌ [Aggregation] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all months that have activities for a user
 */
function getMonthsWithActivities(userId) {
  const rows = db.prepare(`
    SELECT DISTINCT 
      CAST(strftime('%Y', start_time) AS INTEGER) as year,
      CAST(strftime('%m', start_time) AS INTEGER) as month
    FROM activities
    WHERE user_id = ?
    ORDER BY year DESC, month DESC
  `).all(userId);

  return rows;
}

/**
 * Compute monthly summary for a specific month
 */
function computeMonthlySummary(userId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = month === 12 
    ? `${year + 1}-01-01` 
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  // Aggregate activity metrics
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_activities,
      SUM(CASE WHEN type = 'Ride' THEN 1 ELSE 0 END) as ride_count,
      SUM(CASE WHEN type = 'Run' THEN 1 ELSE 0 END) as run_count,
      SUM(CASE WHEN type NOT IN ('Ride', 'Run') THEN 1 ELSE 0 END) as other_count,
      
      SUM(duration_s) as total_duration_s,
      SUM(distance_m) as total_distance_m,
      SUM(elevation_m) as total_elevation_m,
      SUM(tss) as total_tss,
      
      AVG(avg_power) as avg_power,
      AVG(avg_hr) as avg_hr,
      AVG(avg_cadence) as avg_cadence
    FROM activities
    WHERE user_id = ?
      AND start_time >= ?
      AND start_time < ?
  `).get(userId, startDate, endDate);

  // Aggregate zone times from enriched activities
  const zoneTimes = aggregateZoneTimes(userId, startDate, endDate);

  // Calculate weekly metrics
  const weeklyMetrics = calculateWeeklyMetrics(userId, startDate, endDate);

  // UPSERT monthly summary
  db.prepare(`
    INSERT INTO athlete_monthly_summary (
      user_id, year, month,
      total_activities, ride_count, run_count, other_count,
      total_duration_s, total_distance_m, total_elevation_m, total_tss,
      z1_time_s, z2_time_s, z3_time_s, z4_time_s, z5_time_s, z6_time_s, z7_time_s,
      avg_power, avg_hr, avg_cadence,
      avg_weekly_tss, max_weekly_tss,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, year, month) DO UPDATE SET
      total_activities = excluded.total_activities,
      ride_count = excluded.ride_count,
      run_count = excluded.run_count,
      other_count = excluded.other_count,
      total_duration_s = excluded.total_duration_s,
      total_distance_m = excluded.total_distance_m,
      total_elevation_m = excluded.total_elevation_m,
      total_tss = excluded.total_tss,
      z1_time_s = excluded.z1_time_s,
      z2_time_s = excluded.z2_time_s,
      z3_time_s = excluded.z3_time_s,
      z4_time_s = excluded.z4_time_s,
      z5_time_s = excluded.z5_time_s,
      z6_time_s = excluded.z6_time_s,
      z7_time_s = excluded.z7_time_s,
      avg_power = excluded.avg_power,
      avg_hr = excluded.avg_hr,
      avg_cadence = excluded.avg_cadence,
      avg_weekly_tss = excluded.avg_weekly_tss,
      max_weekly_tss = excluded.max_weekly_tss,
      updated_at = datetime('now')
  `).run(
    userId, year, month,
    summary.total_activities || 0,
    summary.ride_count || 0,
    summary.run_count || 0,
    summary.other_count || 0,
    summary.total_duration_s || 0,
    summary.total_distance_m || 0,
    summary.total_elevation_m || 0,
    summary.total_tss || 0,
    zoneTimes.z1 || 0,
    zoneTimes.z2 || 0,
    zoneTimes.z3 || 0,
    zoneTimes.z4 || 0,
    zoneTimes.z5 || 0,
    zoneTimes.z6 || 0,
    zoneTimes.z7 || 0,
    summary.avg_power,
    summary.avg_hr,
    summary.avg_cadence,
    weeklyMetrics.avg || 0,
    weeklyMetrics.max || 0
  );

  console.log(`  ✓ Summary ${year}-${month}: ${summary.total_activities} activities, ${Math.round(summary.total_tss || 0)} TSS`);
}

/**
 * Aggregate zone times from raw_json of enriched activities
 */
function aggregateZoneTimes(userId, startDate, endDate) {
  const activities = db.prepare(`
    SELECT s.raw_json
    FROM activities a
    JOIN activity_sources s ON s.activity_id = a.id
    WHERE a.user_id = ?
      AND a.start_time >= ?
      AND a.start_time < ?
      AND s.raw_json IS NOT NULL
  `).all(userId, startDate, endDate);

  const totals = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };

  for (const { raw_json } of activities) {
    try {
      const raw = JSON.parse(raw_json);
      const zones = raw.icu_zone_times;
      
      if (Array.isArray(zones)) {
        zones.forEach((z, i) => {
          const zoneKey = `z${i + 1}`;
          if (totals[zoneKey] !== undefined) {
            totals[zoneKey] += (z.secs || z || 0);
          }
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return totals;
}

/**
 * Calculate weekly TSS metrics for the month
 */
function calculateWeeklyMetrics(userId, startDate, endDate) {
  const activities = db.prepare(`
    SELECT start_time, tss
    FROM activities
    WHERE user_id = ?
      AND start_time >= ?
      AND start_time < ?
      AND tss IS NOT NULL
    ORDER BY start_time
  `).all(userId, startDate, endDate);

  if (activities.length === 0) {
    return { avg: 0, max: 0 };
  }

  // Group by week
  const weeks = {};
  for (const act of activities) {
    const date = new Date(act.start_time);
    const weekKey = getWeekKey(date);
    weeks[weekKey] = (weeks[weekKey] || 0) + (act.tss || 0);
  }

  const weeklyTotals = Object.values(weeks);
  const avg = weeklyTotals.reduce((sum, v) => sum + v, 0) / weeklyTotals.length;
  const max = Math.max(...weeklyTotals);

  return { avg, max };
}

/**
 * Get ISO week key for grouping
 */
function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Compute monthly bests (power curve) for a specific month
 */
function computeMonthlyBests(userId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = month === 12 
    ? `${year + 1}-01-01` 
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  // Get all activities with power data in this month
  const activities = db.prepare(`
    SELECT a.id, a.avg_power, a.max_power, a.normalized_power, a.duration_s
    FROM activities a
    WHERE a.user_id = ?
      AND a.start_time >= ?
      AND a.start_time < ?
      AND a.has_power = 1
    ORDER BY a.max_power DESC
  `).all(userId, startDate, endDate);

  if (activities.length === 0) {
    console.log(`  ⏭️  Bests ${year}-${month}: No power data`);
    return;
  }

  // For now, use simple heuristics for bests (in production, would parse streams)
  // Best 5s ≈ max_power, Best 20min ≈ normalized_power
  const best5s = Math.max(...activities.map(a => a.max_power || 0));
  const best20min = Math.max(...activities.map(a => a.normalized_power || 0));
  const best60min = Math.max(...activities.filter(a => a.duration_s >= 3600).map(a => a.avg_power || 0));

  // Estimate FTP from 20min power
  const estimatedFtp = best20min ? Math.round(best20min * 0.95) : null;

  // Find activity IDs for reference
  const best5sActivity = activities.find(a => a.max_power === best5s)?.id;
  const best20minActivity = activities.find(a => a.normalized_power === best20min)?.id;

  db.prepare(`
    INSERT INTO athlete_monthly_bests (
      user_id, year, month,
      best_5s, best_20min, best_60min,
      best_5s_activity_id, best_20min_activity_id,
      estimated_ftp,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, year, month) DO UPDATE SET
      best_5s = excluded.best_5s,
      best_20min = excluded.best_20min,
      best_60min = excluded.best_60min,
      best_5s_activity_id = excluded.best_5s_activity_id,
      best_20min_activity_id = excluded.best_20min_activity_id,
      estimated_ftp = excluded.estimated_ftp,
      updated_at = datetime('now')
  `).run(
    userId, year, month,
    best5s || null,
    best20min || null,
    best60min || null,
    best5sActivity,
    best20minActivity,
    estimatedFtp
  );

  console.log(`  ✓ Bests ${year}-${month}: FTP ~${estimatedFtp}W, 5s ${best5s}W, 20min ${best20min}W`);
}

/**
 * Get monthly summaries for a user (for AI context)
 * @param {number} userId
 * @param {number} monthsBack - How many months to retrieve
 * @returns {Array} - Monthly summaries
 */
export function getMonthlySummaries(userId, monthsBack = 12) {
  return db.prepare(`
    SELECT *
    FROM athlete_monthly_summary
    WHERE user_id = ?
    ORDER BY year DESC, month DESC
    LIMIT ?
  `).all(userId, monthsBack);
}

/**
 * Get monthly bests for a user
 */
export function getMonthlyBests(userId, monthsBack = 12) {
  return db.prepare(`
    SELECT *
    FROM athlete_monthly_bests
    WHERE user_id = ?
    ORDER BY year DESC, month DESC
    LIMIT ?
  `).all(userId, monthsBack);
}

export default {
  recomputeMonthlyAggregates,
  getMonthlySummaries,
  getMonthlyBests
};
