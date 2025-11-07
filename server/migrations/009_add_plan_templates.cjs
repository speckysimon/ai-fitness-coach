/**
 * Migration: Plan Templates
 * Creates table for storing pre-built training plan templates
 * Based on proven plans from British Cycling, Joe Friel, etc.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Running migration: 009_add_plan_templates');

  // Plan templates table
  db.run(`
    CREATE TABLE IF NOT EXISTS plan_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      author TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      difficulty_level TEXT NOT NULL,
      days_per_week INTEGER NOT NULL,
      hours_per_week_min INTEGER,
      hours_per_week_max INTEGER,
      plan_data TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      featured INTEGER DEFAULT 0,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating plan_templates table:', err);
    } else {
      console.log('✓ Created plan_templates table');
    }
  });

  // Insert default templates
  const defaultTemplates = [
    {
      name: 'British Cycling 4-Week Base Builder',
      description: 'Foundation endurance plan focusing on aerobic development and base fitness. Perfect for building a solid foundation.',
      author: 'British Cycling',
      duration_weeks: 4,
      event_type: 'Endurance',
      difficulty_level: 'Beginner',
      days_per_week: 4,
      hours_per_week_min: 5,
      hours_per_week_max: 8,
      plan_data: JSON.stringify({
        weeks: [
          {
            weekNumber: 1,
            weekSummary: 'Introduction week - Build aerobic base',
            totalVolume: '5-6 hours',
            sessions: [
              {
                day: 'Tuesday',
                type: 'Endurance',
                title: 'Easy Spin',
                description: 'Comfortable pace ride to start the week',
                duration: 60,
                targetZones: 'Zone 2 (60-70% FTP)',
                keyPoints: ['Focus on smooth pedaling', 'Keep heart rate low', 'Build aerobic base']
              },
              {
                day: 'Thursday',
                type: 'Tempo',
                title: 'Tempo Introduction',
                description: 'Introduction to tempo efforts',
                duration: 75,
                targetZones: '2x10min @ 75-85% FTP',
                keyPoints: ['Steady sustainable effort', '5min recovery between intervals']
              },
              {
                day: 'Saturday',
                type: 'Endurance',
                title: 'Weekend Long Ride',
                description: 'Build endurance with longer ride',
                duration: 120,
                targetZones: 'Zone 2 (60-70% FTP)',
                keyPoints: ['Maintain steady pace', 'Practice nutrition', 'Enjoy the ride']
              },
              {
                day: 'Sunday',
                type: 'Recovery',
                title: 'Active Recovery',
                description: 'Easy spin for recovery',
                duration: 45,
                targetZones: 'Zone 1 (50-60% FTP)',
                keyPoints: ['Very easy pace', 'Flush out legs', 'Prepare for next week']
              }
            ]
          },
          {
            weekNumber: 2,
            weekSummary: 'Build volume - Increase endurance',
            totalVolume: '6-7 hours',
            sessions: [
              {
                day: 'Tuesday',
                type: 'Endurance',
                title: 'Steady State',
                description: 'Increase duration slightly',
                duration: 75,
                targetZones: 'Zone 2 (60-70% FTP)',
                keyPoints: ['Consistent effort', 'Focus on form']
              },
              {
                day: 'Thursday',
                type: 'Tempo',
                title: 'Extended Tempo',
                description: 'Longer tempo intervals',
                duration: 90,
                targetZones: '3x10min @ 75-85% FTP',
                keyPoints: ['Sustainable power', 'Controlled breathing']
              },
              {
                day: 'Saturday',
                type: 'Endurance',
                title: 'Long Endurance Ride',
                description: 'Extended weekend ride',
                duration: 150,
                targetZones: 'Zone 2 (60-70% FTP)',
                keyPoints: ['Build aerobic capacity', 'Practice fueling strategy']
              },
              {
                day: 'Sunday',
                type: 'Recovery',
                title: 'Recovery Spin',
                description: 'Easy recovery ride',
                duration: 45,
                targetZones: 'Zone 1 (50-60% FTP)',
                keyPoints: ['Active recovery', 'Prepare for next week']
              }
            ]
          },
          {
            weekNumber: 3,
            weekSummary: 'Peak week - Maximum volume',
            totalVolume: '7-8 hours',
            sessions: [
              {
                day: 'Tuesday',
                type: 'Tempo',
                title: 'Midweek Tempo',
                description: 'Quality tempo session',
                duration: 90,
                targetZones: '3x12min @ 75-85% FTP',
                keyPoints: ['Maintain steady power', 'Focus on efficiency']
              },
              {
                day: 'Thursday',
                type: 'Endurance',
                title: 'Steady Endurance',
                description: 'Consistent aerobic work',
                duration: 90,
                targetZones: 'Zone 2 (60-70% FTP)',
                keyPoints: ['Smooth pedaling', 'Build endurance']
              },
              {
                day: 'Saturday',
                type: 'Endurance',
                title: 'Peak Long Ride',
                description: 'Longest ride of the plan',
                duration: 180,
                targetZones: 'Zone 2 (60-70% FTP)',
                keyPoints: ['Peak volume', 'Test nutrition plan', 'Stay comfortable']
              },
              {
                day: 'Sunday',
                type: 'Recovery',
                title: 'Easy Recovery',
                description: 'Light recovery ride',
                duration: 60,
                targetZones: 'Zone 1 (50-60% FTP)',
                keyPoints: ['Very easy', 'Flush legs']
              }
            ]
          },
          {
            weekNumber: 4,
            weekSummary: 'Recovery week - Consolidate gains',
            totalVolume: '4-5 hours',
            sessions: [
              {
                day: 'Tuesday',
                type: 'Recovery',
                title: 'Easy Spin',
                description: 'Recovery week easy ride',
                duration: 60,
                targetZones: 'Zone 1-2 (50-70% FTP)',
                keyPoints: ['Take it easy', 'Recover from peak week']
              },
              {
                day: 'Thursday',
                type: 'Tempo',
                title: 'Light Tempo',
                description: 'Reduced volume tempo',
                duration: 60,
                targetZones: '2x8min @ 75-85% FTP',
                keyPoints: ['Maintain quality', 'Reduced volume']
              },
              {
                day: 'Saturday',
                type: 'Endurance',
                title: 'Moderate Ride',
                description: 'Reduced weekend ride',
                duration: 90,
                targetZones: 'Zone 2 (60-70% FTP)',
                keyPoints: ['Consolidate fitness', 'Prepare for next block']
              },
              {
                day: 'Sunday',
                type: 'Rest',
                title: 'Complete Rest',
                description: 'Full rest day',
                duration: 0,
                targetZones: 'N/A',
                keyPoints: ['Complete rest', 'Recovery', 'Reflect on progress']
              }
            ]
          }
        ]
      }),
      is_active: 1,
      featured: 1,
      tags: JSON.stringify(['beginner', 'endurance', 'base', 'british-cycling'])
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO plan_templates (
      name, description, author, duration_weeks, event_type, difficulty_level,
      days_per_week, hours_per_week_min, hours_per_week_max, plan_data, is_active, featured, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  defaultTemplates.forEach(template => {
    insertStmt.run(
      template.name,
      template.description,
      template.author,
      template.duration_weeks,
      template.event_type,
      template.difficulty_level,
      template.days_per_week,
      template.hours_per_week_min,
      template.hours_per_week_max,
      template.plan_data,
      template.is_active,
      template.featured,
      template.tags,
      (err) => {
        if (err) {
          console.error(`Error inserting template ${template.name}:`, err);
        } else {
          console.log(`✓ Inserted template: ${template.name}`);
        }
      }
    );
  });

  insertStmt.finalize();
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('✅ Migration 009_add_plan_templates completed');
  }
});
