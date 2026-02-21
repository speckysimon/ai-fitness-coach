'use strict';
const db = require('better-sqlite3')('./server/fitness-coach.db');

const userId = 1;

const row = db.prepare('SELECT ftp_w, fthr_bpm, ftp_source, updated_at FROM athlete_thresholds WHERE user_id = ?').get(userId);
console.log('DB row:', JSON.stringify(row));

const withZones = db.prepare(`
  SELECT COUNT(*) as n FROM activity_normalised n
  JOIN activity_streams st ON st.activity_id = n.activity_id AND st.power IS NOT NULL
  WHERE n.user_id = ? AND n.time_in_zones_power IS NOT NULL
`).get(userId).n;
console.log('Normalised with zones (stream+power):', withZones);

const withFade = db.prepare(`
  SELECT COUNT(*) as n FROM activity_durability WHERE user_id = ? AND fade_power_pct IS NOT NULL
`).get(userId).n;
console.log('Durability with fade_power_pct:', withFade);

const sample = db.prepare(`
  SELECT n.activity_id, n.time_in_zones_power, n.vi, d.fade_power_pct, d.notes
  FROM activity_normalised n
  JOIN activity_streams st ON st.activity_id = n.activity_id AND st.power IS NOT NULL
  LEFT JOIN activity_durability d ON d.activity_id = n.activity_id AND d.user_id = n.user_id
  WHERE n.user_id = ? AND n.time_in_zones_power IS NOT NULL
  LIMIT 2
`).all(userId);
sample.forEach(r => console.log('Sample:', JSON.stringify(r)));
