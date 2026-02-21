/**
 * Activity Import/Enrichment Audit Generator
 * 
 * Generates comprehensive audit reports showing:
 * - Per-activity canonical selection decisions
 * - Shell detection and handling
 * - Enrichment actions taken
 * - Completeness scores
 * - Reasons for all decisions
 * 
 * Output formats: Console summary + JSON + CSV
 */

import db from '../db.js';
import fs from 'fs';
import path from 'path';

/**
 * Check if activity is a shell (missing core fields)
 */
function isShellActivity(activity) {
  const duration = activity.duration_s || activity.moving_time || activity.elapsed_time || 0;
  const distance = activity.distance_m || activity.distance || 0;
  const hasStartTime = !!(activity.start_time || activity.start_date);
  const name = activity.name || '';
  const isUntitled = !name || /^untitled|^unnamed|^$/i.test(name.trim());
  
  // No start time = definitely shell
  if (!hasStartTime) {
    return { isShell: true, reason: `no_start_time` };
  }
  
  // Zero duration = definitely shell
  if (duration === 0) {
    return { isShell: true, reason: `zero_duration` };
  }
  
  // Zero distance with no metrics AND untitled = shell
  // (non-cycling activities like "Paving" or "Planting trees" can have distance=0 legitimately)
  const hasPower = (activity.avg_power || activity.average_watts || 0) > 0;
  const hasHR = (activity.avg_hr || activity.average_heartrate || 0) > 0;
  const hasTSS = (activity.tss || activity.suffer_score || 0) > 0;
  
  if (distance === 0 && !hasPower && !hasHR && !hasTSS && isUntitled) {
    return { isShell: true, reason: `zero_distance_no_metrics_untitled` };
  }
  
  // Very short + no metrics = likely shell
  if (!hasPower && !hasHR && !hasTSS && duration < 300 && isUntitled) {
    return { isShell: true, reason: 'no_metrics_short_untitled' };
  }
  
  return { isShell: false, reason: 'has_data' };
}

/**
 * Calculate completeness score for an activity
 */
function calculateCompleteness(activity, sources) {
  const required = [
    'start_time',
    'duration_s',
    'distance_m',
    'sport',
    'type'
  ];
  
  const desirable = [
    'avg_power',
    'avg_hr',
    'tss',
    'elevation_gain',
    'avg_speed'
  ];
  
  let score = 0;
  let maxScore = required.length + desirable.length;
  
  // Required fields (2 points each)
  for (const field of required) {
    if (activity[field] != null && activity[field] !== 0) {
      score += 2;
    }
  }
  
  // Desirable fields (1 point each)
  for (const field of desirable) {
    if (activity[field] != null && activity[field] !== 0) {
      score += 1;
    }
  }
  
  // Check for streams
  const hasStreams = sources.some(s => s.has_streams === 1);
  if (hasStreams) {
    score += 2;
    maxScore += 2;
  }
  
  return Math.round((score / maxScore) * 100);
}

/**
 * Generate audit for a single user
 */
export async function generateActivityAudit(userId, options = {}) {
  const { outputDir = '/tmp', daysBack = 730 } = options;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ACTIVITY IMPORT/ENRICHMENT AUDIT`);
  console.log(`User ID: ${userId}`);
  console.log(`Days back: ${daysBack}`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Get user info
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  
  console.log(`User: ${user.name} (${user.email})\n`);
  
  // Calculate date range
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffISO = cutoffDate.toISOString();
  
  // Get all canonical activities
  const activities = db.prepare(`
    SELECT * FROM activities
    WHERE user_id = ? AND start_time >= ?
    ORDER BY start_time DESC
  `).all(userId, cutoffISO);
  
  console.log(`📊 Found ${activities.length} canonical activities\n`);
  
  // Get all activity sources
  const allSources = db.prepare(`
    SELECT * FROM activity_sources
    WHERE user_id = ?
  `).all(userId);
  
  console.log(`📦 Found ${allSources.length} activity sources\n`);
  
  // Build audit records
  const auditRecords = [];
  const shellActivities = [];
  
  for (const activity of activities) {
    // Get sources for this activity
    const sources = allSources.filter(s => s.activity_id === activity.id);
    
    // Provider presence flags
    const hasStrava = sources.some(s => s.provider === 'strava');
    const hasIntervals = sources.some(s => s.provider === 'intervals');
    const hasFIT = sources.some(s => s.provider === 'fit');
    
    // Check if canonical is a shell
    const shellCheck = isShellActivity(activity);
    
    // Get source details
    const stravaSource = sources.find(s => s.provider === 'strava');
    const intervalsSource = sources.find(s => s.provider === 'intervals');
    const fitSource = sources.find(s => s.provider === 'fit');
    
    // Determine canonical selection reasons
    const reasons = [];
    
    if (activity.physiology_source === 'fit') {
      reasons.push('FIT available - highest physiology priority');
    } else if (activity.physiology_source === 'intervals') {
      reasons.push('Intervals-native physiology');
      if (hasStrava) {
        reasons.push('Strava present but Intervals-native protected');
      }
    } else if (activity.physiology_source === 'strava') {
      reasons.push('Strava physiology');
      if (hasIntervals) {
        reasons.push('Intervals present but was shell or lower priority');
      }
    }
    
    if (activity.metadata_source === 'strava') {
      reasons.push('Strava metadata (highest priority)');
    } else if (activity.metadata_source === 'intervals') {
      reasons.push('Intervals metadata');
    }
    
    // Enrichment actions
    const enrichmentActions = {
      strava_backfilled_distance: false,
      strava_backfilled_elevation: false,
      strava_backfilled_speed: false,
      physiology_streams_protected: activity.physiology_source === 'intervals' && hasStrava
    };
    
    // Check if Strava filled missing fields
    if (stravaSource && activity.metadata_source === 'strava') {
      if (activity.distance_m > 0 && (!intervalsSource || !intervalsSource.distance_m)) {
        enrichmentActions.strava_backfilled_distance = true;
      }
      if (activity.elevation_gain > 0 && (!intervalsSource || !intervalsSource.elevation_gain)) {
        enrichmentActions.strava_backfilled_elevation = true;
      }
      if (activity.avg_speed > 0 && (!intervalsSource || !intervalsSource.avg_speed)) {
        enrichmentActions.strava_backfilled_speed = true;
      }
    }
    
    // Calculate completeness
    const completeness = calculateCompleteness(activity, sources);
    
    // Warnings
    const warnings = [];
    if (shellCheck.isShell) {
      warnings.push(`CRITICAL: Canonical is shell - ${shellCheck.reason}`);
    }
    if (activity.is_shell === 1) {
      warnings.push('Activity marked as shell in DB');
    }
    if (completeness < 50) {
      warnings.push(`Low completeness: ${completeness}%`);
    }
    if (!hasStrava && !hasIntervals && !hasFIT) {
      warnings.push('No provider sources found');
    }
    
    const record = {
      canonical_activity_id: activity.id,
      start_time_utc: activity.start_time,
      name: activity.name,
      sport: activity.sport,
      duration_s: activity.duration_s,
      distance_m: activity.distance_m,
      
      // Canonical selection
      chosen_canonical_provider: activity.physiology_source,
      physiology_source: activity.physiology_source,
      metadata_source: activity.metadata_source,
      
      // Provider presence
      has_strava: hasStrava,
      has_intervals: hasIntervals,
      has_fit: hasFIT,
      
      // Shell detection
      is_shell_canonical: shellCheck.isShell,
      shell_reason: shellCheck.reason,
      is_shell_db_flag: activity.is_shell === 1,
      
      // Source details
      strava_duration: stravaSource?.duration_s || null,
      strava_distance: stravaSource?.distance_m || null,
      strava_power: stravaSource?.avg_power || null,
      intervals_duration: intervalsSource?.duration_s || null,
      intervals_distance: intervalsSource?.distance_m || null,
      intervals_power: intervalsSource?.avg_power || null,
      fit_duration: fitSource?.duration_s || null,
      fit_distance: fitSource?.distance_m || null,
      
      // Canonical selection reasons
      selection_reasons: reasons.join('; '),
      
      // Enrichment actions
      ...enrichmentActions,
      
      // Completeness
      completeness_pct: completeness,
      
      // Warnings
      warnings: warnings.join('; ') || null
    };
    
    auditRecords.push(record);
    
    // Track shell activities
    if (shellCheck.isShell || activity.is_shell === 1) {
      shellActivities.push({
        canonical_id: activity.id,
        start_time: activity.start_time,
        name: activity.name,
        shell_reason: shellCheck.reason,
        has_strava: hasStrava,
        has_intervals: hasIntervals,
        intervals_id: intervalsSource?.provider_id || null,
        strava_id: stravaSource?.provider_id || null,
        why_strava_didnt_enrich: hasStrava && activity.physiology_source !== 'strava' 
          ? 'Intervals-native protected from Strava overwrite' 
          : 'Strava not present'
      });
    }
  }
  
  // Console summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`AUDIT SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`Total canonical activities: ${activities.length}`);
  console.log(`Total activity sources: ${allSources.length}`);
  console.log(`\nProvider breakdown:`);
  console.log(`  - Strava sources: ${allSources.filter(s => s.provider === 'strava').length}`);
  console.log(`  - Intervals sources: ${allSources.filter(s => s.provider === 'intervals').length}`);
  console.log(`  - FIT sources: ${allSources.filter(s => s.provider === 'fit').length}`);
  
  console.log(`\nCanonical physiology sources:`);
  console.log(`  - FIT: ${activities.filter(a => a.physiology_source === 'fit').length}`);
  console.log(`  - Intervals: ${activities.filter(a => a.physiology_source === 'intervals').length}`);
  console.log(`  - Strava: ${activities.filter(a => a.physiology_source === 'strava').length}`);
  
  console.log(`\nCanonical metadata sources:`);
  console.log(`  - Strava: ${activities.filter(a => a.metadata_source === 'strava').length}`);
  console.log(`  - Intervals: ${activities.filter(a => a.metadata_source === 'intervals').length}`);
  console.log(`  - FIT: ${activities.filter(a => a.metadata_source === 'fit').length}`);
  
  const shellCount = auditRecords.filter(r => r.is_shell_canonical).length;
  console.log(`\n⚠️  SHELL ACTIVITIES (CANONICAL): ${shellCount}`);
  if (shellCount > 0) {
    console.log(`   ❌ CRITICAL: ${shellCount} canonical activities are shells - THIS SHOULD BE 0`);
  }
  
  const avgCompleteness = Math.round(
    auditRecords.reduce((sum, r) => sum + r.completeness_pct, 0) / auditRecords.length
  );
  console.log(`\nAverage completeness: ${avgCompleteness}%`);
  
  const lowCompleteness = auditRecords.filter(r => r.completeness_pct < 50).length;
  if (lowCompleteness > 0) {
    console.log(`⚠️  ${lowCompleteness} activities with <50% completeness`);
  }
  
  // Shell activities section
  if (shellActivities.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`UNTITLED / SHELL ACTIVITIES`);
    console.log(`${'='.repeat(80)}\n`);
    console.log(`Found ${shellActivities.length} shell activities:\n`);
    
    for (const shell of shellActivities.slice(0, 10)) {
      console.log(`  ID: ${shell.canonical_id}`);
      console.log(`  Name: ${shell.name}`);
      console.log(`  Start: ${shell.start_time}`);
      console.log(`  Reason: ${shell.shell_reason}`);
      console.log(`  Intervals ID: ${shell.intervals_id || 'N/A'}`);
      console.log(`  Strava ID: ${shell.strava_id || 'N/A'}`);
      console.log(`  Has Strava: ${shell.has_strava}`);
      console.log(`  Has Intervals: ${shell.has_intervals}`);
      console.log(`  Why Strava didn't enrich: ${shell.why_strava_didnt_enrich}`);
      console.log('');
    }
    
    if (shellActivities.length > 10) {
      console.log(`  ... and ${shellActivities.length - 10} more\n`);
    }
  }
  
  // Write JSON
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `activity-audit-${userId}-${timestamp}.json`);
  const jsonData = {
    meta: {
      userId,
      userEmail: user.email,
      userName: user.name,
      generatedAt: new Date().toISOString(),
      daysBack,
      cutoffDate: cutoffISO
    },
    summary: {
      totalActivities: activities.length,
      totalSources: allSources.length,
      shellCanonicalCount: shellCount,
      avgCompleteness,
      lowCompletenessCount: lowCompleteness
    },
    activities: auditRecords,
    shellActivities
  };
  
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`\n✅ JSON audit written to: ${jsonPath}`);
  
  // Write CSV
  const csvPath = path.join(outputDir, `activity-audit-${userId}-${timestamp}.csv`);
  const csvHeaders = Object.keys(auditRecords[0] || {}).join(',');
  const csvRows = auditRecords.map(r => 
    Object.values(r).map(v => 
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(',')
  );
  const csvContent = [csvHeaders, ...csvRows].join('\n');
  
  fs.writeFileSync(csvPath, csvContent);
  console.log(`✅ CSV audit written to: ${csvPath}\n`);
  
  return {
    ok: true,
    summary: jsonData.summary,
    jsonPath,
    csvPath,
    shellCount,
    activities: auditRecords
  };
}

export default {
  generateActivityAudit,
  isShellActivity,
  calculateCompleteness
};
