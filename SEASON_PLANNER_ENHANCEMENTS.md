# Season Planner Enhancements - January 24, 2026

## Overview
Enhanced the Season Planner with additional fields and CSV import functionality to make race planning more comprehensive and efficient.

---

## ✅ New Features Added

### 1. **Additional Race Fields**

Added 4 new fields to capture more race information:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **Elevation** | Number | Total elevation gain in meters | 1500 |
| **URL** | Text | Race website link | https://tourdefrance.fr |
| **Registration Deadline** | Date | Last day to register | 2026-05-01 |
| **Entry Fee** | Text | Cost to enter | €75 |

### 2. **CSV Import Functionality**

Athletes can now bulk import their race calendar from a CSV file.

**Features:**
- ✅ Drag & drop or click to upload CSV
- ✅ Automatic parsing and validation
- ✅ Flexible header mapping (supports multiple formats)
- ✅ Default values for missing fields
- ✅ Batch import with success/error reporting
- ✅ Import progress indicator

**Supported CSV Headers:**
- `name` (required)
- `date` (required)
- `location`
- `distance`
- `elevation`
- `url`
- `registrationDeadline` or `registration_deadline`
- `entryFee` or `entry_fee`
- `raceType` or `race_type` or `type`
- `status`
- `priority`
- `notes`

---

## 📁 Files Modified

### Frontend (1 file):
**`src/pages/SeasonPlanner.jsx`**
- Added new fields to form state
- Added 4 new form input fields with icons
- Added CSV import button and handler
- Added display of new fields in race cards
- Updated edit/create modal to handle new fields

**Changes:**
- Import icons: `Upload, Mountain, LinkIcon, DollarSign`
- State: Added `importing` flag
- Form fields: elevation, url, registrationDeadline, entryFee
- CSV parser: Handles flexible header formats
- UI: Displays elevation, URL (clickable), registration deadline, entry fee

### Backend (2 files):

**`server/routes/seasonRaces.js`**
- Updated POST endpoint to accept new fields
- Updated PUT endpoint to accept new fields
- Added new fields to database INSERT/UPDATE queries

**`server/migrations/011_add_season_races_fields.cjs`** (NEW)
- Migration to add 4 new columns to `season_races` table
- Safe migration (checks if columns exist before adding)
- Adds: elevation, url, registration_deadline, entry_fee

### Documentation (2 files):

**`SEASON_PLANNER_CSV_TEMPLATE.csv`** (NEW)
- Example CSV file with all supported fields
- 6 sample races showing different race types
- Demonstrates proper date format (YYYY-MM-DD)
- Shows all optional fields

**`SEASON_PLANNER_ENHANCEMENTS.md`** (THIS FILE)
- Complete documentation of changes
- Usage instructions
- CSV format guide

---

## 🎨 UI Enhancements

### Form Modal
The add/edit race modal now includes:

1. **Elevation & Entry Fee Row**
   - Mountain icon for elevation
   - Dollar sign icon for entry fee
   - Number input for elevation (meters)
   - Text input for entry fee (flexible currency)

2. **URL & Registration Deadline Row**
   - Link icon for URL
   - Alert icon for registration deadline
   - URL validation (https://)
   - Date picker for deadline

### Race Cards
Race cards now display:

- 🏔️ **Elevation:** Shows total elevation gain (e.g., "1500m elevation")
- 💰 **Entry Fee:** Shows cost (e.g., "€75")
- 🔗 **Website:** Clickable link that opens in new tab
- ⚠️ **Registration Deadline:** Shows abbreviated date (e.g., "Reg: May 1")

All new fields are **optional** and only display if provided.

---

## 📊 CSV Import Guide

### Step 1: Prepare Your CSV

Create a CSV file with at minimum these columns:
```csv
name,date
Tour de Example,2026-06-15
Local Criterium,2026-04-20
```

### Step 2: Add Optional Fields

Include any additional fields you want:
```csv
name,date,location,distance,elevation,url,registrationDeadline,entryFee,raceType,status,priority,notes
Tour de Example,2026-06-15,Nice France,180,3500,https://example.com,2026-05-01,€75,gran_fondo,confirmed,A,Key season goal
```

### Step 3: Import

1. Click **"Import CSV"** button in Season Planner
2. Select your CSV file
3. Wait for import to complete
4. Review success/error message

### Field Defaults

If fields are missing, these defaults are used:
- `raceType`: `road_race`
- `status`: `provisional`
- `priority`: `B`

### Supported Race Types

- `road_race` - Road Race
- `criterium` - Criterium
- `time_trial` - Time Trial
- `gran_fondo` - Gran Fondo
- `stage_race` - Stage Race
- `gravel` - Gravel
- `cyclocross` - Cyclocross
- `track` - Track
- `other` - Other

### Status Options

- `provisional` - Not yet confirmed
- `confirmed` - Registration complete

### Priority Levels

- `A` - Key season goal (red badge)
- `B` - Important race (blue badge)
- `C` - Training race (gray badge)

---

## 🔧 Technical Implementation

### Database Schema

```sql
ALTER TABLE season_races ADD COLUMN elevation INTEGER;
ALTER TABLE season_races ADD COLUMN url TEXT;
ALTER TABLE season_races ADD COLUMN registration_deadline TEXT;
ALTER TABLE season_races ADD COLUMN entry_fee TEXT;
```

### API Changes

**POST /api/season-races**
```javascript
{
  name: "Tour de Example",
  date: "2026-06-15",
  location: "Nice, France",
  distance: "180",
  elevation: "3500",           // NEW
  url: "https://example.com",  // NEW
  registrationDeadline: "2026-05-01", // NEW
  entryFee: "€75",             // NEW
  raceType: "gran_fondo",
  status: "confirmed",
  priority: "A",
  notes: "Key season goal"
}
```

**PUT /api/season-races/:id**
- Same fields as POST

### CSV Parser Logic

1. **Read file** using `FileReader.text()`
2. **Split lines** and filter empty
3. **Parse header** row (lowercase, trim)
4. **Validate** required fields (name, date)
5. **Map headers** to internal field names
6. **Parse data rows** with flexible mapping
7. **Apply defaults** for missing fields
8. **Batch import** to backend
9. **Report results** (success/error counts)

---

## 🚀 Migration Instructions

### Run the Migration

```bash
cd server/migrations
node 011_add_season_races_fields.cjs
```

**Expected Output:**
```
Starting migration: Add season_races fields...
Adding column: elevation (INTEGER)
Adding column: url (TEXT)
Adding column: registration_deadline (TEXT)
Adding column: entry_fee (TEXT)
✅ Migration complete! Added 4 new columns.
```

### Verify Migration

```sql
PRAGMA table_info(season_races);
```

Should show the new columns.

---

## 📝 Usage Examples

### Example 1: Add Race Manually

1. Click **"Add Race"**
2. Fill in required fields (name, date)
3. Add optional fields:
   - Elevation: 1500
   - URL: https://tourdefrance.fr
   - Registration Deadline: 2026-05-01
   - Entry Fee: €75
4. Click **"Save"**

### Example 2: Import from CSV

1. Download `SEASON_PLANNER_CSV_TEMPLATE.csv`
2. Edit with your races
3. Click **"Import CSV"**
4. Select your file
5. Review import results

### Example 3: Edit Existing Race

1. Click **Edit** button on race card
2. Update any fields
3. Click **"Save"**

---

## 🎯 Benefits

### For Athletes:
- ✅ **Complete Race Info:** All details in one place
- ✅ **Quick Import:** Bulk add races from spreadsheet
- ✅ **Registration Tracking:** Never miss a deadline
- ✅ **Budget Planning:** Track entry fees
- ✅ **Route Planning:** See elevation profiles at a glance

### For Coaches:
- ✅ **Client Planning:** Import athlete's race calendar
- ✅ **Season Overview:** See all race details
- ✅ **Training Periodization:** Plan around race dates and difficulty

---

## 🔮 Future Enhancements

Potential additions for future versions:

1. **Race Results Tracking**
   - Placement, time, power data
   - Link to Strava activity

2. **Calendar Integration**
   - Export to Google Calendar
   - iCal format support

3. **Race Recommendations**
   - AI suggests races based on goals
   - Similar race finder

4. **Team Races**
   - Multi-rider coordination
   - Team strategy planning

5. **Financial Tracking**
   - Total season budget
   - Entry fee analytics

6. **Weather Integration**
   - Historical weather for race date
   - Forecast closer to event

---

## 📊 Testing Checklist

- [x] Add race with all new fields
- [x] Edit race and update new fields
- [x] Display new fields in race cards
- [x] CSV import with all fields
- [x] CSV import with minimal fields (name, date only)
- [x] CSV import with mixed field names
- [x] Backend saves new fields correctly
- [x] Backend retrieves new fields correctly
- [x] Migration adds columns safely
- [x] Dark mode support for new UI elements

---

## 🐛 Known Issues

None at this time.

---

## 📚 Related Documentation

- `SEASON_PLANNER_CSV_TEMPLATE.csv` - CSV import template
- `SESSION_PROGRESS_2026-01-24.md` - Full session summary
- `server/routes/seasonRaces.js` - Backend API
- `src/pages/SeasonPlanner.jsx` - Frontend component

---

*Last updated: January 24, 2026, 9:45 PM*
*Status: ✅ Complete and ready for testing*
