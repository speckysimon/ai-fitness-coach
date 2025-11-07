/**
 * Seed Default Themes Script
 * Populates the database with default Light and Dark themes
 * Run with: node server/scripts/seedDefaultThemes.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');

// Default Light Theme Configuration
const lightTheme = {
  name: 'RiderLabs Light',
  description: 'Default light theme with optimal contrast and readability',
  is_active: true,
  config: {
    primary: [
      { name: 'primary', label: 'Primary', light: '#2563EB', dark: '#3B82F6' },
      { name: 'primary-hover', label: 'Primary Hover', light: '#1D4ED8', dark: '#2563EB' },
    ],
    secondary: [
      { name: 'secondary', label: 'Secondary', light: '#06B6D4', dark: '#22D3EE' },
      { name: 'accent', label: 'Accent', light: '#9333EA', dark: '#A855F7' },
    ],
    status: [
      { name: 'success', label: 'Success', light: '#10B981', dark: '#34D399' },
      { name: 'warning', label: 'Warning', light: '#F59E0B', dark: '#FBBF24' },
      { name: 'error', label: 'Error', light: '#EF4444', dark: '#F87171' },
      { name: 'info', label: 'Info', light: '#3B82F6', dark: '#60A5FA' },
    ],
    neutral: [
      { name: 'gray-50', label: 'Gray 50', light: '#F9FAFB', dark: '#1F2937' },
      { name: 'gray-100', label: 'Gray 100', light: '#F3F4F6', dark: '#374151' },
      { name: 'gray-200', label: 'Gray 200', light: '#E5E7EB', dark: '#4B5563' },
      { name: 'gray-300', label: 'Gray 300', light: '#D1D5DB', dark: '#6B7280' },
      { name: 'gray-400', label: 'Gray 400', light: '#9CA3AF', dark: '#9CA3AF' },
      { name: 'gray-500', label: 'Gray 500', light: '#6B7280', dark: '#D1D5DB' },
      { name: 'gray-600', label: 'Gray 600', light: '#4B5563', dark: '#E5E7EB' },
      { name: 'gray-700', label: 'Gray 700', light: '#374151', dark: '#F3F4F6' },
      { name: 'gray-800', label: 'Gray 800', light: '#1F2937', dark: '#F9FAFB' },
      { name: 'gray-900', label: 'Gray 900', light: '#111827', dark: '#FFFFFF' },
    ],
    activity: [
      { name: 'recovery', label: 'Recovery', light: '#10B981', dark: '#34D399' },
      { name: 'endurance', label: 'Endurance', light: '#3B82F6', dark: '#60A5FA' },
      { name: 'tempo', label: 'Tempo', light: '#F59E0B', dark: '#FBBF24' },
      { name: 'threshold', label: 'Threshold', light: '#F97316', dark: '#FB923C' },
      { name: 'vo2max', label: 'VO2 Max', light: '#EF4444', dark: '#F87171' },
      { name: 'sprint', label: 'Sprint', light: '#A855F7', dark: '#C084FC' },
    ],
  }
};

// Dark Theme Configuration (optimized for dark mode)
const darkTheme = {
  name: 'RiderLabs Dark',
  description: 'Dark theme with enhanced contrast and reduced eye strain',
  is_active: false,
  config: {
    primary: [
      { name: 'primary', label: 'Primary', light: '#3B82F6', dark: '#60A5FA' },
      { name: 'primary-hover', label: 'Primary Hover', light: '#2563EB', dark: '#3B82F6' },
    ],
    secondary: [
      { name: 'secondary', label: 'Secondary', light: '#22D3EE', dark: '#67E8F9' },
      { name: 'accent', label: 'Accent', light: '#A855F7', dark: '#C084FC' },
    ],
    status: [
      { name: 'success', label: 'Success', light: '#34D399', dark: '#6EE7B7' },
      { name: 'warning', label: 'Warning', light: '#FBBF24', dark: '#FCD34D' },
      { name: 'error', label: 'Error', light: '#F87171', dark: '#FCA5A5' },
      { name: 'info', label: 'Info', light: '#60A5FA', dark: '#93C5FD' },
    ],
    neutral: [
      { name: 'gray-50', label: 'Gray 50', light: '#F9FAFB', dark: '#111827' },
      { name: 'gray-100', label: 'Gray 100', light: '#F3F4F6', dark: '#1F2937' },
      { name: 'gray-200', label: 'Gray 200', light: '#E5E7EB', dark: '#374151' },
      { name: 'gray-300', label: 'Gray 300', light: '#D1D5DB', dark: '#4B5563' },
      { name: 'gray-400', label: 'Gray 400', light: '#9CA3AF', dark: '#9CA3AF' },
      { name: 'gray-500', label: 'Gray 500', light: '#6B7280', dark: '#D1D5DB' },
      { name: 'gray-600', label: 'Gray 600', light: '#4B5563', dark: '#E5E7EB' },
      { name: 'gray-700', label: 'Gray 700', light: '#374151', dark: '#F3F4F6' },
      { name: 'gray-800', label: 'Gray 800', light: '#1F2937', dark: '#F9FAFB' },
      { name: 'gray-900', label: 'Gray 900', light: '#111827', dark: '#FFFFFF' },
    ],
    activity: [
      { name: 'recovery', label: 'Recovery', light: '#34D399', dark: '#6EE7B7' },
      { name: 'endurance', label: 'Endurance', light: '#60A5FA', dark: '#93C5FD' },
      { name: 'tempo', label: 'Tempo', light: '#FBBF24', dark: '#FCD34D' },
      { name: 'threshold', label: 'Threshold', light: '#FB923C', dark: '#FDBA74' },
      { name: 'vo2max', label: 'VO2 Max', light: '#F87171', dark: '#FCA5A5' },
      { name: 'sprint', label: 'Sprint', light: '#C084FC', dark: '#D8B4FE' },
    ],
  }
};

// High Contrast Theme (for accessibility)
const highContrastTheme = {
  name: 'High Contrast',
  description: 'High contrast theme for improved accessibility and readability',
  is_active: false,
  config: {
    primary: [
      { name: 'primary', label: 'Primary', light: '#1E40AF', dark: '#60A5FA' },
      { name: 'primary-hover', label: 'Primary Hover', light: '#1E3A8A', dark: '#3B82F6' },
    ],
    secondary: [
      { name: 'secondary', label: 'Secondary', light: '#0891B2', dark: '#22D3EE' },
      { name: 'accent', label: 'Accent', light: '#7C3AED', dark: '#A855F7' },
    ],
    status: [
      { name: 'success', label: 'Success', light: '#059669', dark: '#34D399' },
      { name: 'warning', label: 'Warning', light: '#D97706', dark: '#FBBF24' },
      { name: 'error', label: 'Error', light: '#DC2626', dark: '#F87171' },
      { name: 'info', label: 'Info', light: '#2563EB', dark: '#60A5FA' },
    ],
    neutral: [
      { name: 'gray-50', label: 'Gray 50', light: '#FFFFFF', dark: '#000000' },
      { name: 'gray-100', label: 'Gray 100', light: '#F3F4F6', dark: '#111827' },
      { name: 'gray-200', label: 'Gray 200', light: '#E5E7EB', dark: '#1F2937' },
      { name: 'gray-300', label: 'Gray 300', light: '#D1D5DB', dark: '#374151' },
      { name: 'gray-400', label: 'Gray 400', light: '#9CA3AF', dark: '#9CA3AF' },
      { name: 'gray-500', label: 'Gray 500', light: '#6B7280', dark: '#D1D5DB' },
      { name: 'gray-600', label: 'Gray 600', light: '#4B5563', dark: '#E5E7EB' },
      { name: 'gray-700', label: 'Gray 700', light: '#374151', dark: '#F3F4F6' },
      { name: 'gray-800', label: 'Gray 800', light: '#1F2937', dark: '#F9FAFB' },
      { name: 'gray-900', label: 'Gray 900', light: '#000000', dark: '#FFFFFF' },
    ],
    activity: [
      { name: 'recovery', label: 'Recovery', light: '#059669', dark: '#34D399' },
      { name: 'endurance', label: 'Endurance', light: '#2563EB', dark: '#60A5FA' },
      { name: 'tempo', label: 'Tempo', light: '#D97706', dark: '#FBBF24' },
      { name: 'threshold', label: 'Threshold', light: '#EA580C', dark: '#FB923C' },
      { name: 'vo2max', label: 'VO2 Max', light: '#DC2626', dark: '#F87171' },
      { name: 'sprint', label: 'Sprint', light: '#7C3AED', dark: '#A855F7' },
    ],
  }
};

function seedThemes() {
  const db = new Database(dbPath);
  
  try {
    console.log('🌱 Seeding default themes...\n');
    
    // Check if themes already exist
    const existingThemes = db.prepare('SELECT COUNT(*) as count FROM theme_configs').get();
    
    if (existingThemes.count > 0) {
      console.log(`⚠️  Found ${existingThemes.count} existing theme(s) in database.`);
      console.log('Do you want to:');
      console.log('1. Keep existing themes and add new ones');
      console.log('2. Delete all and recreate (destructive)');
      console.log('\nTo proceed, run with --force flag to delete existing themes.');
      console.log('Example: node server/scripts/seedDefaultThemes.cjs --force\n');
      
      // Check for --force flag
      const forceFlag = process.argv.includes('--force');
      if (!forceFlag) {
        console.log('✅ Exiting without changes. Use --force to override.\n');
        db.close();
        return;
      }
      
      console.log('🗑️  Deleting existing themes...');
      db.prepare('DELETE FROM theme_configs').run();
      console.log('✅ Existing themes deleted.\n');
    }
    
    // Insert themes
    const insertStmt = db.prepare(`
      INSERT INTO theme_configs (name, description, config, is_active)
      VALUES (?, ?, ?, ?)
    `);
    
    const themes = [lightTheme, darkTheme, highContrastTheme];
    
    themes.forEach((theme, index) => {
      console.log(`📦 Creating theme: ${theme.name}`);
      
      const result = insertStmt.run(
        theme.name,
        theme.description,
        JSON.stringify(theme.config),
        theme.is_active ? 1 : 0
      );
      
      console.log(`   ✅ Created with ID: ${result.lastInsertRowid}`);
      console.log(`   📝 Description: ${theme.description}`);
      console.log(`   ${theme.is_active ? '🟢 Active' : '⚪ Inactive'}`);
      console.log('');
    });
    
    // Show summary
    const allThemes = db.prepare('SELECT id, name, is_active FROM theme_configs ORDER BY is_active DESC, name ASC').all();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    allThemes.forEach(theme => {
      const status = theme.is_active ? '🟢 ACTIVE' : '⚪ Inactive';
      console.log(`${status} - ${theme.name} (ID: ${theme.id})`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully seeded ${themes.length} themes!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎨 Next steps:');
    console.log('1. Restart your app to load the new themes');
    console.log('2. Visit Admin Panel → Theme Configuration');
    console.log('3. Activate different themes to see changes\n');
    
  } catch (error) {
    console.error('❌ Error seeding themes:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the seeding
seedThemes();
