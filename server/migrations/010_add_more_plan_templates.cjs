const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Running migration: 010_add_more_plan_templates');
  
  // Add 6-week and 12-week templates here
  // (Templates will be added via admin UI for now)
  
  console.log('✅ Migration 010_add_more_plan_templates completed');
});

db.close();
