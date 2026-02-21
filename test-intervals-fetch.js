/**
 * Test script to call Intervals.icu API endpoint and see actual error
 */

import fetch from 'node-fetch';

const sessionToken = process.argv[2];

if (!sessionToken) {
  console.error('Usage: node test-intervals-fetch.js <session_token>');
  console.error('Get session_token from localStorage in browser console');
  process.exit(1);
}

const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
const oldest = oneYearAgo.toISOString().split('T')[0];
const newest = new Date().toISOString().split('T')[0];

console.log(`\n🧪 Testing Intervals.icu fetch: ${oldest} to ${newest}\n`);

fetch(`http://localhost:5001/api/intervals/activities?oldest=${oldest}&newest=${newest}`, {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
})
  .then(async res => {
    console.log(`📊 Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    
    if (res.ok) {
      console.log(`✅ Success! Fetched ${data.length} activities`);
      if (data.length > 0) {
        console.log('\n📋 First activity sample:');
        console.log(JSON.stringify(data[0], null, 2));
      }
    } else {
      console.log(`❌ Error response:`);
      console.log(JSON.stringify(data, null, 2));
    }
  })
  .catch(err => {
    console.error('❌ Request failed:', err.message);
  });
