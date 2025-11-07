# Database Scripts

This directory contains utility scripts for database management and seeding.

## Available Scripts

### `seedDefaultThemes.cjs`

Populates the database with default theme configurations.

**Usage:**
```bash
# Seed themes (will not overwrite existing themes)
node server/scripts/seedDefaultThemes.cjs

# Force seed (deletes existing themes and recreates)
node server/scripts/seedDefaultThemes.cjs --force
```

**Themes Created:**

1. **RiderLabs Light** (Active by default)
   - Default light theme with optimal contrast and readability
   - Standard blue primary colors
   - Full color palette for all categories

2. **RiderLabs Dark**
   - Dark theme with enhanced contrast and reduced eye strain
   - Brighter colors optimized for dark backgrounds
   - Reduced eye strain for night usage

3. **High Contrast**
   - High contrast theme for improved accessibility
   - WCAG AAA compliant colors
   - Enhanced readability for visually impaired users

**Color Categories:**
- Primary (brand colors)
- Secondary (accents)
- Status (success, warning, error, info)
- Neutral (gray scale: 50-900)
- Activity (training session types)

**After Seeding:**
1. Restart your application
2. Visit Admin Panel → Theme Configuration
3. Activate different themes to see changes
4. Theme changes apply immediately across the app

## Future Scripts

Additional scripts can be added here for:
- User data seeding
- Test data generation
- Database migrations
- Backup and restore
