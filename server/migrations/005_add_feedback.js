import db from '../db.js';

async function up() {
  console.log('Running migration: 005_add_feedback');
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rating INTEGER,
      category TEXT NOT NULL DEFAULT 'general',
      message TEXT NOT NULL,
      email TEXT,
      user_email TEXT,
      timestamp TEXT NOT NULL,
      user_agent TEXT,
      url TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      admin_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for common queries
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_feedback_status 
    ON feedback(status)
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_feedback_category 
    ON feedback(category)
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_feedback_user_email 
    ON feedback(user_email)
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_feedback_timestamp 
    ON feedback(timestamp DESC)
  `);

  console.log('✅ Feedback table created successfully');
}

async function down() {
  console.log('Rolling back migration: 005_add_feedback');
  
  await db.run('DROP TABLE IF EXISTS feedback');
  
  console.log('✅ Feedback table dropped successfully');
}

export { up, down };
