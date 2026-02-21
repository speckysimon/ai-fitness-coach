/**
 * Run Activity Import/Enrichment Audit
 * 
 * Usage:
 *   node scripts/run-activity-audit.js --user=simon@i-duna.com
 *   node scripts/run-activity-audit.js --userId=1
 */

import { generateActivityAudit } from '../server/services/activityAuditGenerator.js';
import db from '../server/db.js';

// Parse command line args
const args = process.argv.slice(2);
const options = {};

for (const arg of args) {
  const [key, value] = arg.replace(/^--/, '').split('=');
  options[key] = value;
}

async function main() {
  console.log('Activity Import/Enrichment Audit Runner\n');
  
  // Get user ID
  let userId = options.userId ? parseInt(options.userId) : null;
  
  if (!userId && options.user) {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(options.user);
    if (!user) {
      console.error(`❌ User not found: ${options.user}`);
      process.exit(1);
    }
    userId = user.id;
  }
  
  if (!userId) {
    console.error('❌ Must provide --user=email or --userId=N');
    process.exit(1);
  }
  
  // Run audit
  const daysBack = options.days ? parseInt(options.days) : 730;
  const outputDir = options.output || '/tmp';
  
  try {
    const result = await generateActivityAudit(userId, { daysBack, outputDir });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`AUDIT COMPLETE`);
    console.log(`${'='.repeat(80)}\n`);
    
    if (result.shellCount > 0) {
      console.log(`❌ CRITICAL: ${result.shellCount} shell activities found as canonical`);
      console.log(`   This is a BUG - shells should NEVER be canonical\n`);
      process.exit(1);
    } else {
      console.log(`✅ PASS: No shell activities found as canonical\n`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n❌ Audit failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
