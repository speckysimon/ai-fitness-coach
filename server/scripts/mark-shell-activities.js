#!/usr/bin/env node

/**
 * Mark Shell Activities
 * 
 * Identifies and marks activities that are shells (no meaningful data) with is_shell=1.
 * Shell activities have no duration or no meaningful metrics (distance, power, HR).
 * 
 * Usage:
 *   node server/scripts/mark-shell-activities.js [days]
 * 
 * Examples:
 *   node server/scripts/mark-shell-activities.js          # All activities
 *   node server/scripts/mark-shell-activities.js 180      # Last 180 days only
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { isValidActivity, getShellReason } from '../utils/activityValidation.js';

const args = process.argv.slice(2);
const days = args[0] ? parseInt(args[0]) : null;

console.log('🔍 Shell Activity Detection\n');
console.log(`Configuration:`);
console.log(`  Scope: ${days ? `Last ${days} days` : 'All time'}\n`);

const startTime = Date.now();

// Build query
let query = `SELECT * FROM activities WHERE primary_source != 'manual'`;
const params = [];

if (days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();
  query += ` AND start_time >= ?`;
  params.push(cutoffISO);
}

query += ` ORDER BY start_time DESC`;

const activities = db.prepare(query).all(...params);

console.log(`📊 Found ${activities.length} activities to check\n`);

let totalChecked = 0;
let shellsMarked = 0;
let validMarked = 0;
let alreadyShell = 0;
let alreadyValid = 0;

const updateStmt = db.prepare(`
  UPDATE activities 
  SET is_shell = ?, shell_reason = ?, updated_at = ?
  WHERE id = ?
`);

for (const activity of activities) {
  totalChecked++;
  
  const valid = isValidActivity(activity);
  const reason = valid ? null : getShellReason(activity);
  const shouldBeShell = !valid;
  const now = new Date().toISOString();
  
  // Check if update needed
  if (shouldBeShell && activity.is_shell !== 1) {
    // Mark as shell
    updateStmt.run(1, reason, now, activity.id);
    shellsMarked++;
    if (shellsMarked <= 5) {
      console.log(`  🚫 Marked shell: ${activity.id} - ${activity.name || 'Untitled'} (${reason})`);
    }
  } else if (!shouldBeShell && activity.is_shell !== 0) {
    // Mark as valid (unmark shell)
    updateStmt.run(0, null, now, activity.id);
    validMarked++;
    if (validMarked <= 5) {
      console.log(`  ✅ Unmarked shell: ${activity.id} - ${activity.name || 'Untitled'}`);
    }
  } else if (shouldBeShell && activity.is_shell === 1) {
    alreadyShell++;
  } else {
    alreadyValid++;
  }
  
  if (totalChecked % 50 === 0) {
    console.log(`  Processed ${totalChecked}/${activities.length}...`);
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`\n📊 Results (${days ? `last ${days} days` : 'all time'}):`);
console.log(`  Total checked: ${totalChecked}`);
console.log(`  Newly marked as shell: ${shellsMarked}`);
console.log(`  Newly marked as valid: ${validMarked}`);
console.log(`  Already shell: ${alreadyShell}`);
console.log(`  Already valid: ${alreadyValid}`);
console.log(`  Duration: ${duration}s`);

// Show window-scoped summary stats
let windowQuery = `SELECT COUNT(*) as count FROM activities WHERE is_shell = 1`;
let windowValidQuery = `SELECT COUNT(*) as count FROM activities WHERE is_shell = 0`;
const windowParams = [];

if (days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();
  windowQuery += ` AND start_time >= ?`;
  windowValidQuery += ` AND start_time >= ?`;
  windowParams.push(cutoffISO);
}

const windowShellCount = db.prepare(windowQuery).get(...windowParams);
const windowValidCount = db.prepare(windowValidQuery).get(...windowParams);

console.log(`\n📈 Summary (${days ? `last ${days} days` : 'all time'}):`);
console.log(`  Total shells: ${windowShellCount.count}`);
console.log(`  Total valid: ${windowValidCount.count}`);

// Show all-time totals if window was specified
if (days) {
  const allTimeShells = db.prepare(`SELECT COUNT(*) as count FROM activities WHERE is_shell = 1`).get();
  const allTimeValid = db.prepare(`SELECT COUNT(*) as count FROM activities WHERE is_shell = 0`).get();
  console.log(`\n📈 Summary (all time):`);
  console.log(`  Total shells: ${allTimeShells.count}`);
  console.log(`  Total valid: ${allTimeValid.count}`);
}

// Show shell breakdown by reason (window-scoped)
let reasonQuery = `
  SELECT shell_reason, COUNT(*) as count 
  FROM activities 
  WHERE is_shell = 1
`;
if (days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();
  reasonQuery += ` AND start_time >= ?`;
  const reasonBreakdown = db.prepare(reasonQuery + ` GROUP BY shell_reason ORDER BY count DESC`).all(cutoffISO);
  
  if (reasonBreakdown.length > 0) {
    console.log(`\n🔍 Shell Reasons (last ${days} days):`);
    reasonBreakdown.forEach(r => {
      console.log(`  ${r.shell_reason || 'unknown'}: ${r.count}`);
    });
  }
} else {
  const reasonBreakdown = db.prepare(reasonQuery + ` GROUP BY shell_reason ORDER BY count DESC`).all();
  
  if (reasonBreakdown.length > 0) {
    console.log(`\n🔍 Shell Reasons (all time):`);
    reasonBreakdown.forEach(r => {
      console.log(`  ${r.shell_reason || 'unknown'}: ${r.count}`);
    });
  }
}

console.log(`\n✅ Shell marking complete\n`);

process.exit(0);
