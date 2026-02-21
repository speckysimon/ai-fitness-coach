#!/usr/bin/env node

/**
 * Set Athlete Thresholds
 * 
 * Manually set FTP and FTHR for an athlete.
 * 
 * Usage:
 *   node server/scripts/set-athlete-thresholds.js <userId> <ftp> [fthr]
 * 
 * Examples:
 *   node server/scripts/set-athlete-thresholds.js 1 250        # Set FTP=250W for user 1
 *   node server/scripts/set-athlete-thresholds.js 1 250 170    # Set FTP=250W, FTHR=170 for user 1
 */

import { setAthleteThresholds } from '../services/athleteThresholdsService.js';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node server/scripts/set-athlete-thresholds.js <userId> <ftp> [fthr]');
  console.error('Example: node server/scripts/set-athlete-thresholds.js 1 250 170');
  process.exit(1);
}

const userId = parseInt(args[0]);
const ftp = parseFloat(args[1]);
const fthr = args[2] ? parseFloat(args[2]) : null;

if (isNaN(userId) || isNaN(ftp)) {
  console.error('Error: userId and ftp must be valid numbers');
  process.exit(1);
}

console.log('🎯 Setting Athlete Thresholds\n');
console.log(`User ID: ${userId}`);
console.log(`FTP: ${ftp}W`);
console.log(`FTHR: ${fthr ? `${fthr} bpm` : 'not set'}\n`);

const result = setAthleteThresholds(userId, ftp, fthr);

if (result.success) {
  console.log('✅ Thresholds set successfully\n');
  process.exit(0);
} else {
  console.error(`❌ Error: ${result.error}\n`);
  process.exit(1);
}
