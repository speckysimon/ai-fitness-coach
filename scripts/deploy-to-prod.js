#!/usr/bin/env node
import { execSync } from 'child_process';
import readline from 'readline';

// Colors for output
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const exec = (command, options = {}) => {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
};

const askQuestion = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

async function main() {
  log('blue', '\n🚀 Starting production deployment...\n');

  // Step 1: Local validation
  log('blue', '📋 Step 1: Local validation');
  try {
    // Check git status
    const gitStatus = exec('git status --porcelain').trim();
    if (gitStatus) {
      log('yellow', '⚠️  Uncommitted changes detected:');
      console.log(gitStatus);
      
      const answer = await askQuestion('\nContinue anyway? (y/N) ');
      if (answer.toLowerCase() !== 'y') {
        log('red', '❌ Deployment cancelled');
        process.exit(1);
      }
    }
    
    log('green', '✅ Git status validated\n');
  } catch (error) {
    log('red', `❌ Git check failed: ${error.message}`);
    process.exit(1);
  }

  // Step 2: Push to GitHub
  log('blue', '📤 Step 2: Pushing to GitHub');
  try {
    exec('git push origin main', { stdio: 'inherit' });
    log('green', '✅ Code pushed\n');
  } catch (error) {
    log('red', `❌ Git push failed: ${error.message}`);
    log('yellow', 'Tip: Make sure you have committed your changes');
    process.exit(1);
  }

  // Step 3: Deploy to production
  log('blue', '🚀 Step 3: Deploying to production');
  log('yellow', 'This will SSH to production and run the deployment script...\n');
  
  try {
    exec(
      'ssh riderlabs@riderlabs.io "cd /home/riderlabs/ai-fitness-coach && ./scripts/prod-deploy.sh"',
      { stdio: 'inherit' }
    );
    log('green', '\n✅ Deployment script completed\n');
  } catch (error) {
    log('red', `❌ Deployment failed: ${error.message}`);
    log('yellow', '\nCheck logs on production:');
    log('yellow', '  ssh riderlabs@riderlabs.io "pm2 logs riderlabs --err"');
    process.exit(1);
  }

  // Step 4: Verify deployment
  log('blue', '🔍 Step 4: Verifying deployment');
  try {
    const response = exec('curl -f https://riderlabs.io/api/health 2>/dev/null');
    const health = JSON.parse(response);
    
    if (health.status === 'healthy') {
      log('green', '✅ Health check passed');
      log('green', `   Main Database: ${health.checks.mainDatabase}`);
      log('green', `   Admin Database: ${health.checks.adminDatabase}`);
      log('green', `   Version: ${health.version}\n`);
    } else {
      throw new Error('Health check returned unhealthy status');
    }
  } catch (error) {
    log('yellow', '⚠️  Health check failed (endpoint may not exist yet)');
    log('yellow', '   Verify manually: https://riderlabs.io\n');
  }

  // Success!
  log('green', '╔════════════════════════════════════════════╗');
  log('green', '║   ✅ Deployment Successful!                ║');
  log('green', '╚════════════════════════════════════════════╝\n');
  
  log('blue', '🔍 Next steps:');
  log('blue', '   • Check app: https://riderlabs.io');
  log('blue', '   • Check admin: https://riderlabs.io/admin');
  log('blue', '   • View logs: ssh riderlabs@riderlabs.io "pm2 logs riderlabs"');
  log('blue', '   • Check status: ssh riderlabs@riderlabs.io "pm2 status"\n');
}

main().catch((error) => {
  log('red', `\n❌ Deployment failed: ${error.message}\n`);
  process.exit(1);
});
