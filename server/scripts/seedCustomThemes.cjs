/**
 * Seed Custom Color Palette Themes
 * Adds three beautiful themed color palettes to the database
 * Run with: node server/scripts/seedCustomThemes.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../fitness-coach-admin.db');

// Theme 1: Mountain Meadow (Teal/Green palette)
const mountainMeadowTheme = {
  name: 'Mountain Meadow',
  description: 'Fresh teal and green palette inspired by mountain landscapes',
  is_active: false,
  config: {
    primary: [
      { name: 'primary', label: 'Primary', light: '#1abc9c', dark: '#16a286' },
      { name: 'primary-hover', label: 'Primary Hover', light: '#16a286', dark: '#1abc9c' },
    ],
    secondary: [
      { name: 'secondary', label: 'Secondary', light: '#2ecc70', dark: '#27ae60' },
      { name: 'accent', label: 'Accent', light: '#3398db', dark: '#5dade2' },
    ],
    status: [
      { name: 'success', label: 'Success', light: '#2ecc70', dark: '#58d68d' },
      { name: 'warning', label: 'Warning', light: '#f39c12', dark: '#f8c471' },
      { name: 'error', label: 'Error', light: '#e74c3c', dark: '#ec7063' },
      { name: 'info', label: 'Info', light: '#3398db', dark: '#5dade2' },
    ],
    neutral: [
      { name: 'gray-50', label: 'Gray 50', light: '#f0f9f7', dark: '#1a2f2a' },
      { name: 'gray-100', label: 'Gray 100', light: '#e1f3ef', dark: '#234239' },
      { name: 'gray-200', label: 'Gray 200', light: '#c3e7df', dark: '#2d5548' },
      { name: 'gray-300', label: 'Gray 300', light: '#a5dbcf', dark: '#376857' },
      { name: 'gray-400', label: 'Gray 400', light: '#87cfbf', dark: '#87cfbf' },
      { name: 'gray-500', label: 'Gray 500', light: '#69c3af', dark: '#a5dbcf' },
      { name: 'gray-600', label: 'Gray 600', light: '#4bb79f', dark: '#c3e7df' },
      { name: 'gray-700', label: 'Gray 700', light: '#3d9a86', dark: '#e1f3ef' },
      { name: 'gray-800', label: 'Gray 800', light: '#2f7d6d', dark: '#f0f9f7' },
      { name: 'gray-900', label: 'Gray 900', light: '#216054', dark: '#ffffff' },
    ],
    activity: [
      { name: 'recovery', label: 'Recovery', light: '#2ecc70', dark: '#58d68d' },
      { name: 'endurance', label: 'Endurance', light: '#16a286', dark: '#1abc9c' },
      { name: 'tempo', label: 'Tempo', light: '#28af60', dark: '#2ecc70' },
      { name: 'threshold', label: 'Threshold', light: '#f39c12', dark: '#f8c471' },
      { name: 'vo2max', label: 'VO2 Max', light: '#e67e22', dark: '#f0b27a' },
      { name: 'sprint', label: 'Sprint', light: '#3398db', dark: '#5dade2' },
    ],
  }
};

// Theme 2: Oceanic Voyage (Blue palette)
const oceanicVoyageTheme = {
  name: 'Oceanic Voyage',
  description: 'Calming ocean blues from deep sea to sandy shores',
  is_active: false,
  config: {
    primary: [
      { name: 'primary', label: 'Primary', light: '#4c8fa9', dark: '#61b9d1' },
      { name: 'primary-hover', label: 'Primary Hover', light: '#2a4d6a', dark: '#4c8fa9' },
    ],
    secondary: [
      { name: 'secondary', label: 'Secondary', light: '#a4d2d5', dark: '#61b9d1' },
      { name: 'accent', label: 'Accent', light: '#f7f7f7', dark: '#4c8fa9' },
    ],
    status: [
      { name: 'success', label: 'Success', light: '#61b9d1', dark: '#a4d2d5' },
      { name: 'warning', label: 'Warning', light: '#f9c74f', dark: '#f9c74f' },
      { name: 'error', label: 'Error', light: '#e63946', dark: '#f07178' },
      { name: 'info', label: 'Info', light: '#4c8fa9', dark: '#61b9d1' },
    ],
    neutral: [
      { name: 'gray-50', label: 'Gray 50', light: '#f7f9fa', dark: '#1a2530' },
      { name: 'gray-100', label: 'Gray 100', light: '#eff3f5', dark: '#243342' },
      { name: 'gray-200', label: 'Gray 200', light: '#dfe7eb', dark: '#2e4154' },
      { name: 'gray-300', label: 'Gray 300', light: '#cfdbe1', dark: '#384f66' },
      { name: 'gray-400', label: 'Gray 400', light: '#9fb3bd', dark: '#9fb3bd' },
      { name: 'gray-500', label: 'Gray 500', light: '#6f8b99', dark: '#cfdbe1' },
      { name: 'gray-600', label: 'Gray 600', light: '#4c6875', dark: '#dfe7eb' },
      { name: 'gray-700', label: 'Gray 700', light: '#3a5361', dark: '#eff3f5' },
      { name: 'gray-800', label: 'Gray 800', light: '#2a4d6a', dark: '#f7f9fa' },
      { name: 'gray-900', label: 'Gray 900', light: '#1a2530', dark: '#ffffff' },
    ],
    activity: [
      { name: 'recovery', label: 'Recovery', light: '#a4d2d5', dark: '#a4d2d5' },
      { name: 'endurance', label: 'Endurance', light: '#61b9d1', dark: '#a4d2d5' },
      { name: 'tempo', label: 'Tempo', light: '#4c8fa9', dark: '#61b9d1' },
      { name: 'threshold', label: 'Threshold', light: '#2a4d6a', dark: '#4c8fa9' },
      { name: 'vo2max', label: 'VO2 Max', light: '#f39c12', dark: '#f8c471' },
      { name: 'sprint', label: 'Sprint', light: '#2a4d6a', dark: '#61b9d1' },
    ],
  }
};

// Theme 3: Yellow Sunset (Warm yellow/orange palette)
const yellowSunsetTheme = {
  name: 'Yellow Sunset',
  description: 'Energetic warm palette from golden yellows to sunset oranges',
  is_active: false,
  config: {
    primary: [
      { name: 'primary', label: 'Primary', light: '#f6df60', dark: '#f9c54e' },
      { name: 'primary-hover', label: 'Primary Hover', light: '#f9c54e', dark: '#f6df60' },
    ],
    secondary: [
      { name: 'secondary', label: 'Secondary', light: '#f98348', dark: '#f3712b' },
      { name: 'accent', label: 'Accent', light: '#f94346', dark: '#f07178' },
    ],
    status: [
      { name: 'success', label: 'Success', light: '#2ecc70', dark: '#58d68d' },
      { name: 'warning', label: 'Warning', light: '#f9c54e', dark: '#f6df60' },
      { name: 'error', label: 'Error', light: '#f94346', dark: '#f07178' },
      { name: 'info', label: 'Info', light: '#f98348', dark: '#f3712b' },
    ],
    neutral: [
      { name: 'gray-50', label: 'Gray 50', light: '#fffcf5', dark: '#2a2520' },
      { name: 'gray-100', label: 'Gray 100', light: '#fff9eb', dark: '#3d3530' },
      { name: 'gray-200', label: 'Gray 200', light: '#fff3d7', dark: '#504540' },
      { name: 'gray-300', label: 'Gray 300', light: '#ffedc3', dark: '#635550' },
      { name: 'gray-400', label: 'Gray 400', light: '#ffe7af', dark: '#ffe7af' },
      { name: 'gray-500', label: 'Gray 500', light: '#ffd98b', dark: '#ffedc3' },
      { name: 'gray-600', label: 'Gray 600', light: '#ffcb67', dark: '#fff3d7' },
      { name: 'gray-700', label: 'Gray 700', light: '#e6b34e', dark: '#fff9eb' },
      { name: 'gray-800', label: 'Gray 800', light: '#cc9b35', dark: '#fffcf5' },
      { name: 'gray-900', label: 'Gray 900', light: '#b3831c', dark: '#ffffff' },
    ],
    activity: [
      { name: 'recovery', label: 'Recovery', light: '#f6df60', dark: '#f9c54e' },
      { name: 'endurance', label: 'Endurance', light: '#f9c54e', dark: '#f6df60' },
      { name: 'tempo', label: 'Tempo', light: '#f98348', dark: '#f3712b' },
      { name: 'threshold', label: 'Threshold', light: '#f3712b', dark: '#f98348' },
      { name: 'vo2max', label: 'VO2 Max', light: '#f94346', dark: '#f07178' },
      { name: 'sprint', label: 'Sprint', light: '#cc3336', dark: '#f94346' },
    ],
  }
};

function seedCustomThemes() {
  const db = new Database(dbPath);
  
  try {
    console.log('🎨 Seeding custom color palette themes...\n');
    
    const themes = [mountainMeadowTheme, oceanicVoyageTheme, yellowSunsetTheme];
    
    const insertStmt = db.prepare(`
      INSERT INTO theme_configs (name, description, config, is_active)
      VALUES (?, ?, ?, ?)
    `);
    
    themes.forEach((theme, index) => {
      console.log(`📦 Creating theme: ${theme.name}`);
      
      const result = insertStmt.run(
        theme.name,
        theme.description,
        JSON.stringify(theme.config),
        theme.is_active ? 1 : 0
      );
      
      console.log(`   ✅ Created with ID: ${result.lastInsertRowid}`);
      console.log(`   📝 ${theme.description}`);
      console.log('');
    });
    
    // Show all themes
    const allThemes = db.prepare('SELECT id, name, is_active FROM theme_configs ORDER BY id ASC').all();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ALL THEMES IN DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    allThemes.forEach(theme => {
      const status = theme.is_active ? '🟢 ACTIVE' : '⚪ Inactive';
      console.log(`${status} - ${theme.name} (ID: ${theme.id})`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully added ${themes.length} new themes!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎨 Next steps:');
    console.log('1. Refresh your browser');
    console.log('2. Open the Theme Selector in the sidebar');
    console.log('3. Try out the new color palettes!\n');
    
  } catch (error) {
    console.error('❌ Error seeding themes:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the seeding
seedCustomThemes();
