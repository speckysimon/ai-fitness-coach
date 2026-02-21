/**
 * Seed initial ideas from TODO.md into the database
 * Run with: node server/seedIdeas.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');

// Use admin database for ideas (fitness-coach-admin.db)
const dbPath = path.join(__dirname, 'fitness-coach-admin.db');
const db = new Database(dbPath);

console.log(`📂 Using admin database: ${dbPath}`);

const initialIdeas = [
  // High Priority - Current Sprint
  {
    title: 'Complete Onboarding Modal Testing',
    description: 'Test multi-step onboarding flow end-to-end including Strava OAuth, coach selection, and plan generation',
    category: 'bug_fix',
    priority: 'high',
    scale: 'small',
    status: 'planned',
    estimated_hours: 4,
    tags: JSON.stringify(['onboarding', 'testing', 'ux']),
    source: 'roadmap'
  },
  {
    title: 'Training Plan Generation - Production Testing',
    description: 'Verify training plan generation works on production with different plan parameters and event types',
    category: 'bug_fix',
    priority: 'high',
    scale: 'small',
    status: 'planned',
    estimated_hours: 3,
    tags: JSON.stringify(['production', 'testing', 'ai']),
    source: 'roadmap'
  },
  {
    title: 'AI Coach - Post-Training Chat Experience',
    description: 'Make "Talk to AI Coach" more general purpose for post-training debriefs, Q&A, and discussions beyond just plan adjustments',
    category: 'enhancement',
    priority: 'high',
    scale: 'large',
    status: 'backlog',
    estimated_hours: 40,
    tags: JSON.stringify(['ai', 'coach', 'chat', 'ux']),
    source: 'user_feedback'
  },
  {
    title: 'Activity Analysis Button',
    description: 'Add "Analyze Activity" button to individual activity modals for one-time analysis against plan/history/goals',
    category: 'feature',
    priority: 'high',
    scale: 'medium',
    status: 'backlog',
    estimated_hours: 16,
    tags: JSON.stringify(['ai', 'activities', 'analysis']),
    source: 'user_feedback'
  },
  {
    title: 'Long-term Goal Field',
    description: 'Add long-term goal field to user settings to help AI understand athlete\'s ultimate objective',
    category: 'feature',
    priority: 'medium',
    scale: 'small',
    status: 'backlog',
    estimated_hours: 6,
    tags: JSON.stringify(['settings', 'goals', 'ai']),
    source: 'roadmap'
  },

  // Medium Priority - Post-Launch
  {
    title: 'Forgot Password Feature',
    description: 'Implement password reset flow with secure tokens and email integration',
    category: 'feature',
    priority: 'medium',
    scale: 'medium',
    status: 'backlog',
    estimated_hours: 20,
    tags: JSON.stringify(['auth', 'security', 'email']),
    source: 'roadmap'
  },
  {
    title: 'Email Setup for riderlabs.io',
    description: 'Configure transactional email service (SendGrid/Mailgun) and professional email',
    category: 'integration',
    priority: 'medium',
    scale: 'small',
    status: 'backlog',
    estimated_hours: 8,
    tags: JSON.stringify(['email', 'infrastructure']),
    source: 'roadmap'
  },
  {
    title: 'Rate Limiting for API Endpoints',
    description: 'Add rate limiting to protect API endpoints from abuse',
    category: 'enhancement',
    priority: 'medium',
    scale: 'small',
    status: 'backlog',
    estimated_hours: 6,
    tags: JSON.stringify(['security', 'api']),
    source: 'roadmap'
  },
  {
    title: 'Help/FAQ Page',
    description: 'Create comprehensive help and FAQ page for users',
    category: 'feature',
    priority: 'low',
    scale: 'medium',
    status: 'backlog',
    estimated_hours: 16,
    tags: JSON.stringify(['documentation', 'ux']),
    source: 'roadmap'
  },

  // Low Priority - Future Enhancements
  {
    title: 'Progressive Web App (PWA)',
    description: 'Add PWA support for offline functionality and app-like experience',
    category: 'enhancement',
    priority: 'low',
    scale: 'large',
    status: 'backlog',
    estimated_hours: 60,
    tags: JSON.stringify(['pwa', 'mobile', 'offline']),
    source: 'roadmap'
  },
  {
    title: 'Push Notifications for Workouts',
    description: 'Implement push notifications to remind athletes of upcoming workouts',
    category: 'feature',
    priority: 'low',
    scale: 'medium',
    status: 'backlog',
    estimated_hours: 24,
    tags: JSON.stringify(['notifications', 'mobile']),
    source: 'roadmap'
  },
  {
    title: 'Garmin Connect Integration',
    description: 'Integrate with Garmin Connect for activity sync and workout export',
    category: 'integration',
    priority: 'low',
    scale: 'epic',
    status: 'backlog',
    estimated_hours: 100,
    tags: JSON.stringify(['integration', 'garmin', 'activities']),
    source: 'roadmap'
  },
  {
    title: 'Zwift Workout Export',
    description: 'Enable direct export of training sessions to Zwift format',
    category: 'integration',
    priority: 'low',
    scale: 'large',
    status: 'backlog',
    estimated_hours: 40,
    tags: JSON.stringify(['integration', 'zwift', 'export']),
    source: 'roadmap'
  },
  {
    title: 'Advanced Analytics Dashboard',
    description: 'Create comprehensive analytics dashboard with predictive modeling and insights',
    category: 'feature',
    priority: 'low',
    scale: 'epic',
    status: 'backlog',
    estimated_hours: 120,
    tags: JSON.stringify(['analytics', 'ai', 'dashboard']),
    source: 'roadmap'
  },
  {
    title: 'Mobile App (React Native)',
    description: 'Develop native mobile app for iOS and Android',
    category: 'feature',
    priority: 'low',
    scale: 'epic',
    status: 'backlog',
    estimated_hours: 400,
    tags: JSON.stringify(['mobile', 'ios', 'android']),
    source: 'roadmap'
  },

  // Bug Fixes
  {
    title: 'Manual Activity Edit Not Saving',
    description: 'Fix bug where manual activity edits are not being saved to database',
    category: 'bug_fix',
    priority: 'critical',
    scale: 'small',
    status: 'backlog',
    estimated_hours: 4,
    tags: JSON.stringify(['bug', 'activities', 'database']),
    source: 'user_feedback'
  },
  {
    title: 'WCAG AA Contrast Compliance',
    description: 'Ensure all dark mode colors meet WCAG AA contrast requirements',
    category: 'bug_fix',
    priority: 'medium',
    scale: 'small',
    status: 'backlog',
    estimated_hours: 8,
    tags: JSON.stringify(['accessibility', 'dark-mode', 'ui']),
    source: 'roadmap'
  }
];

// Insert ideas into database
console.log('🌱 Seeding ideas into database...\n');

const stmt = db.prepare(`
  INSERT INTO ideas (
    title, description, category, priority, scale, status,
    estimated_hours, tags, source, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let successCount = 0;
let errorCount = 0;

initialIdeas.forEach((idea, index) => {
  try {
    stmt.run(
      idea.title,
      idea.description,
      idea.category,
      idea.priority,
      idea.scale,
      idea.status,
      idea.estimated_hours,
      idea.tags,
      idea.source,
      'system'
    );
    successCount++;
    console.log(`✅ ${index + 1}. ${idea.title}`);
  } catch (error) {
    errorCount++;
    console.error(`❌ ${index + 1}. ${idea.title} - Error: ${error.message}`);
  }
});

console.log(`\n📊 Seeding complete!`);
console.log(`   ✅ Success: ${successCount}`);
console.log(`   ❌ Errors: ${errorCount}`);
console.log(`   📝 Total: ${initialIdeas.length}\n`);

// Close database connection
db.close();
console.log('✅ Database connection closed');
