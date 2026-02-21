#!/usr/bin/env node

/**
 * Cleanup Shell Activity Interpretations
 * 
 * Reports (and optionally purges) interpretation rows for shell activities.
 * Shell activities should not have interpretations since they have no meaningful data.
 * 
 * Usage:
 *   node server/scripts/cleanup-shell-interpretations.js           # Report only (default)
 *   node server/scripts/cleanup-shell-interpretations.js --purge   # Delete interpretation rows for shells
 * 
 * Examples:
 *   node server/scripts/cleanup-shell-interpretations.js          # Safe: just report
 *   node server/scripts/cleanup-shell-interpretations.js --purge  # Destructive: delete
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

const args = process.argv.slice(2);
const purge = args.includes('--purge');

console.log('🧹 Shell Activity Interpretation Cleanup\n');
console.log(`Mode: ${purge ? '⚠️  PURGE (destructive)' : '📊 REPORT ONLY (safe)'}\n`);

const startTime = Date.now();

// Find interpretation rows for shell activities
const shellInterpretations = db.prepare(`
  SELECT 
    i.activity_id,
    a.name,
    a.shell_reason,
    i.interpretation_version,
    i.computed_at
  FROM activity_interpretation i
  JOIN activities a ON a.id = i.activity_id
  WHERE a.is_shell = 1
  ORDER BY i.computed_at DESC
`).all();

console.log(`📊 Found ${shellInterpretations.length} interpretation rows for shell activities\n`);

if (shellInterpretations.length === 0) {
  console.log('✅ No cleanup needed - all interpretation rows are for valid activities\n');
  process.exit(0);
}

// Show samples
if (shellInterpretations.length > 0) {
  console.log('🔍 Sample shell interpretations:');
  shellInterpretations.slice(0, 5).forEach(row => {
    console.log(`  ${row.activity_id} - ${row.name || 'Untitled'} (${row.shell_reason})`);
  });
  if (shellInterpretations.length > 5) {
    console.log(`  ... and ${shellInterpretations.length - 5} more`);
  }
  console.log('');
}

// Show breakdown by shell_reason
const reasonBreakdown = db.prepare(`
  SELECT 
    a.shell_reason,
    COUNT(*) as count
  FROM activity_interpretation i
  JOIN activities a ON a.id = i.activity_id
  WHERE a.is_shell = 1
  GROUP BY a.shell_reason
  ORDER BY count DESC
`).all();

if (reasonBreakdown.length > 0) {
  console.log('📈 Breakdown by shell reason:');
  reasonBreakdown.forEach(r => {
    console.log(`  ${r.shell_reason || 'unknown'}: ${r.count}`);
  });
  console.log('');
}

if (purge) {
  console.log('⚠️  PURGING interpretation rows for shell activities...\n');
  
  const deleteStmt = db.prepare(`
    DELETE FROM activity_interpretation
    WHERE activity_id IN (
      SELECT id FROM activities WHERE is_shell = 1
    )
  `);
  
  const result = deleteStmt.run();
  
  console.log(`✅ Deleted ${result.changes} interpretation rows\n`);
} else {
  console.log('ℹ️  To purge these interpretation rows, run with --purge flag:\n');
  console.log('   node server/scripts/cleanup-shell-interpretations.js --purge\n');
}

const duration = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`Duration: ${duration}s\n`);

process.exit(0);
