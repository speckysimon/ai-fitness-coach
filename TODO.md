# RiderLabs TODO List

## 🔴 HIGH PRIORITY - Current Sprint

### 0. Password Reset Feature ✅ COMPLETED (Nov 24, 2025)
- [x] **Implemented email-based password recovery for user and admin portals**
  - [x] Created email service with Nodemailer and HTML templates
  - [x] Built password reset services for user and admin
  - [x] Added secure token generation (hashed, 1hr expiration, single-use)
  - [x] Implemented API endpoints with rate limiting (3/15min)
  - [x] Created ForgotPassword and ResetPassword pages for user app
  - [x] Created AdminForgotPassword and AdminResetPassword pages
  - [x] Added forgot password links to Login and AdminLogin
  - [x] Created database migrations for password_resets tables
  - [x] Added email configuration to .env.example
  - [x] Implemented session revocation on password reset
  - [x] Built password strength indicators and requirement checkers
  - [x] Created safe deployment script with data integrity checks
  - [x] Deployed to production successfully

### 0. Production Deployment Recovery ✅ COMPLETED (Nov 19, 2025)
- [x] **Fixed critical deployment issues from Nov 18 failure**
  - [x] Fixed API Keys service (`db.run is not a function` error)
  - [x] Created dual database migration system
  - [x] Fixed admin database schema (api_keys table)
  - [x] Created automated deployment script (3-5 min deployments)
  - [x] Implemented atomic database backups (includes WAL files)
  - [x] Documented two-database architecture
  - [x] Created comprehensive deployment guides
  - [x] Tested on production successfully
  - [x] Zero data loss, all systems operational

### 1. Database System Overhaul ✅ COMPLETED (Nov 8, 2025)
- [x] **Eliminated complex migration system**
  - [x] Created single `server/schema.sql` with all 19 tables
  - [x] Updated `db.js` to load schema from file
  - [x] Tested locally - all tables created successfully
  - [x] Deleted `server/migrations/` folder entirely
  - [x] Created comprehensive `DEPLOYMENT_GUIDE.md`
  - [x] 30-second deployments (vs 2+ hours with migrations)
  - [x] No more migration failures or runtime errors
  - [x] Schema-first approach: simple, fast, reliable

### 1. Onboarding Modal Testing (Nov 8, 2025)
- [ ] **Test multi-step onboarding flow end-to-end**
  - [ ] Test Step 1: Welcome screen displays correctly
  - [ ] Test Step 2: Strava OAuth flow (connect → authorize → return)
  - [ ] Verify modal reopens at Step 3 after OAuth
  - [ ] Test Step 3: Coach selection (all 5 coaches load)
  - [ ] Test Step 4: Plan generation prompt
  - [ ] Test Step 5: Success screen and navigation to plan
  - [ ] Test "Skip" button on Strava step
  - [ ] Test "Back" button navigation
  - [ ] Test progress indicator updates
  - [ ] Verify localStorage flags are cleared properly
  - [ ] Test on mobile devices (touch interactions)
  - [ ] Check console for any errors during flow

### 1. Theme System Integration ✅ COMPLETED (Nov 5, 2025)
- [x] **Connect main site themes to admin backend**
  - [x] Create theme service (`src/lib/themeService.js`)
  - [x] Fetch active theme from API on app initialization
  - [x] Cache theme in localStorage (1-hour TTL)
  - [x] Create CSS custom properties for all theme colors
  - [x] Integrate theme initialization in App.jsx
  - [x] Add theme reload on admin activation
  - [x] Document integration process (THEME_SYSTEM_INTEGRATION.md)
  - [ ] Add theme toggle/preview functionality (future enhancement)
  - [ ] Replace hardcoded Tailwind classes with CSS variables (optional migration)
  - [ ] Test theme switching across all pages (requires active theme in DB)

### 2. Mobile Responsiveness ✅ 95% COMPLETE (Nov 8, 2025)
- [x] **Make all pages mobile responsive** - 19/20 pages done
  - [x] Dashboard - cards, charts, activity feed ✅ DONE
  - [x] Training Plan - session cards, calendar view ✅ DONE
  - [x] All Activities - list view, filters ✅ DONE (re-audited Nov 8)
  - [x] Race Analytics - analysis cards, charts ✅ DONE
  - [x] Post-Race Analysis - feedback form, analysis display ✅ DONE
  - [x] Methodology - collapsible sections, info boxes ✅ DONE
  - [x] Form & Fitness - metrics cards, charts ✅ DONE
  - [x] Settings - form layouts, sections ✅ DONE
  - [x] Profile Setup - multi-step form ✅ DONE
  - [x] Calendar - month/week views ✅ DONE (added week view switcher)
  - [x] Today's Workout - already mobile-friendly ✅
  - [x] Rider Profile, Weekly Report, Performance Metrics ✅ DONE
  - [x] Session Planner, Race Day Predictor, Race Analysis ✅ DONE
  - [ ] Admin pages - tables, forms (DEFERRED - low priority)
- [x] Test all pages on mobile viewport (320px - 768px)
- [x] Fix layout issues on small screens
- [x] Ensure touch-friendly buttons and interactions
- [x] Test navigation menu on mobile
- [x] Verify forms work on mobile (plan generation, race analysis, etc.)
- [x] Test charts and graphs on mobile
- [x] Ensure modals display properly on small screens
- **See MOBILE_RESPONSIVENESS_CHECKLIST.md for detailed progress**

### 3. Menu Cleanup & Navigation ✅ COMPLETED (Nov 1, 2025)
- [x] Review current navigation structure
- [x] Identify redundant or confusing menu items
- [x] Reorganize menu for better UX
- [x] Consider grouping related features (Race Intelligence section)
- [x] Add icons where missing (Sparkles for Race Intelligence)
- [x] Improve menu hierarchy (collapsible sections)
- [x] Test navigation flow

### 4. Dark Mode Polish (Proper Implementation) ✅ COMPLETED (Nov 2, 2025)
- [x] **Note:** Previous dark mode was quick fix, needs proper implementation
- [x] Audit ALL pages for dark mode consistency
- [x] Fix hardcoded colors (replace with dark: variants)
- [x] Methodology page - all light boxes fixed
- [x] Form & Fitness page - Status card and form zones fixed
- [x] Training Plan page - session cards with completion status
- [x] Created comprehensive color audit document (DARK_MODE_COLOR_AUDIT.md)
- [ ] Ensure WCAG AA contrast compliance (needs testing)
- [ ] Test all components in dark mode (modals, dropdowns, tooltips, charts)

### 5. Training Plan Generation - Production Testing
- [ ] **Status:** Works in development, needs production verification
- [ ] Test on production (riderlabs.io)
- [ ] Verify OpenAI API key is set correctly in production `.env`
- [ ] Test with different plan parameters (all event types)
- [ ] Check PM2 logs for any errors: `pm2 logs riderlabs | grep -i openai`
- [ ] Verify OpenAI API quota and billing status
- [ ] Test plan adjustments on production
- [ ] Add better error messages to frontend if issues found

### 6. AI Coach Enhancements - Post-Training Chat Experience
**Goal:** Replicate the post-training conversation experience with GPT (where user shares Strava screenshots and discusses workout) but integrated seamlessly into RiderLabs with coach persona consistency.

- [ ] **Make "Talk to AI Coach" more general purpose**
  - [ ] **Current State:** Only for "Analyze and Adjust Plan" - too narrow
  - [ ] **New Vision:** Post-training debrief chat like conversations with GPT
  - [ ] **Key Features:**
    - [ ] General Q&A about recent activities, issues, concerns
    - [ ] Post-workout debriefs and discussions
    - [ ] Ask questions about training decisions
    - [ ] Get feedback on how you're feeling
    - [ ] Discuss concerns, fatigue, motivation issues
    - [ ] More conversational and helpful beyond just plan adjustments
  - [ ] **Coach Persona Integration:**
    - [ ] Maintain consistent coach personality throughout conversation
    - [ ] Coach responds in their characteristic style (motivational, analytical, supportive, etc.)
    - [ ] Reference athlete's chosen coach persona in all responses
  - [ ] **Context-Aware Conversations:**
    - [ ] AI has access to recent activities (already implemented)
    - [ ] Current training plan context
    - [ ] Long-term goal (to be added)
    - [ ] Fitness metrics (FTP, CTL, ATL, TSB)
    - [ ] Past conversations/analyses
  - [ ] **Implementation:**
    - [ ] Update UI/UX to reflect broader coaching purpose
    - [ ] Rename from "Analyze and Adjust" to "Talk to Coach" or "Coach Chat"
    - [ ] Update AI prompt to handle general coaching questions
    - [ ] Add conversation history/context
    - [ ] Consider adding image upload for Strava screenshots (future)

- [ ] **Add "Analyze Activity" button to individual activity modals**
  - [ ] **Purpose:** Quick one-time analysis of specific workout
  - [ ] Add button to each activity detail modal
  - [ ] "Run once" analysis against training plan
  - [ ] Compare activity to planned session
  - [ ] Analyze against past history and goals
  - [ ] Output meaningful comment on performance
  - [ ] Show how activity fits into overall training
  - [ ] Identify deviations or improvements
  - [ ] Store analysis with activity for future reference
  - [ ] Coach persona provides feedback in their characteristic style

### 7. User Settings Enhancements
- [ ] **Add "Long-term Goal" field to user settings**
  - [ ] Add to Settings page (Profile/Goals section)
  - [ ] Text field for long-term cycling goal (e.g., "Complete Gran Fondo in under 5 hours")
  - [ ] Store in database (user_preferences table)
  - [ ] Use in AI context for plan generation
  - [ ] Display in profile/dashboard
  - [ ] Help AI understand athlete's ultimate objective
  - [ ] Inform training plan recommendations

### 8. Comprehensive Site Testing
- [ ] Test Dashboard - metrics, charts, activity feed
- [ ] Test Training Plan Generation - all event types
- [ ] Test Race Day Predictor - predictions and analysis
- [x] Test Post-Race Analysis - feedback form and AI analysis ✅ FIXED (Nov 7)
- [x] Test Race Analytics - charts and race data ✅ FIXED (Nov 7)
- [ ] Test FTP History - chart rendering and calculations
- [ ] Test Form & Fitness - CTL/ATL/TSB graphs
- [ ] Test Calendar - session display and navigation
- [ ] Test Google Calendar sync - export functionality
- [ ] Test Activity Matching - automatic and manual
- [ ] Test Plan Adjustments - adaptive AI modifications
- [ ] Test Session Completion - marking complete/missed
- [ ] Test Dark Mode - all pages and components
- [x] Test Mobile Responsiveness - Race pages ✅ VERIFIED (Nov 7)
- [x] Test Mobile Responsiveness - Today's Workout page ✅

---

## 🟡 MEDIUM PRIORITY - Post-Launch

### Authentication & Security
- [ ] **Forgot Password Feature**
  - [ ] "Forgot Password" link on login page
  - [ ] Password reset flow with secure tokens
  - [ ] Email integration (SendGrid/Mailgun/Resend)
  - [ ] Database table for reset tokens
  - [ ] Reset email template
  - [ ] Token expiration (1 hour)
  - [ ] Rate limiting on reset requests
- [ ] **Email Setup for riderlabs.io**
  - [ ] Option 1: Cloudflare Email Routing (free forwarding)
  - [ ] Option 2: Google Workspace (professional email)
  - [ ] Configure transactional email service (SendGrid/Mailgun)

### Performance & Optimization
- [ ] Monitor PM2 memory usage over 24 hours
- [ ] Check database query performance with real data
- [ ] Optimize frontend bundle size (currently serving from dist/)
- [ ] Add loading states to all async operations
- [ ] Implement error boundaries for React components

### Security & Compliance
- [ ] Verify all API keys are in `.env` (not hardcoded)
- [ ] Review CORS settings for production
- [ ] Add rate limiting to API endpoints
- [ ] Implement request logging for debugging
- [ ] Add CSRF protection
- [ ] Review Strava API compliance (already done, verify)
- [ ] Review Google Calendar API compliance

### User Experience
- [x] Add onboarding flow for new users ✅ DONE (Nov 8, 2025)
  - Multi-step modal with 5 steps
  - Strava connection integration
  - Coach selection
  - Plan generation prompt
  - See TODO_ONBOARDING_MODAL.md for details
- [ ] Create help/FAQ page
- [ ] Add tooltips to complex features
- [ ] Improve error messages (user-friendly)
- [ ] Add "What's New" modal for updates
- [ ] Create video tutorials for key features

---

## 🟢 LOW PRIORITY - Future Enhancements

### Features
- [ ] Progressive Web App (PWA) - offline support
- [ ] Push notifications for upcoming workouts
- [ ] Workout export to Garmin/Zwift
- [ ] Social features - share plans with friends
- [ ] Coach marketplace - connect with real coaches
- [ ] Training plan templates library
- [ ] Nutrition tracking integration
- [ ] Sleep tracking integration
- [ ] Weather-based workout adjustments

### Analytics & Insights
- [ ] Advanced analytics dashboard
- [ ] Predictive performance modeling
- [ ] Injury risk prediction
- [ ] Training load optimization
- [ ] Recovery recommendations
- [ ] Peak performance timing

### Integrations
- [ ] Garmin Connect integration (already has attribution)
- [ ] TrainingPeaks export
- [ ] Zwift workout export (already has attribution)
- [ ] Apple Health integration
- [ ] Wahoo integration
- [ ] Peloton integration

---

## 📋 Maintenance Tasks

### Regular Checks
- [ ] Monitor PM2 logs daily: `pm2 logs riderlabs`
- [ ] Check SSL certificate renewal (auto via Certbot)
- [ ] Backup database weekly
- [ ] Review error logs for patterns
- [ ] Monitor API usage and costs
- [ ] Check for dependency updates

### Documentation
- [ ] Update README with production setup
- [ ] Document API endpoints
- [ ] Create user guide
- [ ] Write deployment runbook
- [ ] Document troubleshooting steps

---

## ✅ COMPLETED

### November 2, 2025 - Dark Mode Completion & Theme System (v2.9.0)
- [x] Complete dark mode implementation for Methodology page
- [x] Complete dark mode implementation for Form & Fitness page
- [x] Complete dark mode implementation for Training Plan page
- [x] Created comprehensive color audit document (DARK_MODE_COLOR_AUDIT.md)
- [x] Created Theme Configuration admin page (ThemeConfigPage.jsx)
- [x] Created backend API for theme CRUD operations
- [x] Created database migration for theme_configs table
- [x] Added theme configuration route to admin navigation
- [x] Documented all color usage across application
- [x] Prepared roadmap for theme system integration

### November 1, 2025 - Navigation & Settings UX Improvements (v2.8.0)
- [x] Race Intelligence collapsible menu section
- [x] Sidebar compaction (logo-only attributions)
- [x] Settings page reorganization
- [x] Remove legacy API Configuration section
- [x] Remove Account/Logout section from Settings
- [x] Make Coach and Reminders sections collapsible
- [x] Timezone & Data Management side-by-side layout
- [x] Move Changelog link to Settings About section
- [x] Dynamic version number from package.json
- [x] Component refactoring (CoachAvatarSelector, NotificationSettings)
- [x] Dark mode support for all new sections

### October 24, 2025 - Deployment Session
- [x] Fix login form dark mode labels
- [x] Fix Zwift logo 404 error
- [x] Fix Strava OAuth hardcoded localhost URLs
- [x] Fix Strava redirect URI mismatch
- [x] Deploy to production (riderlabs.io)
- [x] Configure SSL certificate
- [x] Set up PM2 process manager
- [x] Configure Nginx reverse proxy
- [x] Test Strava OAuth flow
- [x] Verify database persistence

### October 24, 2025 - Tech Debt Elimination
- [x] Console logging cleanup (187 statements removed)
- [x] Dark mode polish (8 pages, 224+ colors fixed)
- [x] Database migration (localStorage → SQLite)
- [x] Post-race learning loop integration
- [x] Race type migration scripts
- [x] Documentation updates (Terms, Privacy)

### October 31, 2025 - User Avatar Upload System
- [x] User avatar upload functionality
- [x] Avatar display in sidebar
- [x] Image processing with sharp (resize, compress)
- [x] Database migration for avatar_url column
- [x] Multer file upload middleware
- [x] Avatar API endpoints (upload, delete)
- [x] Dark mode support for avatar UI
- [x] Mobile-responsive avatar upload

### October 21-24, 2025 - Major Features
- [x] Complete rebrand to RiderLabs
- [x] Post-race analysis with AI
- [x] Adaptive plan adjustments
- [x] Coach avatar system (5 personas)
- [x] Timezone awareness
- [x] Real-time dashboard clock
- [x] Today's Workout mobile page
- [x] Week rollup/collapse feature
- [x] Zwift trademark compliance
- [x] Strava trademark compliance

---

## 🐛 Known Bugs & Fixes Needed

### Critical
- Manual activity edit not saving (Oct 29, 2025) - needs investigation

### Minor
- Dark mode has some inconsistencies (quick fix applied, needs proper audit)
- Mobile responsiveness issues on various pages
- Navigation menu could be cleaner/more organized

### Feature Improvements Needed (Nov 12, 2025)
- **Talk to AI Coach - Post-Training Chat Experience** 
  - Goal: Replicate post-training conversation with GPT (where user shares Strava screenshots and discusses workout)
  - Currently too specific (analyze/adjust only), needs to be more general
  - Should enable post-workout debriefs, Q&A about activities, issues, concerns
  - Must maintain coach persona consistency throughout conversation
  - Context-aware: access to activities, plan, goals, fitness metrics
  - Consider future: image upload for Strava screenshots
  
- **Activity Analysis Button** 
  - Missing "Analyze Activity" button on individual activity modals
  - One-time analysis against plan/history/goals
  - Coach persona provides feedback in their characteristic style
  - Store analysis with activity for future reference
  
- **Long-term Goal Field** 
  - User settings missing long-term goal field
  - Helps AI understand athlete's ultimate objective (e.g., "Complete Gran Fondo in under 5 hours")
  - Should be used in AI context for plan generation and coaching conversations

---

## 💡 Ideas for Future

- AI-powered workout recommendations based on weather
- Integration with power meter manufacturers
- Virtual coaching sessions via video
- Community challenges and leaderboards
- Training plan marketplace
- Mobile app (React Native)
- Wearable device integration (Apple Watch, Garmin)
- Voice-controlled workout logging

---

## 🔧 Outstanding Issues (Oct 31, 2025)

### Avatar Upload - Minor Enhancements
- [ ] Consider using environment variable for server URL instead of hardcoded `localhost:5001`
- [ ] Add avatar to additional locations (dashboard header, settings page)
- [ ] Consider adding default avatar options/gallery
- [ ] Add avatar cropping tool before upload (optional enhancement)

---

**Last Updated:** November 2, 2025, 7:55pm  
**Status:** Production Live 🚀 | v2.9.0 Released  
**Next Session:** Theme system integration + mobile responsiveness + production testing
