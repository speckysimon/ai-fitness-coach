# RiderLabs TODO List

## 🔴 HIGH PRIORITY - Fix Before Launch

### 1. Training Plan Generation Not Working
- [ ] Check OpenAI API key in production `.env`
- [ ] Test `/api/training/plan/generate` endpoint manually
- [ ] Check PM2 logs for OpenAI errors: `pm2 logs riderlabs | grep -i openai`
- [ ] Verify OpenAI API quota and billing status
- [ ] Test with different plan parameters
- [ ] Add better error messages to frontend
- [ ] **Expected Issue:** API key not set or rate limiting

### 2. Comprehensive Site Testing
- [ ] Test Dashboard - metrics, charts, activity feed
- [ ] Test Training Plan Generation - all event types
- [ ] Test Race Day Predictor - predictions and analysis
- [ ] Test Post-Race Analysis - feedback form and AI analysis
- [ ] Test FTP History - chart rendering and calculations
- [ ] Test Form & Fitness - CTL/ATL/TSB graphs
- [ ] Test Calendar - session display and navigation
- [ ] Test Google Calendar sync - export functionality
- [ ] Test Activity Matching - automatic and manual
- [ ] Test Plan Adjustments - adaptive AI modifications
- [ ] Test Session Completion - marking complete/missed
- [ ] Test Dark Mode - all pages and components
- [ ] Test Mobile Responsiveness - Today's Workout page

---

## 🟡 MEDIUM PRIORITY - Post-Launch

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
- Training plan generation not working (OpenAI API issue suspected)

### Minor
- None currently identified

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

**Last Updated:** October 24, 2025, 11:55pm  
**Status:** Production Live 🚀  
**Next Session:** Fix training plan generation + comprehensive testing
