# AI Fitness Coach - Development Roadmap

**Last Updated:** October 10, 2025  
**Status:** Active Development

---

## ✅ Recently Completed (October 10, 2025)

### 1. Google Calendar Integration
- ✅ Fixed OAuth flow (redirect to `/settings`)
- ✅ Added session validation and CSRF protection
- ✅ Database token storage
- ✅ Google Cloud Console setup guide
- **Status:** COMPLETE & WORKING

### 2. Token Refresh Logic
- ✅ Added automatic token refresh to All Activities page
- ✅ Added automatic token refresh to Form & Fitness page
- ✅ Handles 401/403 errors gracefully
- ✅ Prevents empty pages from expired tokens
- **Status:** COMPLETE & WORKING

### 3. Race Tags Persistence
- ✅ Moved from localStorage to database
- ✅ Created `race_tags` table
- ✅ Added API endpoints (`/api/race-tags`)
- ✅ Updated all pages to use backend API
- ✅ Race tags now persist across Strava reconnections
- **Status:** COMPLETE & WORKING

### 4. Port Configuration
- ✅ Fixed port 5000 → 5001 conflict (macOS AirPlay)
- ✅ Updated all configs
- ✅ Documentation created
- **Status:** COMPLETE & WORKING

---

## 🚧 In Progress / Next Up

### 1. **Illness/Injury Tracking & Recovery** (PROPOSED - Just Discussed)
**Priority:** Medium  
**Estimated Time:** 1-2 weeks  
**Status:** Planning

**Features:**
- Log illness/injury periods (start/end dates)
- Categorize: Illness, Injury, Other
- Severity levels: Minor, Moderate, Severe
- Notes field for details
- CTL/ATL decay calculation during time off
- Visual indicators on Form & Fitness graph
- Recovery timeline suggestions
- Training plan adjustments

**Implementation:**
- Database table for time-off periods
- API endpoints for CRUD operations
- Frontend UI for logging
- Integration with Form & Fitness calculations
- Calendar markers for time-off periods

**Value:**
- Better fitness tracking accuracy
- Realistic recovery expectations
- Adjusted training recommendations
- Historical health tracking

---

## 🎯 High Priority Features

### 2. **Club Race Strategy Platform** (MAJOR FEATURE)
**Priority:** HIGH  
**Estimated Time:** 4-6 weeks  
**Status:** Spec Complete, Ready to Build  
**Document:** `CLUB_RACE_STRATEGY_SPEC.md`

**Phase 1: MVP (Weeks 1-4)**
- [ ] Create race events (name, date, GPX upload)
- [ ] Invite team members
- [ ] Team roster with auto-imported profiles
- [ ] AI role assignment (Leader, Sprinter, Climber, Domestique)
- [ ] AI strategy generation (OpenAI GPT-4)
- [ ] Individual race plans (PDF, .FIT export)

**Phase 2: Enhanced (Weeks 5-8)**
- [ ] Post-race analysis (plan vs execution)
- [ ] Team chat & communication
- [ ] Season planning
- [ ] Performance trends

**Technical Requirements:**
- Intervals.icu API integration (or Strava fallback)
- GPX route analysis
- OpenAI strategy generation
- Export to bike computer formats
- Team collaboration features

**Business Value:**
- **HUGE** - First AI-powered team race strategy platform
- Network effects (teams bring teams)
- Monetization: Club tier ($50-100/month)
- Potential market: 50,000+ cycling clubs worldwide

**Blockers:**
- Need Intervals.icu API access (contact David)
- Requires testing with real race club

---

## 📋 Backlog (Prioritized)

### 3. **Training Plan Improvements**
**Priority:** Medium  
**Estimated Time:** 2-3 weeks

**Features:**
- [ ] More plan templates (Gran Fondo, Century, Multi-day events)
- [ ] Progressive overload algorithm
- [ ] Taper optimization
- [ ] Plan adjustment based on actual vs planned TSS
- [ ] Integration with illness/injury tracking
- [ ] Export to TrainingPeaks, Today's Plan

**Value:**
- Better plan quality
- More use cases
- Competitive with paid coaching

---

### 4. **Nutrition & Fueling**
**Priority:** Medium  
**Estimated Time:** 1-2 weeks

**Features:**
- [ ] Calorie burn estimation
- [ ] Carb/protein recommendations
- [ ] Race day fueling strategy
- [ ] Hydration tracking
- [ ] Integration with training plans

**Value:**
- Holistic training approach
- Race day preparation
- Recovery optimization

---

### 5. **Social Features**
**Priority:** Medium  
**Estimated Time:** 2-3 weeks

**Features:**
- [ ] Follow other users
- [ ] Activity feed
- [ ] Kudos/comments
- [ ] Leaderboards
- [ ] Challenges
- [ ] Club pages (ties into Race Strategy)

**Value:**
- User engagement
- Retention
- Viral growth

---

### 6. **Mobile App**
**Priority:** Medium-Low  
**Estimated Time:** 6-8 weeks

**Features:**
- [ ] React Native app
- [ ] Offline mode
- [ ] Push notifications
- [ ] Quick activity logging
- [ ] Race day plan viewer

**Value:**
- Better UX
- Higher engagement
- App store presence

---

### 7. **Advanced Analytics**
**Priority:** Low  
**Estimated Time:** 2-3 weeks

**Features:**
- [ ] Power duration curve
- [ ] Fatigue resistance
- [ ] Optimal training zones
- [ ] Periodization analysis
- [ ] Comparative analytics (you vs similar riders)

**Value:**
- Power users
- Competitive advantage
- Data insights

---

### 8. **Integrations**
**Priority:** Low-Medium  
**Estimated Time:** 1 week each

**Platforms:**
- [ ] Wahoo
- [ ] Garmin Connect (beyond .FIT export)
- [ ] TrainingPeaks
- [ ] Today's Plan
- [ ] Zwift
- [ ] Apple Health
- [ ] Whoop

**Value:**
- Broader ecosystem
- More data sources
- User convenience

---

### 9. **Coach Mode**
**Priority:** Low  
**Estimated Time:** 3-4 weeks

**Features:**
- [ ] Coach accounts
- [ ] Manage multiple athletes
- [ ] Bulk plan creation
- [ ] Athlete progress dashboard
- [ ] Communication tools
- [ ] Payment integration

**Value:**
- B2B revenue
- Professional use case
- Market expansion

---

## 🐛 Technical Debt & Improvements

### 10. **Code Quality**
**Priority:** Ongoing  
**Estimated Time:** Continuous

**Tasks:**
- [ ] Add TypeScript
- [ ] Unit tests (Jest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Code documentation
- [ ] Error boundary components
- [ ] Loading state improvements
- [ ] Accessibility (WCAG 2.1)

---

### 11. **Performance Optimization**
**Priority:** Medium  
**Estimated Time:** 1-2 weeks

**Tasks:**
- [ ] Database indexing
- [ ] Query optimization
- [ ] Frontend code splitting
- [ ] Image optimization
- [ ] Caching strategy
- [ ] CDN for static assets
- [ ] Lazy loading

---

### 12. **Security Hardening**
**Priority:** HIGH  
**Estimated Time:** 1 week

**Tasks:**
- [ ] Security audit
- [ ] Rate limiting
- [ ] Input validation
- [ ] SQL injection prevention (already using prepared statements)
- [ ] XSS prevention
- [ ] CSRF tokens
- [ ] Helmet.js
- [ ] Content Security Policy

---

### 13. **DevOps & Infrastructure**
**Priority:** Medium  
**Estimated Time:** 1-2 weeks

**Tasks:**
- [ ] CI/CD pipeline
- [ ] Automated testing
- [ ] Staging environment
- [ ] Database backups
- [ ] Monitoring (Sentry, LogRocket)
- [ ] Analytics (Plausible, Mixpanel)
- [ ] Error tracking
- [ ] Uptime monitoring

---

## 💰 Monetization Features

### 14. **Subscription System**
**Priority:** HIGH (Before Public Launch)  
**Estimated Time:** 2 weeks

**Features:**
- [ ] Stripe integration
- [ ] Free tier (limited features)
- [ ] Pro tier ($10/month)
- [ ] Club tier ($50-100/month)
- [ ] Annual discounts
- [ ] Trial periods
- [ ] Billing dashboard

**Tiers:**
- **Free:** 1 training plan, basic analytics, 5 race tags
- **Pro:** Unlimited plans, advanced analytics, race strategy (individual)
- **Club:** Everything + team race strategy, multiple teams, coach mode

---

## 📊 Recommended Priority Order

### **Immediate (Next 2-4 Weeks)**
1. ✅ **Illness/Injury Tracking** - Quick win, high value
2. **Security Hardening** - Critical before growth
3. **Subscription System** - Required for monetization

### **Short Term (1-2 Months)**
4. **Club Race Strategy MVP** - Biggest opportunity
5. **Training Plan Improvements** - Core product quality
6. **Performance Optimization** - User experience

### **Medium Term (3-6 Months)**
7. **Club Race Strategy Phase 2** - Complete the feature
8. **Social Features** - Growth & retention
9. **Nutrition & Fueling** - Product expansion
10. **Mobile App** - Platform expansion

### **Long Term (6-12 Months)**
11. **Advanced Analytics** - Power users
12. **Coach Mode** - B2B expansion
13. **Integrations** - Ecosystem play

---

## 🎯 Success Metrics

### **User Metrics**
- Monthly Active Users (MAU)
- Daily Active Users (DAU)
- User retention (D1, D7, D30)
- Session duration
- Feature adoption rates

### **Business Metrics**
- MRR (Monthly Recurring Revenue)
- Conversion rate (free → paid)
- Churn rate
- Customer Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)

### **Product Metrics**
- Training plans created
- Races tagged
- Club races created
- Team members invited
- Strategies generated

---

## 🚀 Launch Strategy

### **Phase 1: Private Beta** (Current)
- Your personal use
- Close friends/family
- Bug fixing & iteration

### **Phase 2: Club Beta** (After Race Strategy MVP)
- Your race club
- 2-3 other local clubs
- Real-world testing
- Testimonials & case studies

### **Phase 3: Public Launch**
- Product Hunt launch
- Social media campaign
- Content marketing
- Referral program

### **Phase 4: Growth**
- Paid advertising
- Partnerships
- Influencer marketing
- SEO optimization

---

## 📝 Decision Points

### **Should We Build Illness/Injury Tracking Now?**
**Pros:**
- Quick to implement (1-2 weeks)
- High user value
- Improves Form & Fitness accuracy
- Complements existing features

**Cons:**
- Not a revenue driver
- Can wait until after monetization

**Recommendation:** ✅ **YES** - Build it now. It's quick, valuable, and improves core product quality.

---

### **Should We Prioritize Club Race Strategy?**
**Pros:**
- HUGE market opportunity
- First mover advantage
- Network effects
- High monetization potential
- You can test with your own club

**Cons:**
- Requires Intervals.icu API access
- Complex feature (4-6 weeks)
- Needs real-world testing

**Recommendation:** ✅ **YES** - But after:
1. Illness/Injury tracking (quick win)
2. Security hardening (critical)
3. Basic subscription system (monetization)

**Timeline:** Start in ~3-4 weeks

---

## 🎓 Learning & Iteration

**Weekly:**
- Review user feedback
- Track metrics
- Bug fixes
- Small improvements

**Monthly:**
- Feature releases
- Performance review
- Roadmap adjustments
- User interviews

**Quarterly:**
- Major feature launches
- Business review
- Strategy adjustments
- Market analysis

---

## 📞 Next Steps

1. **Decide:** Build Illness/Injury tracking now?
2. **Plan:** If yes, create detailed spec
3. **Build:** Implement in 1-2 weeks
4. **Test:** Validate with your own data
5. **Ship:** Deploy to production
6. **Move to next:** Security → Subscriptions → Club Race Strategy

---

**What would you like to tackle first?**

- A) Illness/Injury Tracking (1-2 weeks, high value)
- B) Jump straight to Club Race Strategy (4-6 weeks, huge opportunity)
- C) Security & Subscriptions first (2-3 weeks, critical for launch)
- D) Something else from the backlog

Let me know and we'll create a detailed implementation plan! 🚀
