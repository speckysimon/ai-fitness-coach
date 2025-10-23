# 🔧 Technical Debt & Improvement Backlog

**Last Updated:** October 21, 2025, 10:15pm  
**Status:** Comprehensive audit of technical debt and improvement opportunities

---

## 🚨 **Critical Priority** (Do First)

### 0. **Dashboard Chart Bugs** ⚠️ **NEW**
**Impact:** High | **Effort:** Low | **Risk:** Low

**Issues:**
1. **Training Volume Graph** - Not showing data up to current date
   - Graph cuts off before today
   - Need to extend date range to include current week
   
2. **Training Load (TSS) Graph** - Not displaying properly
   - Chart is bugged/broken
   - May be data formatting issue or rendering problem

**Files Affected:**
- `src/pages/Dashboard.jsx` (lines 793-935)
- Chart components using Recharts library

**Action Required:**
- Fix date range calculation for volume graph
- Debug TSS graph rendering issue
- Test with various data scenarios

**Estimated Time:** 2-3 hours

---

### 0b. **Dark Mode Polish** ⚠️ **NEW**
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

### 1. **Database Migration: localStorage → Backend Database**
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

**Problems:**
- ❌ Data lost when user clears browser cache
- ❌ No cross-device sync
- ❌ No backup/recovery
- ❌ Can't access data from mobile
- ❌ Limited to ~5-10MB storage
- ❌ Security concerns (client-side data)

**Solution:**
- Migrate all localStorage data to backend database
- Create proper API endpoints for CRUD operations
- Implement data sync mechanism
- Add migration script for existing users

**Files Affected:**
- `src/App.jsx` (25 localStorage calls)
- `src/pages/RiderProfile.jsx` (23 calls)
- `src/pages/Dashboard.jsx` (18 calls)
- `src/pages/PlanGenerator.jsx` (17 calls)
- 25+ other files

**Estimated Time:** 3-4 days

---

### 2. **Race Tag Database Schema Update**
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

### 3. **Complete Post-Race Analysis Learning Loop**
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

## 🔥 **High Priority** (Do Soon)

### 4. **Authentication & Session Management Improvements**
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

### 5. **Strava Token Refresh Mechanism**
**Impact:** High | **Effort:** Medium | **Risk:** Medium

**Current State:**
- Strava tokens expire after 6 hours
- No automatic refresh mechanism
- Users must manually reconnect

**Solution:**
- Implement automatic token refresh
- Store refresh tokens securely
- Handle token expiration gracefully
- Add background refresh job

**Estimated Time:** 1 day

---

### 6. **Error Handling & User Feedback**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Issues:**
- Many API calls use generic `alert()` for errors
- No consistent error handling pattern
- No loading states in some components
- No retry mechanism for failed requests

**Improvements:**
- Create centralized error handling service
- Implement toast notification system
- Add proper loading states everywhere
- Add retry logic for transient failures
- Better error messages for users

**Estimated Time:** 2 days

---

### 7. **API Rate Limiting & Caching**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Current State:**
- No rate limiting on API endpoints
- Strava API calls not cached
- Multiple redundant API calls

**Solution:**
- Implement rate limiting middleware
- Add Redis caching layer
- Cache Strava activity data
- Implement request deduplication

**Estimated Time:** 2 days

---

## 📊 **Medium Priority** (Plan For)

### 8. **Database Optimization**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Issues:**
- SQLite for production (not scalable)
- No database indexes on frequently queried columns
- No connection pooling
- No query optimization

**Improvements:**
- Migrate to PostgreSQL for production
- Add proper indexes
- Implement connection pooling
- Add query performance monitoring

**Estimated Time:** 3 days

---

### 9. **Code Organization & Refactoring**
**Impact:** Low | **Effort:** High | **Risk:** Low

**Issues:**
- Some components are too large (500+ lines)
- Duplicate code across components
- Inconsistent naming conventions
- No shared utility functions

**Improvements:**
- Break down large components
- Create shared hooks (useLocalStorage, useStrava, etc.)
- Extract common utilities
- Standardize naming conventions
- Add JSDoc comments

**Files to Refactor:**
- `PlanGenerator.jsx` (1000+ lines)
- `Dashboard.jsx` (1100+ lines)
- `RiderProfile.jsx` (800+ lines)
- `PostRaceAnalysis.jsx` (700+ lines)

**Estimated Time:** 1 week

---

### 10. **Testing Infrastructure**
**Impact:** High | **Effort:** High | **Risk:** Low

**Current State:**
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ❌ No test coverage

**Solution:**
- Set up Jest + React Testing Library
- Add Playwright for E2E tests
- Aim for 70%+ code coverage
- Add CI/CD pipeline with tests

**Estimated Time:** 1 week

---

### 11. **Mobile Responsiveness**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Issues:**
- Some pages not fully mobile-optimized
- Tables don't scroll well on mobile
- Modals can be too large for small screens

**Improvements:**
- Audit all pages for mobile UX
- Implement responsive tables
- Optimize modal sizes
- Add mobile-specific navigation

**Estimated Time:** 3 days

---

### 12. **Performance Optimization**
**Impact:** Medium | **Effort:** Medium | **Risk:** Low

**Issues:**
- Large bundle size
- No code splitting
- Images not optimized
- No lazy loading

**Improvements:**
- Implement code splitting
- Add lazy loading for routes
- Optimize images
- Add service worker for caching
- Implement virtual scrolling for large lists

**Estimated Time:** 2 days

---

## 🎨 **Low Priority** (Nice to Have)

### 13. **Accessibility (a11y)**
**Impact:** Low | **Effort:** Medium | **Risk:** Low

**Issues:**
- No ARIA labels
- Keyboard navigation incomplete
- No screen reader support
- Color contrast issues

**Improvements:**
- Add ARIA labels
- Implement full keyboard navigation
- Test with screen readers
- Fix color contrast issues
- Add skip links

**Estimated Time:** 3 days

---

### 14. **Internationalization (i18n)**
**Impact:** Low | **Effort:** High | **Risk:** Low

**Current State:**
- All text hardcoded in English
- No translation support

**Solution:**
- Implement i18n library (react-i18next)
- Extract all strings
- Add translation files
- Support multiple languages

**Estimated Time:** 1 week

---

### 15. **Analytics & Monitoring**
**Impact:** Medium | **Effort:** Low | **Risk:** Low

**Current State:**
- No user analytics
- No error tracking
- No performance monitoring

**Solution:**
- Add Google Analytics or Plausible
- Implement Sentry for error tracking
- Add performance monitoring
- Track key user flows

**Estimated Time:** 1 day

---

### 16. **Documentation**
**Impact:** Low | **Effort:** Medium | **Risk:** Low

**Issues:**
- No inline code documentation
- API docs incomplete
- No component storybook

**Improvements:**
- Add JSDoc comments to all functions
- Complete API documentation
- Create Storybook for components
- Add architecture diagrams

**Estimated Time:** 3 days

---

## 🔐 **Security Improvements**

### 17. **Security Audit**
**Impact:** High | **Effort:** Medium | **Risk:** High

**Issues:**
- Passwords stored with bcrypt (good) but no salt rounds specified
- No rate limiting on login attempts
- No CSRF protection
- No input sanitization
- API keys in environment variables (good) but no rotation

**Improvements:**
- Add rate limiting on auth endpoints
- Implement CSRF tokens
- Add input validation/sanitization
- Implement API key rotation
- Add security headers
- Run security audit tools

**Estimated Time:** 2 days

---

## 📈 **Scalability Improvements**

### 18. **Infrastructure & Deployment**
**Impact:** High | **Effort:** High | **Risk:** Medium

**Current State:**
- Single server deployment
- No load balancing
- No CDN
- No auto-scaling

**Improvements:**
- Set up load balancer
- Implement CDN for static assets
- Add auto-scaling
- Set up staging environment
- Implement blue-green deployments

**Estimated Time:** 1 week

---

## 🎯 **Feature Completeness**

### 19. **Missing Core Features**
**Impact:** Medium | **Effort:** Varies | **Risk:** Low

**Features to Complete:**
- ✅ Race type tagging (DONE!)
- ✅ Post-race analysis (90% done)
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
**Critical Priority:** 5 items (~6 days)  
**High Priority:** 4 items (~7 days)  
**Medium Priority:** 7 items (~3 weeks)  
**Low Priority:** 5 items (~2 weeks)

**Estimated Total Time to Clear All Debt:** ~9-11 weeks

---

## 🎯 **Recommended Action Plan**

### **Sprint 1 (Week 1-2): Critical Fixes**
1. **Fix Dashboard chart bugs** (2-3 hours) ⚠️ **NEW**
2. **Polish dark mode** (4-6 hours) ⚠️ **NEW**
3. Complete post-race analysis learning loop (2-3 hours)
4. Run race_type database migration (30 min)
5. Start localStorage → Database migration (4 days)

### **Sprint 2 (Week 3-4): High Priority**
1. Finish localStorage migration
2. Implement Strava token refresh
3. Improve error handling
4. Add authentication improvements

### **Sprint 3 (Week 5-6): Medium Priority**
1. Database optimization (PostgreSQL migration)
2. API rate limiting & caching
3. Performance optimization
4. Mobile responsiveness

### **Sprint 4 (Week 7-8): Quality & Testing**
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
2. ✅ **AI analysis tone improvements** - DONE!
3. ⏳ **Complete post-race learning loop** - 2-3 hours
4. ⏳ **Add toast notifications** - 1 day
5. ⏳ **Implement loading states** - 1 day
6. ⏳ **Add error boundaries** - 1 day

---

## 📝 **Notes**

- This is a living document - update as items are completed
- Prioritize based on user impact and business value
- Some items can be done in parallel
- Consider user feedback when prioritizing
- Balance new features with technical debt paydown

---

**Next Review:** After completing Sprint 1 (2 weeks)
