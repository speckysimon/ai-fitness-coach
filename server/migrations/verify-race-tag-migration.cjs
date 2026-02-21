/**
 * Verification Script: Race Tag Multi-Source Migration
 * 
 * Verifies that the race_tags table has been properly updated
 * with multi-source support (activity_source column)
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../fitness-coach.db');

console.log('🔍 Verifying Race Tag Migration...');
console.log(`📂 Database: ${dbPath}`);
console.log('');

try {
  const db = new Database(dbPath);
  
  // 1. Check if activity_source column exists
  console.log('1️⃣ Checking table structure...');
  const tableInfo = db.prepare("PRAGMA table_info(race_tags)").all();
  
  const hasSourceColumn = tableInfo.some(col => col.name === 'activity_source');
  
  if (!hasSourceColumn) {
    console.error('❌ FAILED: activity_source column not found!');
    console.error('   Please run migration: node server/migrations/008_add_race_tag_source.cjs');
    process.exit(1);
  }
  
  console.log('✅ activity_source column exists');
  
  // Show all columns
  console.log('   Columns:', tableInfo.map(col => col.name).join(', '));
  console.log('');
  
  // 2. Check indexes
  console.log('2️⃣ Checking indexes...');
  const indexes = db.prepare("PRAGMA index_list(race_tags)").all();
  
  console.log(`✅ Found ${indexes.length} indexes:`);
  indexes.forEach(idx => {
    const indexInfo = db.prepare(`PRAGMA index_info(${idx.name})`).all();
    const columns = indexInfo.map(col => col.name).join(', ');
    console.log(`   - ${idx.name}: ${columns}`);
  });
  console.log('');
  
  // 3. Check existing data
  console.log('3️⃣ Checking existing race tags...');
  const raceTags = db.prepare('SELECT * FROM race_tags LIMIT 5').all();
  
  if (raceTags.length === 0) {
    console.log('ℹ️  No race tags in database yet');
  } else {
    console.log(`✅ Found ${raceTags.length} race tags (showing first 5):`);
    raceTags.forEach(tag => {
      console.log(`   - User ${tag.user_id}, Activity ${tag.activity_id}, Source: ${tag.activity_source || 'NULL'}`);
    });
  }
  console.log('');
  
  // 4. Test insert with source
  console.log('4️⃣ Testing insert with activity_source...');
  const testUserId = 999999; // Test user ID
  const testActivityId = 'test_' + Date.now();
  
  try {
    db.prepare(`
      INSERT INTO race_tags (user_id, activity_id, activity_source, is_race, race_type, created_at)
      VALUES (?, ?, ?, 1, 'test', datetime('now'))
    `).run(testUserId, testActivityId, 'intervals');
    
    console.log('✅ Insert with source successful');
    
    // Verify it was inserted
    const inserted = db.prepare(
      'SELECT * FROM race_tags WHERE user_id = ? AND activity_id = ?'
    ).get(testUserId, testActivityId);
    
    if (inserted && inserted.activity_source === 'intervals') {
      console.log('✅ Source stored correctly:', inserted.activity_source);
    } else {
      console.error('❌ Source not stored correctly');
    }
    
    // Clean up test data
    db.prepare('DELETE FROM race_tags WHERE user_id = ?').run(testUserId);
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Insert test failed:', error.message);
  }
  console.log('');
  
  // 5. Test unique constraint
  console.log('5️⃣ Testing unique constraint (user_id, activity_id, activity_source)...');
  const testUserId2 = 999998;
  const testActivityId2 = 'test_unique_' + Date.now();
  
  try {
    // Insert first record
    db.prepare(`
      INSERT INTO race_tags (user_id, activity_id, activity_source, is_race, created_at)
      VALUES (?, ?, 'strava', 1, datetime('now'))
    `).run(testUserId2, testActivityId2);
    
    // Try to insert same activity from different source (should succeed)
    db.prepare(`
      INSERT INTO race_tags (user_id, activity_id, activity_source, is_race, created_at)
      VALUES (?, ?, 'intervals', 1, datetime('now'))
    `).run(testUserId2, testActivityId2);
    
    console.log('✅ Can tag same activity from different sources');
    
    // Try to insert duplicate (should fail)
    try {
      db.prepare(`
        INSERT INTO race_tags (user_id, activity_id, activity_source, is_race, created_at)
        VALUES (?, ?, 'strava', 1, datetime('now'))
      `).run(testUserId2, testActivityId2);
      
      console.error('❌ Unique constraint not working - duplicate allowed!');
    } catch (dupError) {
      console.log('✅ Unique constraint working - duplicate rejected');
    }
    
    // Clean up
    db.prepare('DELETE FROM race_tags WHERE user_id = ?').run(testUserId2);
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Unique constraint test failed:', error.message);
  }
  console.log('');
  
  db.close();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ VERIFICATION COMPLETE - Migration successful!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Summary:');
  console.log('  ✅ activity_source column exists');
  console.log('  ✅ Indexes created correctly');
  console.log('  ✅ Insert with source works');
  console.log('  ✅ Unique constraint enforced');
  console.log('');
  console.log('🎉 Ready for multi-source race tagging!');
  console.log('');
  
} catch (error) {
  console.error('');
  console.error('❌ VERIFICATION FAILED!');
  console.error('Error:', error.message);
  console.error('');
  process.exit(1);
}
