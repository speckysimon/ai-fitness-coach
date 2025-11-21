/**
 * Test Admin Database Migration
 * Tests all migrated services to ensure better-sqlite3 integration works
 */

const aiConfigService = require('./server/services/aiConfigService.cjs');
const globalSettingsService = require('./server/services/globalSettingsService.cjs');
const planTemplateService = require('./server/services/planTemplateService.cjs');
const tokenTrackingService = require('./server/services/tokenTrackingService.cjs');
const ideasService = require('./server/services/ideasService.cjs');
const adminService = require('./server/services/adminService.cjs');

async function testMigration() {
  console.log('🧪 Testing Admin Database Migration...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: AI Config Service
  try {
    console.log('1️⃣  Testing aiConfigService.listConfigs()...');
    const configs = await aiConfigService.listConfigs();
    console.log(`   ✅ Found ${configs.length} AI configs`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 2: Global Settings Service
  try {
    console.log('2️⃣  Testing globalSettingsService.getAllSettings()...');
    const settings = await globalSettingsService.getAllSettings();
    console.log(`   ✅ Found ${settings.length} global settings`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 3: Plan Template Service
  try {
    console.log('3️⃣  Testing planTemplateService.listTemplates()...');
    const templates = await planTemplateService.listTemplates();
    console.log(`   ✅ Found ${templates.length} plan templates`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 4: Token Tracking Service
  try {
    console.log('4️⃣  Testing tokenTrackingService.getTokenUsageStats()...');
    const stats = await tokenTrackingService.getTokenUsageStats();
    console.log(`   ✅ Total tokens: ${stats.total || 0}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 5: Ideas Service
  try {
    console.log('5️⃣  Testing ideasService.getAllIdeas()...');
    const ideas = ideasService.getAllIdeas();
    console.log(`   ✅ Found ${ideas.length} ideas`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 6: Ideas Statistics
  try {
    console.log('6️⃣  Testing ideasService.getStatistics()...');
    const stats = ideasService.getStatistics();
    console.log(`   ✅ Total ideas: ${stats.total}, Backlog: ${stats.backlog}, Completed: ${stats.completed}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 7: Admin Service
  try {
    console.log('7️⃣  Testing adminService.listAdmins()...');
    const admins = await adminService.listAdmins();
    console.log(`   ✅ Found ${admins.length} admin users`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 8: API Keys Service
  try {
    console.log('8️⃣  Testing aiConfigService.listApiKeys()...');
    const keys = await aiConfigService.listApiKeys();
    console.log(`   ✅ Found ${keys.length} API keys`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 9: Available Models
  try {
    console.log('9️⃣  Testing tokenTrackingService.getAvailableModels()...');
    const models = await tokenTrackingService.getAvailableModels();
    console.log(`   ✅ Found ${models.length} available models`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 10: Monthly Cost
  try {
    console.log('🔟 Testing tokenTrackingService.getMonthlyCost()...');
    const cost = await tokenTrackingService.getMonthlyCost();
    console.log(`   ✅ Monthly cost: $${cost.totalMonthlyCost}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('✅ All tests passed! Migration successful! 🎉');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review errors above.');
    process.exit(1);
  }
}

testMigration().catch(error => {
  console.error('💥 Test suite error:', error);
  process.exit(1);
});
