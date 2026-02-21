# Season Planner CSV Export/Import Guide

## Overview
The Season Planner now supports both **exporting** and **importing** race calendars via CSV files, making it easy to backup, share, and bulk-manage your race schedule.

---

## 🔽 CSV Export

### How to Export
1. Navigate to **Season Planner**
2. Click **"Export CSV"** button (top right)
3. File downloads automatically: `season-races-YYYY-MM-DD.csv`

### What Gets Exported
All your races with these fields:
- name
- date
- location
- distance
- elevation
- url
- registrationDeadline
- entryFee
- raceType
- status
- priority
- **isTeamRace** (true/false)
- notes

### Export Features
- ✅ Automatic CSV escaping (handles commas, quotes, newlines)
- ✅ Disabled when no races exist
- ✅ Timestamped filename
- ✅ UTF-8 encoding

---

## 🔼 CSV Import

### How to Import
1. Navigate to **Season Planner**
2. Click **"Import CSV"** button
3. Select your CSV file
4. Wait for import to complete
5. Review success/error message

### Import Template
Use `season_planner_import_template.csv` as a starting point.

**Required Fields:**
- `name` - Race name
- `date` - Race date (YYYY-MM-DD format)

**Optional Fields:**
- `location` - City, country
- `distance` - Distance in km
- `elevation` - Elevation gain in meters
- `url` - Race website
- `registrationDeadline` - Deadline date (YYYY-MM-DD)
- `entryFee` - Cost (e.g., €75, $50)
- `raceType` - Type of race (see options below)
- `status` - provisional or confirmed
- `priority` - A, B, or C
- `isTeamRace` - true or false
- `notes` - Additional notes

### Race Type Options
- `road_race` - Road Race (default)
- `criterium` - Criterium
- `time_trial` - Time Trial
- `gran_fondo` - Gran Fondo
- `stage_race` - Stage Race
- `gravel` - Gravel
- `cyclocross` - Cyclocross
- `track` - Track
- `other` - Other

### Import Features
- ✅ Flexible header mapping (supports variations)
- ✅ Batch import with progress
- ✅ Success/error reporting
- ✅ Default values for missing fields
- ✅ Validation of required fields

---

## 📋 Example CSV

```csv
name,date,location,distance,elevation,url,registrationDeadline,entryFee,raceType,status,priority,isTeamRace,notes
Tour de France Stage,2026-07-15,France,180,3500,https://letour.fr,2026-06-01,€150,stage_race,confirmed,A,true,Mountain stage with team support
Local Criterium,2026-04-20,Downtown,45,150,https://localcrit.com,2026-04-10,€25,criterium,provisional,B,false,Fast flat course
Gran Fondo Alps,2026-08-12,Swiss Alps,120,2800,https://granfondoalps.com,2026-07-01,€85,gran_fondo,confirmed,A,false,Challenging mountain sportive
```

---

## 🔄 Workflow Examples

### Backup Your Season
1. Export CSV at start of season
2. Save to cloud storage (Dropbox, Google Drive)
3. Re-import if needed

### Share with Coach
1. Export your race calendar
2. Email CSV to coach
3. Coach can import and review

### Plan Multiple Scenarios
1. Create different CSV files for different goals
2. Import the one you choose
3. Export and compare

### Migrate from Spreadsheet
1. Create races in Google Sheets/Excel
2. Export as CSV
3. Import to Season Planner

---

## 🎯 Tips & Best Practices

### Date Format
Always use **YYYY-MM-DD** format:
- ✅ Good: `2026-07-15`
- ❌ Bad: `07/15/2026`, `15-07-2026`

### Team Races
Use `true` or `false` for isTeamRace:
- ✅ Good: `true`, `false`
- ❌ Bad: `yes`, `no`, `1`, `0`

### Commas in Notes
The system automatically handles commas:
```csv
notes
"Mountain stage, technical descent, team tactics required"
```

### URLs
Include full URL with https://
- ✅ Good: `https://example.com`
- ❌ Bad: `example.com`, `www.example.com`

### Entry Fees
Include currency symbol:
- ✅ Good: `€75`, `$50`, `£40`
- ❌ Bad: `75`, `50 euros`

---

## ⚠️ Common Issues

### Import Fails
**Problem:** "CSV must include these columns: name, date"
**Solution:** Ensure first row has `name` and `date` headers

### Wrong Date Format
**Problem:** Dates not importing correctly
**Solution:** Use YYYY-MM-DD format (e.g., 2026-07-15)

### Special Characters
**Problem:** Accents or special characters look wrong
**Solution:** Save CSV as UTF-8 encoding

### Empty Rows
**Problem:** Import creates blank races
**Solution:** Remove empty rows from CSV before importing

---

## 📊 Field Mapping Reference

| CSV Header (case-insensitive) | Internal Field | Default Value |
|-------------------------------|----------------|---------------|
| name | name | (required) |
| date | date | (required) |
| location | location | empty |
| distance | distance | empty |
| elevation | elevation | empty |
| url | url | empty |
| registrationDeadline, registration_deadline | registrationDeadline | empty |
| entryFee, entry_fee | entryFee | empty |
| raceType, race_type, type | raceType | road_race |
| status | status | provisional |
| priority | priority | B |
| isTeamRace, is_team_race, team | isTeamRace | false |
| notes | notes | empty |

---

## 🚀 Advanced Usage

### Bulk Season Planning
1. Plan entire season in spreadsheet
2. Add all races with details
3. Import in one go
4. Adjust individual races as needed

### Team Coordination
1. Export your calendar
2. Share with teammates
3. They import and see your schedule
4. Coordinate team race attendance

### Historical Tracking
1. Export at end of season
2. Archive for reference
3. Compare year-over-year
4. Track progression

---

## 📝 Template File

Download: `season_planner_import_template.csv`

This template includes:
- 8 example races
- All field types demonstrated
- Mix of team and individual races
- Various race types
- Different priorities and statuses

**Use it to:**
- Learn the CSV format
- Test import functionality
- Build your own calendar

---

## 🔧 Technical Details

### Export Format
- **Encoding:** UTF-8
- **Line Endings:** LF (\n)
- **Delimiter:** Comma (,)
- **Quoting:** Automatic for special characters
- **Filename:** `season-races-YYYY-MM-DD.csv`

### Import Parsing
- **Header Detection:** First row
- **Case Insensitive:** Headers matched regardless of case
- **Trimming:** Whitespace automatically removed
- **Validation:** Required fields checked before import
- **Error Handling:** Detailed error messages

---

## ✅ Success Indicators

After successful import, you'll see:
```
Import complete!
Successfully imported: 8
Failed: 0
```

After successful export:
- File downloads to your Downloads folder
- Filename includes current date
- Can be opened in Excel, Google Sheets, or any text editor

---

*Last updated: January 24, 2026*
*Version: 1.0 (includes team/individual toggle)*
