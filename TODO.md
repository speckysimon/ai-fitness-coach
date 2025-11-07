# RiderLabs TODO List

## 🔴 HIGH PRIORITY - Current Sprint

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

### 2. Mobile Responsiveness ✅ IN PROGRESS (Nov 7, 2025)
- [ ] **Make all pages mobile responsive**
  - [ ] Dashboard - cards, charts, activity feed
  - [ ] Training Plan - session cards, calendar view
  - [ ] All Activities - list view, filters
  - [x] Race Analytics - analysis cards, charts ✅ DONE
  - [x] Post-Race Analysis - feedback form, analysis display ✅ DONE
  - [ ] Methodology - collapsible sections, info boxes
  - [ ] Form & Fitness - metrics cards, charts
  - [ ] Settings - form layouts, sections
  - [ ] Profile Setup - multi-step form
  - [ ] Calendar - month/week views
  - [x] Today's Workout - already mobile-friendly ✅
  - [ ] Admin pages - tables, forms
- [ ] Test all pages on mobile viewport (320px - 768px)
- [ ] Fix layout issues on small screens
- [ ] Ensure touch-friendly buttons and interactions
- [ ] Test navigation menu on mobile
- [ ] Verify forms work on mobile (plan generation, race analysis, etc.)
- [ ] Test charts and graphs on mobile
- [ ] Ensure modals display properly on small screens

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

### 6. Comprehensive Site Testing
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
- [ ] Add onboarding flow for new users
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

## 🐛 Known Bugs

### Critical
- Manual activity edit not saving (Oct 29, 2025) - needs investigation

### Minor
- Dark mode has some inconsistencies (quick fix applied, needs proper audit)
- Mobile responsiveness issues on various pages
- Navigation menu could be cleaner/more organized

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
