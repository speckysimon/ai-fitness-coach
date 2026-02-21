import Database from 'better-sqlite3';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'fitness-coach.db');
const db = new Database(dbPath);

console.log('📂 Database path:', dbPath);

// Get token from database
const token = db.prepare('SELECT * FROM intervals_tokens WHERE user_id = 1').get();

if (!token) {
  console.error('❌ No token found in database');
  process.exit(1);
}

console.log('✅ Token found:', {
  user_id: token.user_id,
  athlete_id: token.athlete_id,
  athlete_name: token.athlete_name,
  token_length: token.access_token?.length
});

// Test API call
const testAPI = async () => {
  try {
    const oldest = '2025-07-24';
    const newest = '2026-01-24';
    
    console.log('\n📡 Testing Intervals.icu API call...');
    console.log(`URL: https://intervals.icu/api/v1/athlete/0/activities?oldest=${oldest}&newest=${newest}`);
    
    const response = await axios.get(
      `https://intervals.icu/api/v1/athlete/0/activities`,
      {
        headers: { 
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json'
        },
        params: { oldest, newest }
      }
    );

    console.log('✅ API call successful!');
    console.log(`📊 Fetched ${response.data.length} activities`);
    
    if (response.data.length > 0) {
      console.log('\n📝 Sample activity:');
      const sample = response.data[0];
      console.log({
        id: sample.id,
        name: sample.name,
        type: sample.type,
        start_date: sample.start_date_local,
        distance: sample.distance,
        moving_time: sample.moving_time
      });
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

testAPI();
