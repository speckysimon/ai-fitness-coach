/**
 * Migration: Add coach_personas table
 * Stores AI coach personas with avatar support
 */

module.exports = {
  up: (db) => {
    console.log('Running migration: 007_add_coach_personas');
    
    // Create coach_personas table
    db.exec(`
      CREATE TABLE IF NOT EXISTS coach_personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        style TEXT NOT NULL,
        description TEXT,
        tone TEXT NOT NULL,
        catchphrase TEXT,
        color TEXT,
        personality TEXT,
        avatar_url TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created coach_personas table');

    // Create index on is_active for faster queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_coach_personas_active 
      ON coach_personas(is_active, sort_order)
    `);
    console.log('✅ Created index on coach_personas');

    // Seed with existing 5 personas
    const personas = [
          {
            id: 'motivator',
            name: 'Coach Alex',
            style: 'Motivational',
            description: 'High-energy motivator who pushes you to exceed your limits',
            tone: 'enthusiastic',
            catchphrase: "Let's crush this!",
            color: 'from-orange-400 to-red-500',
            personality: 'Energetic, encouraging, and always positive. Uses lots of exclamation marks and motivational language.',
            avatar_url: null,
            is_active: 1,
            sort_order: 1
          },
          {
            id: 'analytical',
            name: 'Coach Jordan',
            style: 'Analytical',
            description: 'Data-driven coach focused on metrics and progressive overload',
            tone: 'analytical',
            catchphrase: 'The numbers don\'t lie',
            color: 'from-blue-400 to-indigo-600',
            personality: 'Precise, methodical, and detail-oriented. Focuses on data, percentages, and scientific training principles.',
            avatar_url: null,
            is_active: 1,
            sort_order: 2
          },
          {
            id: 'supportive',
            name: 'Coach Sam',
            style: 'Supportive',
            description: 'Empathetic coach who listens and adapts to your needs',
            tone: 'supportive',
            catchphrase: 'We\'re in this together',
            color: 'from-green-400 to-emerald-600',
            personality: 'Understanding, patient, and empathetic. Emphasizes recovery, listening to your body, and sustainable progress.',
            avatar_url: null,
            is_active: 1,
            sort_order: 3
          },
          {
            id: 'strategic',
            name: 'Coach Taylor',
            style: 'Strategic',
            description: 'Tactical coach who plans every detail for race success',
            tone: 'strategic',
            catchphrase: 'Every session has a purpose',
            color: 'from-purple-400 to-pink-500',
            personality: 'Focused, goal-oriented, and strategic. Emphasizes race preparation, pacing strategies, and long-term planning.',
            avatar_url: null,
            is_active: 1,
            sort_order: 4
          },
          {
            id: 'experienced',
            name: 'Coach Morgan',
            style: 'Experienced',
            description: 'Veteran coach with decades of racing and coaching wisdom',
            tone: 'experienced',
            catchphrase: 'I\'ve seen it all',
            color: 'from-yellow-400 to-amber-600',
            personality: 'Wise, experienced, and pragmatic. Shares insights from years of coaching, focuses on what works in real-world racing.',
            avatar_url: null,
            is_active: 1,
            sort_order: 5
          }
    ];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO coach_personas 
      (id, name, style, description, tone, catchphrase, color, personality, avatar_url, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    personas.forEach(persona => {
      stmt.run(
        persona.id,
        persona.name,
        persona.style,
        persona.description,
        persona.tone,
        persona.catchphrase,
        persona.color,
        persona.personality,
        persona.avatar_url,
        persona.is_active,
        persona.sort_order
      );
    });

    console.log('✅ Seeded 5 default coach personas');
    console.log('Migration 007_add_coach_personas completed successfully');
  }
};
