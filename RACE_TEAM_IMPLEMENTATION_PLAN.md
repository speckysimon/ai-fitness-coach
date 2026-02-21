# Race Planning & Team Management - Implementation Plan

**Date:** January 24, 2026  
**Status:** Planning Phase - No Code Written  
**Priority:** HIGH - Standout Feature vs Strava  

---

## 📋 Executive Summary

This plan outlines the implementation of three interconnected features that will differentiate our app from competitors like Strava:

1. **Enhanced Race Planning** - CSV import for bulk race management
2. **Team Events Calendar** - Shared calendar for team/club events
3. **Team Management System** - Team roles, grouping, and permissions

These features align with our long-term vision (see `BIG_INITIATIVES_ROADMAP.md`) for Club & Team Race Strategy as the killer differentiator.

---

## 🎯 Current State Analysis

### Existing Race Features

#### ✅ Already Implemented:
- **Season Planner** (`src/pages/SeasonPlanner.jsx`)
  - Individual race planning
  - Manual race entry (name, date, location, distance, type, priority, status, notes)
  - Database: `season_races` table
  - API: `/api/season-races` (GET, POST, PUT, DELETE)
  
- **Race Tags** (`race_tags` table)
  - Tag activities as races
  - Multi-source support (Strava, Intervals.icu, Manual)
  - Race type categorization
  
- **Race Day Predictor** (`src/pages/RaceDayPredictor.jsx`)
  - GPX route upload
  - AI race plan generation
  - Form prediction
  
- **Post-Race Analysis** (documented in `BIG_INITIATIVES_ROADMAP.md`)
  - Basic implementation exists
  - AI performance scoring
  - Feedback collection

#### ❌ Missing (From Your Image):
- **CSV Import** - Bulk race import capability
- **Drive Time** column - Travel time to event
- **Team Events** - Shared calendar for clubs/teams
- **Team Management** - Roles, permissions, team grouping

---

## 📊 Feature Breakdown

### FEATURE 1: CSV Import for Race Planning

#### Requirements from Image:
Your event table shows these columns:
- Date (2026)
- Event (name)
- Location
- Drive (travel time, e.g., "2:00", "1:15")
- Type (Road race, TT, Endurance, Marathon)
- Priority (A, B)

#### Current Schema vs Required:
```sql
-- Current season_races table
CREATE TABLE season_races (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  name TEXT,              -- ✅ Maps to "Event"
  date TEXT,              -- ✅ Maps to "Date"
  location TEXT,          -- ✅ Maps to "Location"
  distance TEXT,          -- ✅ Existing
  race_type TEXT,         -- ✅ Maps to "Type"
  status TEXT,            -- ✅ Existing (confirmed/provisional)
  priority TEXT,          -- ✅ Maps to "Priority"
  notes TEXT,             -- ✅ Existing
  created_at DATETIME,
  updated_at DATETIME
);

-- MISSING COLUMN:
-- drive_time TEXT       -- ❌ NEW: Travel time to event
```

#### Implementation Tasks:

**1.1 Database Migration** (1 hour)
- [ ] Create migration: `011_add_drive_time_to_season_races.cjs`
- [ ] Add `drive_time TEXT` column to `season_races` table
- [ ] Add index for efficient queries

**1.2 Backend API** (2 hours)
- [ ] Create endpoint: `POST /api/season-races/import/csv`
- [ ] CSV parsing logic (use `csv-parse` or `papaparse`)
- [ ] Validation: date format, required fields, duplicates
- [ ] Batch insert with transaction
- [ ] Error handling and reporting (which rows failed)
- [ ] Update existing endpoints to include `drive_time`

**1.3 Frontend UI** (3 hours)
- [ ] Add "Import CSV" button to Season Planner page
- [ ] CSV upload modal with:
  - File picker
  - Template download link
  - Column mapping interface
  - Preview table (first 5 rows)
  - Import progress indicator
- [ ] Add `drive_time` field to manual race entry form
- [ ] Display `drive_time` in race cards

**1.4 CSV Template** (30 minutes)
- [ ] Create example CSV template
- [ ] Documentation for CSV format
- [ ] Column headers: Date, Event, Location, Drive, Type, Priority, Notes

**Total Estimate: 6.5 hours**

---

### FEATURE 2: Team Events Calendar

#### Purpose:
- Shared calendar visible to all team members
- Club/team organizers can add events
- Individual athletes can browse and add to their personal calendar
- Integration with Season Planner (pick events from team calendar)

#### Database Schema:

```sql
-- New table: team_events
CREATE TABLE team_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER,                    -- NULL = public event
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  drive_time TEXT,
  distance TEXT,
  event_type TEXT,                    -- road_race, criterium, TT, etc.
  description TEXT,
  organizer_id INTEGER,               -- User who created event
  is_public INTEGER DEFAULT 1,        -- Public vs team-only
  registration_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for efficient queries
CREATE INDEX idx_team_events_team_id ON team_events(team_id);
CREATE INDEX idx_team_events_date ON team_events(date);
CREATE INDEX idx_team_events_public ON team_events(is_public);
```

#### Implementation Tasks:

**2.1 Database Migration** (1 hour)
- [ ] Create migration: `012_create_team_events.cjs`
- [ ] Create `team_events` table
- [ ] Seed with sample public events

**2.2 Backend API** (4 hours)
- [ ] `GET /api/team-events` - List all public + user's team events
- [ ] `GET /api/team-events/:id` - Get single event
- [ ] `POST /api/team-events` - Create event (requires team manager role)
- [ ] `PUT /api/team-events/:id` - Update event
- [ ] `DELETE /api/team-events/:id` - Delete event
- [ ] `POST /api/team-events/:id/add-to-calendar` - Add to personal season

**2.3 Frontend Page** (6 hours)
- [ ] Create `src/pages/TeamEventsCalendar.jsx`
- [ ] Calendar view (monthly grid)
- [ ] Event list view (filterable by type, date, team)
- [ ] Event detail modal
- [ ] "Add to My Calendar" button
- [ ] Create/Edit event form (for team managers)
- [ ] Search and filter UI

**2.4 Integration with Season Planner** (2 hours)
- [ ] Add "Browse Team Events" button to Season Planner
- [ ] Modal to select from team events
- [ ] Auto-populate race form from team event

**2.5 Navigation** (30 minutes)
- [ ] Add to main navigation menu
- [ ] Add route to `App.jsx`

**Total Estimate: 13.5 hours**

---

### FEATURE 3: Team Management System

#### Purpose:
- Create teams/clubs
- Assign roles (Team Manager, Member)
- Group users for shared features
- Foundation for future team race strategy features

#### Database Schema:

```sql
-- New table: teams
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- New table: team_members
CREATE TABLE team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- 'manager', 'member'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);

-- New table: team_invitations
CREATE TABLE team_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  invited_by INTEGER NOT NULL,
  invitee_email TEXT,
  invitee_user_id INTEGER,            -- If user exists
  status TEXT DEFAULT 'pending',      -- pending, accepted, declined
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### User Roles:

**Team Manager:**
- Create team events
- Invite/remove team members
- Edit team details
- Delete team
- Assign roles

**Team Member:**
- View team events
- View team members
- Add team events to personal calendar
- Leave team

#### Implementation Tasks:

**3.1 Database Migration** (2 hours)
- [ ] Create migration: `013_create_teams_system.cjs`
- [ ] Create `teams` table
- [ ] Create `team_members` table
- [ ] Create `team_invitations` table
- [ ] Add indexes

**3.2 Backend API - Teams** (6 hours)
- [ ] `GET /api/teams` - List user's teams
- [ ] `GET /api/teams/:id` - Get team details
- [ ] `POST /api/teams` - Create team
- [ ] `PUT /api/teams/:id` - Update team (manager only)
- [ ] `DELETE /api/teams/:id` - Delete team (manager only)
- [ ] `GET /api/teams/:id/members` - List team members
- [ ] `POST /api/teams/:id/invite` - Invite member (manager only)
- [ ] `POST /api/teams/:id/join` - Accept invitation
- [ ] `DELETE /api/teams/:id/members/:userId` - Remove member
- [ ] `PUT /api/teams/:id/members/:userId/role` - Update role

**3.3 Backend API - Invitations** (2 hours)
- [ ] `GET /api/invitations` - List user's pending invitations
- [ ] `POST /api/invitations/:id/accept` - Accept invitation
- [ ] `POST /api/invitations/:id/decline` - Decline invitation

**3.4 Frontend - Team Management Page** (8 hours)
- [ ] Create `src/pages/TeamManagement.jsx`
- [ ] Team list view
- [ ] Create team modal
- [ ] Team detail page with:
  - Member list
  - Invite member form (by email or username)
  - Role management
  - Team settings
- [ ] Invitation notifications
- [ ] Leave team confirmation

**3.5 Frontend - User Profile Enhancement** (2 hours)
- [ ] Add "Profile Name" or "Username" field to users table
- [ ] Display username in settings
- [ ] Search users by username/email for invitations

**3.6 Permissions Middleware** (2 hours)
- [ ] Create `verifyTeamManager` middleware
- [ ] Create `verifyTeamMember` middleware
- [ ] Apply to protected endpoints

**Total Estimate: 22 hours**

---

## 🗺️ Implementation Phases

### Phase 1: Foundation (Week 1-2) - 28.5 hours
**Priority: HIGHEST**

1. **CSV Import** (6.5 hours)
   - Quick win, immediate value
   - Enables bulk race management
   - Foundation for team events

2. **Team Management System** (22 hours)
   - Core infrastructure
   - Required for team events
   - Enables role-based permissions

**Deliverables:**
- CSV import working
- Teams can be created
- Members can be invited
- Roles assigned

---

### Phase 2: Team Events (Week 3) - 13.5 hours
**Priority: HIGH**

3. **Team Events Calendar** (13.5 hours)
   - Builds on team management
   - Shared calendar functionality
   - Integration with Season Planner

**Deliverables:**
- Team events calendar page
- Create/browse/add events
- Integration with personal calendar

---

### Phase 3: Enhancement & Polish (Week 4) - 8 hours
**Priority: MEDIUM**

4. **Polish & Testing** (8 hours)
   - User testing
   - Bug fixes
   - Documentation
   - Mobile responsiveness
   - Performance optimization

**Deliverables:**
- Production-ready features
- User documentation
- Admin guide

---

## 📐 Technical Architecture

### Database Relationships

```
users
  ├─ 1:N → teams (created_by)
  ├─ 1:N → team_members (user_id)
  ├─ 1:N → team_invitations (invited_by, invitee_user_id)
  ├─ 1:N → season_races (user_id)
  └─ 1:N → team_events (organizer_id)

teams
  ├─ 1:N → team_members (team_id)
  ├─ 1:N → team_invitations (team_id)
  └─ 1:N → team_events (team_id)

team_events
  ├─ N:1 → teams (team_id)
  └─ N:1 → users (organizer_id)
```

### API Structure

```
/api/season-races
  POST /import/csv          # New: CSV import

/api/team-events
  GET /                     # List events
  POST /                    # Create event
  GET /:id                  # Get event
  PUT /:id                  # Update event
  DELETE /:id               # Delete event
  POST /:id/add-to-calendar # Add to personal calendar

/api/teams
  GET /                     # List user's teams
  POST /                    # Create team
  GET /:id                  # Get team
  PUT /:id                  # Update team
  DELETE /:id               # Delete team
  GET /:id/members          # List members
  POST /:id/invite          # Invite member
  POST /:id/join            # Join team
  DELETE /:id/members/:userId # Remove member
  PUT /:id/members/:userId/role # Update role

/api/invitations
  GET /                     # List invitations
  POST /:id/accept          # Accept
  POST /:id/decline         # Decline
```

---

## 🎯 Alignment with Long-Term Vision

### From `BIG_INITIATIVES_ROADMAP.md`:

**TIER 1: Club & Team Race Strategy** (Planned for 4-6 weeks)
- ✅ Team creation (this plan)
- ✅ Team roster management (this plan)
- ✅ Team events calendar (this plan)
- 🔜 AI role assignment (future)
- 🔜 Team race strategy generation (future)

**This implementation provides the foundation for:**
1. Team coordination features
2. Multi-rider race strategy
3. Team analytics
4. Coach dashboard

---

## 📋 Dependencies & Prerequisites

### Before Starting:

1. **Core App Fixes** (Your Note)
   - ✅ Activity card refactor (COMPLETE)
   - ⚠️ Any critical bugs in core features
   - ⚠️ AI function stability

2. **Technical Requirements:**
   - CSV parsing library: `papaparse` or `csv-parse`
   - Email service for invitations (existing?)
   - File upload handling (already exists for GPX)

3. **Design Assets:**
   - Team avatar placeholder
   - Team events calendar icons
   - Invitation notification UI

---

## 🚨 Risks & Mitigations

### Risk 1: Scope Creep
**Risk:** Features expand beyond MVP  
**Mitigation:** Strict adherence to this plan, defer enhancements to Phase 4

### Risk 2: Team Management Complexity
**Risk:** Role permissions become complex  
**Mitigation:** Start with 2 roles only (Manager, Member), expand later

### Risk 3: CSV Import Edge Cases
**Risk:** Various CSV formats cause parsing errors  
**Mitigation:** Provide strict template, validate before import, clear error messages

### Risk 4: User Adoption
**Risk:** Users don't understand team features  
**Mitigation:** Clear onboarding, tooltips, documentation

---

## 📊 Success Metrics

### Phase 1 Success:
- [ ] 10+ users import CSV races
- [ ] 5+ teams created
- [ ] 20+ team members invited
- [ ] Zero critical bugs

### Phase 2 Success:
- [ ] 20+ team events created
- [ ] 50+ events added to personal calendars
- [ ] 80%+ user satisfaction with team calendar

### Phase 3 Success:
- [ ] All features mobile-responsive
- [ ] < 2 second page load times
- [ ] Documentation complete

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 4: Advanced Features (Future)
- Team race strategy (AI role assignment)
- Team chat/messaging
- Team analytics dashboard
- Coach mode for team managers
- Team performance tracking
- Bulk event import from race calendars (e.g., USA Cycling)
- Integration with race registration platforms

### Phase 5: Social Features (Future)
- Public team profiles
- Team leaderboards
- Inter-team challenges
- Team achievements/badges

---

## 📝 Implementation Checklist

### Pre-Development:
- [ ] Review this plan with stakeholders
- [ ] Confirm core app is stable
- [ ] Set up development branch
- [ ] Create database backup

### Phase 1: CSV Import (6.5 hours)
- [ ] Migration 011: Add drive_time column
- [ ] Backend: CSV import endpoint
- [ ] Frontend: Upload UI
- [ ] Testing: Various CSV formats
- [ ] Documentation: CSV template

### Phase 1: Team Management (22 hours)
- [ ] Migration 013: Teams tables
- [ ] Backend: Team CRUD APIs
- [ ] Backend: Invitation system
- [ ] Frontend: Team management page
- [ ] Frontend: Invitation notifications
- [ ] Testing: Role permissions
- [ ] Documentation: Team features

### Phase 2: Team Events (13.5 hours)
- [ ] Migration 012: Team events table
- [ ] Backend: Team events APIs
- [ ] Frontend: Team events calendar
- [ ] Frontend: Integration with Season Planner
- [ ] Testing: Event creation/browsing
- [ ] Documentation: Team events guide

### Phase 3: Polish (8 hours)
- [ ] User testing with 5+ users
- [ ] Bug fixes
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Deployment

---

## 📚 Related Documents

- `BIG_INITIATIVES_ROADMAP.md` - Long-term vision for team features
- `DEVELOPMENT_ROADMAP.md` - Overall product roadmap
- `RACE_EXECUTION_MODE_SPEC.md` - Race planning features
- `CLUB_RACE_STRATEGY_SPEC.md` - Future team race strategy
- `SeasonPlanner.jsx` - Existing race planning page
- `seasonRaces.js` - Existing race API

---

## 🎯 Next Steps

### Immediate Actions:
1. **Review & Approve** this plan
2. **Prioritize** core app fixes (if any)
3. **Schedule** development time (50 hours total)
4. **Create** development branch
5. **Begin** Phase 1 implementation

### Timeline Estimate:
- **Phase 1:** 2 weeks (CSV + Team Management)
- **Phase 2:** 1 week (Team Events)
- **Phase 3:** 1 week (Polish)
- **Total:** 4 weeks to MVP

---

**Status:** ✅ Planning Complete - Ready for Review  
**Next:** Core app fixes, then Phase 1 implementation  
**Owner:** Development Team

---

**Last Updated:** January 24, 2026  
**Version:** 1.0  
**Approved By:** Pending
