#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * Validates that all required environment variables are set
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredVars = [
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
  'STRAVA_REDIRECT_URI',
  'OPENAI_API_KEY',
];

const optionalVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
];

console.log('🔍 Checking environment configuration...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('\n📝 Please create a .env file by copying .env.example:');
  console.log('   cp .env.example .env\n');
  process.exit(1);
}

// Load .env file
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('✅ Required Configuration:');
requiredVars.forEach(varName => {
  const value = envVars[varName];
  if (!value || value.startsWith('your_')) {
    console.log(`   ❌ ${varName}: Not configured`);
    hasErrors = true;
  } else {
    console.log(`   ✓ ${varName}: Configured`);
  }
});

// Check optional variables
console.log('\n⚠️  Optional Configuration:');
optionalVars.forEach(varName => {
  const value = envVars[varName];
  if (!value || value.startsWith('your_')) {
    console.log(`   ⚠️  ${varName}: Not configured (optional)`);
    hasWarnings = true;
  } else {
    console.log(`   ✓ ${varName}: Configured`);
  }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('\n❌ Configuration incomplete!');
  console.log('\n📚 Setup guides:');
  console.log('   • Strava: https://www.strava.com/settings/api');
  console.log('   • OpenAI: https://platform.openai.com/api-keys');
  console.log('   • Google: https://console.cloud.google.com/');
  console.log('\n📖 See SETUP_GUIDE.md for detailed instructions.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n✅ Minimum configuration complete!');
  console.log('\n💡 Note: Google Calendar integration is optional but recommended.');
  console.log('   You can add it later from the Settings page.\n');
  process.exit(0);
} else {
  console.log('\n✅ All configuration complete! Ready to start.\n');
  process.exit(0);
}
