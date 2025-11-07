/**
 * Fix Theme Format - Convert from grouped arrays to flat object
 * 
 * OLD FORMAT (in database):
 * {
 *   "primary": [
 *     {"name": "primary", "label": "Primary", "light": "#xxx", "dark": "#yyy"},
 *     {"name": "primary-hover", ...}
 *   ],
 *   "secondary": [...]
 * }
 * 
 * NEW FORMAT (needed by themeService):
 * {
 *   "primary": {"light": "#xxx", "dark": "#yyy", "label": "Primary", "category": "primary"},
 *   "primary-hover": {...}
 * }
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'server', 'database.sqlite'));

console.log('🔄 Converting theme formats from grouped arrays to flat objects...\n');

// Get all themes
const themes = db.prepare('SELECT * FROM theme_configs').all();

let updated = 0;
let errors = 0;

for (const theme of themes) {
  try {
    const oldConfig = JSON.parse(theme.config);
    const newConfig = {};
    
    // Convert from grouped arrays to flat object
    for (const [category, colors] of Object.entries(oldConfig)) {
      if (Array.isArray(colors)) {
        for (const color of colors) {
          newConfig[color.name] = {
            light: color.light,
            dark: color.dark,
            label: color.label,
            category: category
          };
        }
      }
    }
    
    const colorCount = Object.keys(newConfig).length;
    console.log(`✅ ${theme.name}: ${colorCount} colors`);
    
    // Update database
    db.prepare('UPDATE theme_configs SET config = ? WHERE id = ?')
      .run(JSON.stringify(newConfig), theme.id);
    
    updated++;
  } catch (error) {
    console.error(`❌ Error updating ${theme.name}:`, error.message);
    errors++;
  }
}

console.log(`\n📊 Results:`);
console.log(`   ✅ Updated: ${updated} themes`);
console.log(`   ❌ Errors: ${errors}`);
console.log(`\n🎉 Done! Restart your server to see the changes.`);

db.close();
