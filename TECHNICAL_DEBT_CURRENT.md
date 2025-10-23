# 🔧 Technical Debt & Improvement Backlog

**Last Updated:** October 23, 2025, 8:15am  
**Status:** Current state after timezone implementation

---

## ✅ **Recently Completed**

1. ✅ **Dashboard Chart Bugs** - FIXED! (Oct 23, 2025)
   - Training Volume graph now extends to current date
   - TSS graph displaying correctly with proper data
   
2. ✅ **Timezone Awareness** - IMPLEMENTED! (Oct 23, 2025)
   - Dashboard clock showing user's local time
   - Timezone settings in Settings page
   - AI receives timezone context for accurate date parsing

---

## 🚨 **Critical Priority** (Do First)

### 1. **Excessive Console Logging** ⚠️
**Impact:** High | **Effort:** Low | **Risk:** Low

**Current State:**
- **357 console.log/error statements** across 43 files
- Debug logging left in production code
- Performance impact from excessive logging
- Clutters browser console

**Top Offenders:**
- `AllActivities.jsx` - 32 console statements
- `FTPHistory.jsx` - 25 console statements
- `adaptiveTrainingService.js` - 19 console statements
- `Form.jsx` - 17 console statements
- `PlanGenerator.jsx` - 16 console statements

**Solution:**
- Remove or comment out debug console.logs
- Keep only critical error logging
- Implement proper logging service with levels (debug, info, warn, error)
- Use environment variable to control logging in production

**Estimated Time:** 1 day

---

### 2. **Database Migration: localStorage → Backend Database**
**Impact:** High | **Effort:** High | **Risk:** Medium

**Current State:**
- 170+ localStorage calls across 29 files
- Critical data stored client-side:
  - Training plans (`training_plan`)
  - Race analyses (`race_analyses`)
  - Race plans (`race_plans`)
  - Rider profile (`rider_profile`)
  - Cached metrics (`cached_metrics`)
  - Session completions
  - Wellness logs
  - Timezone preferences (acceptable for this one)

**Problems:**
- ❌ Data lost when user clears browser cache
- ❌ No cross-device sync
- ❌ No backup/recovery
- ❌ Can't access data from mobile
- ❌ Limited to ~5-10MB storage
- ❌ Security concerns (client-side data)

**Solution:**
- Migrate all critical localStorage data to backend database
- Create proper API endpoints for CRUD operations
- Implement data sync mechanism
- Add migration script for existing users
- Keep timezone preference in localStorage (acceptable)

**Files Affected:**
- `src/App.jsx` (25 localStorage calls)
- `src/pages/RiderProfile.jsx` (23 calls)
- `src/pages/Dashboard.jsx` (18 calls)
- `src/pages/PlanGenerator.jsx` (17 calls)
- 25+ other files

**Estimated Time:** 3-4 days

---

### 3. **Race Tag Database Schema Update**
**Impact:** Medium | **Effort:** Low | **Risk:** Low

**Current State:**
- Added `race_type` column to `race_tags` table
- Need to run migration on production database

**Action Required:**
```sql
-- Add race_type column if not exists
ALTER TABLE race_tags ADD COLUMN race_type TEXT;
```

**Estimated Time:** 30 minutes

---

### 4. **Complete Post-Race Analysis Learning Loop**
**Impact:** High | **Effort:** Medium | **Risk:** Low

**Current State:**
- Post-race analysis feature is 90% complete
- Missing final integration with training plan generator

**Remaining Steps (from FINAL_INTEGRATION_STEPS.md):**
1. Add `loadRaceHistory()` function to PlanGenerator.jsx
2. Update `generatePlan()` to include race history in API call
3. Add visual "AI Will Use Your Race Data" card in PlanGenerator
4. Update AI prompt in aiPlannerService.js to use race context
5. Add coach notes referencing race analysis

**Estimated Time:** 2-3 hours

---

### 5. **Dark Mode Polish**
**Impact:** Medium | **Effort:** Low | **Risk:** Low

**Issues:**
- Dark mode needs general polish and refinement
- Some components don't look good in dark mode
- Color contrast issues
- Inconsistent styling across pages

**Action Required:**
- Audit all pages in dark mode
- Fix color contrast issues
- Ensure consistent dark mode styling
- Test all interactive elements

**Estimated Time:** 4-6 hours

---

## 🔥 **High Priority** (Do Soon)

### 6. **Authentication & Session Management Improvements**
**Impact:** High | **Effort:** Medium | **Risk:** Medium

**Issues:**
- Session tokens stored in localStorage (security concern)
- No refresh token mechanism
- Sessions don't expire properly
- No "Remember Me" functionality
- Password reset not implemented

**Improvements Needed:**
- Implement HTTP-only cookies for session tokens
- Add refresh token rotation
- Implement proper session expiration
- Add password reset flow
- Add email verification

**Estimated Time:** 2 days

---

### 7. **Strava Token Refresh Mechanism**
**Impact:** High | **Effort:** Medium | **Risk:** Medium

**Current State:**
- Strava tokens expire after 6 hours
- Manual refresh implemented but could be better
- Users may need to reconnect periodically

**Solution:**
- Improve automatic token refresh
- Store refresh tokens securely in database (not localStorage)
- Handle token expiration gracefully
- Add background refresh job

**Estimated Time:** 1 day

---

### 8. **Error Handling & User Feedback**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Issues:**
- Many API calls use generic `alert()` for errors
- No consistent error handling pattern
- No loading states in some components
- No retry mechanism for failed requests

**Improvements:**
- Create centralized error handling service
- Implement toast notification system (replace alerts)
- Add proper loading states everywhere
- Add retry logic for transient failures
- Better error messages for users

**Estimated Time:** 2 days

---

### 9. **API Rate Limiting & Caching**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Current State:**
- No rate limiting on API endpoints
- Strava API calls cached for 5 minutes (good!)
- Multiple redundant API calls in some flows

**Solution:**
- Implement rate limiting middleware
- Add Redis caching layer for production
- Optimize cache invalidation strategy
- Implement request deduplication

**Estimated Time:** 2 days

---

## 📊 **Medium Priority** (Plan For)

### 10. **Database Optimization**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Issues:**
- SQLite for production (not scalable beyond ~100 users)
- No database indexes on frequently queried columns
- No connection pooling
- No query optimization

**Improvements:**
- Migrate to PostgreSQL for production
- Add proper indexes (user_id, activity_id, date columns)
- Implement connection pooling
- Add query performance monitoring

**Estimated Time:** 3 days

---

### 11. **Code Organization & Refactoring**
**Impact:** Low | **Effort:** High | **Risk:** Low

**Issues:**
- Some components are too large (1000+ lines)
- Duplicate code across components
- Inconsistent naming conventions
- No shared utility functions for common patterns

**Improvements:**
- Break down large components into smaller ones
- Create shared hooks (useLocalStorage, useStrava, useActivities, etc.)
- Extract common utilities
- Standardize naming conventions
- Add JSDoc comments

**Files to Refactor:**
- `PlanGenerator.jsx` (1000+ lines) → Split into smaller components
- `Dashboard.jsx` (1100+ lines) → Extract chart components
- `RiderProfile.jsx` (800+ lines) → Split sections
- `PostRaceAnalysis.jsx` (700+ lines) → Extract analysis display

**Estimated Time:** 1 week

---

### 12. **Testing Infrastructure**
**Impact:** High | **Effort:** High | **Risk:** Low

**Current State:**
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ❌ No test coverage
- ❌ No CI/CD pipeline

**Solution:**
- Set up Jest + React Testing Library
- Add Playwright for E2E tests
- Aim for 70%+ code coverage
- Add CI/CD pipeline with tests
- Test critical user flows

**Priority Tests:**
1. Authentication flow
2. Training plan generation
3. Activity matching
4. Plan adjustments
5. Race analysis

**Estimated Time:** 1 week

---

### 13. **Mobile Responsiveness**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Issues:**
- Some pages not fully mobile-optimized
- Tables don't scroll well on mobile
- Modals can be too large for small screens
- Dashboard clock may need mobile adjustments

**Improvements:**
- Audit all pages for mobile UX
- Implement responsive tables
- Optimize modal sizes
- Add mobile-specific navigation
- Test on various screen sizes

**Estimated Time:** 3 days

---

### 14. **Performance Optimization**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Issues:**
- Large bundle size (~2MB)
- No code splitting
- Images not optimized
- No lazy loading
- All routes loaded upfront

**Improvements:**
- Implement code splitting by route
- Add lazy loading for routes
- Optimize images and assets
- Add service worker for caching
- Implement virtual scrolling for large lists (AllActivities)
- Analyze bundle with webpack-bundle-analyzer

**Estimated Time:** 2 days

---

## 🎨 **Low Priority** (Nice to Have)

### 15. **Accessibility (a11y)**
**Impact:** Low | **Effort:** Medium | **Risk:** Low

**Issues:**
- No ARIA labels on interactive elements
- Keyboard navigation incomplete
- No screen reader support
- Color contrast issues in some areas
- Focus indicators missing

**Improvements:**
- Add ARIA labels to all interactive elements
- Implement full keyboard navigation
- Test with screen readers (NVDA, JAWS)
- Fix color contrast issues
- Add skip links
- Test with axe DevTools

**Estimated Time:** 3 days

---

### 16. **Internationalization (i18n)**
**Impact:** Low | **Effort:** High | **Risk:** Low

**Current State:**
- All text hardcoded in English
- No translation support
- Timezone handling is good foundation for i18n

**Solution:**
- Implement i18n library (react-i18next)
- Extract all strings to translation files
- Support multiple languages (French, German, Spanish, Italian)
- Handle date/time formatting per locale
- Support RTL languages

**Estimated Time:** 1 week

---

### 17. **Analytics & Monitoring**
**Impact:** Medium | **Effort:** Low | **Risk:** Low

**Current State:**
- No user analytics
- No error tracking
- No performance monitoring
- No usage metrics

**Solution:**
- Add privacy-friendly analytics (Plausible or Umami)
- Implement Sentry for error tracking
- Add performance monitoring (Web Vitals)
- Track key user flows and conversions
- Monitor API response times

**Estimated Time:** 1 day

---

### 18. **Documentation**
**Impact:** Low | **Effort:** Medium | **Risk:** Low

**Issues:**
- No inline code documentation
- API docs incomplete
- No component storybook
- Architecture not fully documented

**Improvements:**
- Add JSDoc comments to all functions
- Complete API documentation
- Create Storybook for UI components
- Add architecture diagrams
- Document data flow
- Create developer onboarding guide

**Estimated Time:** 3 days

---

## 🔐 **Security Improvements**

### 19. **Security Audit**
**Impact:** High | **Effort:** Medium | **Risk:** High

**Issues:**
- Passwords stored with bcrypt (good) but no salt rounds specified
- No rate limiting on login attempts
- No CSRF protection
- Limited input sanitization
- API keys in environment variables (good) but no rotation
- Session tokens in localStorage (security risk)

**Improvements:**
- Add rate limiting on auth endpoints (5 attempts per 15 min)
- Implement CSRF tokens for state-changing operations
- Add comprehensive input validation/sanitization
- Implement API key rotation mechanism
- Add security headers (CSP, HSTS, X-Frame-Options)
- Run security audit tools (npm audit, Snyk)
- Move session tokens to HTTP-only cookies

**Estimated Time:** 2 days

---

## 📈 **Scalability Improvements**

### 20. **Infrastructure & Deployment**
**Impact:** High | **Effort:** High | **Risk:** Medium

**Current State:**
- Single server deployment
- No load balancing
- No CDN
- No auto-scaling
- No staging environment

**Improvements:**
- Set up load balancer (nginx or cloud LB)
- Implement CDN for static assets (Cloudflare)
- Add auto-scaling based on load
- Set up staging environment
- Implement blue-green deployments
- Add health checks and monitoring
- Set up backup and disaster recovery

**Estimated Time:** 1 week

---

## 🎯 **Feature Completeness**

### 21. **Missing Core Features**
**Impact:** Medium | **Effort:** Varies | **Risk:** Low

**Features to Complete:**
- ✅ Race type tagging (DONE!)
- ✅ Timezone awareness (DONE!)
- ✅ Dashboard clock (DONE!)
- ⏳ Post-race analysis learning loop (90% done)
- ⏳ Weather integration (planned)
- ⏳ Club race strategy (planned)
- ⏳ Team coordination (planned)
- ⏳ Workout library
- ⏳ Custom workout builder
- ⏳ Social features (share workouts)
- ⏳ Coach dashboard
- ⏳ Multi-athlete management

---

## 📊 **Summary Statistics**

**Total Technical Debt Items:** 21  
**Critical Priority:** 5 items (~7 days)  
**High Priority:** 4 items (~7 days)  
**Medium Priority:** 5 items (~3 weeks)  
**Low Priority:** 4 items (~2 weeks)  
**Security:** 1 item (2 days)  
**Scalability:** 1 item (1 week)

**Estimated Total Time to Clear All Debt:** ~10-12 weeks

---

## 🎯 **Recommended Action Plan**

### **Sprint 1 (Week 1): Critical Cleanup**
1. ✅ Fix Dashboard chart bugs (DONE!)
2. ✅ Implement timezone awareness (DONE!)
3. **Remove excessive console logging** (1 day) ⚠️ **DO NEXT**
4. Complete post-race analysis learning loop (2-3 hours)
5. Run race_type database migration (30 min)
6. Polish dark mode (4-6 hours)

### **Sprint 2 (Week 2-3): Database Migration**
1. Start localStorage → Database migration (4 days)
2. Migrate training plans to database
3. Migrate rider profiles to database
4. Migrate race analyses to database
5. Add data sync mechanism

### **Sprint 3 (Week 4): High Priority Security & UX**
1. Improve authentication (HTTP-only cookies)
2. Improve Strava token refresh
3. Replace alerts with toast notifications
4. Add proper error handling

### **Sprint 4 (Week 5-6): Medium Priority**
1. Database optimization (PostgreSQL migration)
2. API rate limiting & caching
3. Performance optimization
4. Mobile responsiveness

### **Sprint 5 (Week 7-8): Quality & Testing**
1. Set up testing infrastructure
2. Security audit
3. Code refactoring
4. Documentation

### **Ongoing: Low Priority**
- Accessibility improvements
- Internationalization
- Analytics & monitoring

---

## 💡 **Quick Wins** (Do These First!)

1. ✅ **Race type feature** - DONE!
2. ✅ **Dashboard chart fixes** - DONE!
3. ✅ **Timezone awareness** - DONE!
4. ⏳ **Remove console.log spam** - 1 day ⚠️ **DO NEXT**
5. ⏳ **Complete post-race learning loop** - 2-3 hours
6. ⏳ **Add toast notifications** - 1 day
7. ⏳ **Implement loading states** - 1 day
8. ⏳ **Add error boundaries** - 1 day

---

## 📝 **Notes**

- This is a living document - update as items are completed
- Prioritize based on user impact and business value
- Some items can be done in parallel
- Consider user feedback when prioritizing
- Balance new features with technical debt paydown
- **Console logging cleanup should be done before production launch**
- **Database migration is critical for multi-device support**

---

**Next Review:** After completing Sprint 1 (1 week)

**Last Updated:** October 23, 2025, 8:15am
