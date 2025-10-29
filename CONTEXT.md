# RiderLabs - Project Context

**Last Updated:** October 29, 2025  
**Version:** 2.6.0  
**Status:** Alpha Testing (Production Live)

---

## 🔬 What is RiderLabs?

**RiderLabs** is a data-driven cycling performance platform that uses artificial intelligence to analyze training history, generate personalized training plans, and provide race-day strategies with post-race analysis — creating a complete learning loop that makes cyclists faster.

**Tagline:** *"Where Performance is Engineered"*

---

## 🎯 Mission Statement

**Empower cyclists to achieve their peak performance through AI-powered training intelligence that was previously only available to professional athletes with dedicated coaches.**

We democratize access to world-class coaching by combining cutting-edge AI (GPT-4) with deep cycling science, delivering personalized training that adapts to your reality.

---

## 🌟 Vision

**Become the world's leading AI-powered platform for cycling training and performance optimization.**

We envision a future where every cyclist—from weekend warriors to amateur racers—has access to intelligent, adaptive coaching that continuously learns and improves.

---

## 💡 Core Value Proposition

### **The Problem We Solve:**
- Professional coaching is expensive ($200-500/month)
- Generic training plans don't adapt to your reality
- Race strategies require expertise most cyclists don't have
- No systematic way to learn from past performances
- Training data exists but isn't actionable

### **Our Solution:**
1. **AI Training Plans** - Personalized, adaptive plans that respond to your actual training
2. **Race Day Intelligence** - GPX-based race analysis with segment-by-segment pacing
3. **Post-Race Learning** - AI analysis that closes the feedback loop
4. **Manual Activity Tracking** - Complete training picture (Strava + gym/yoga/strength)
5. **Activity Matching** - Automatic verification of plan adherence
6. **Performance Analytics** - Deep insights into fitness, form, and progression

---

## 🏗️ Technical Architecture

### **Stack:**
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Database:** SQLite (with dual-write to localStorage for backward compatibility)
- **AI:** OpenAI GPT-4 Turbo
- **Integrations:** Strava API, Google Calendar API, OpenWeather API
- **Deployment:** DigitalOcean Droplet + Nginx + PM2 + SSL (Let's Encrypt)
- **Domain:** riderlabs.io

### **Key Features:**
- Real-time dashboard with training metrics
- AI-powered training plan generation (4-16 weeks)
- Race day form predictor (CTL/ATL/TSB analysis)
- GPX route analysis for race strategy
- Post-race analysis with AI insights
- Manual activity logging (14 sport types)
- Google Calendar sync
- Dark mode support
- Mobile-responsive design
- Timezone-aware AI interactions

---

## 📊 Current Status (v2.6.0)

### **Production Features:**
✅ Strava integration with OAuth  
✅ AI training plan generation  
✅ Race day predictor (CTL/ATL/TSB)  
✅ GPX race analysis  
✅ Post-race analysis with learning loop  
✅ Activity matching (automatic + manual)  
✅ Manual activity system (gym, yoga, strength)  
✅ Google Calendar export  
✅ FTP history tracking  
✅ Form & Fitness (CTL/ATL/TSB graphs)  
✅ Adaptive plan adjustments (natural language)  
✅ Coach avatar system (5 personas)  
✅ Timezone awareness  
✅ Weather widget  
✅ Analytics (Plausible)  
✅ Feedback widget  
✅ Database backend (SQLite)  
✅ Dark mode  
✅ Mobile workout view  

### **Known Issues:**
🔴 Training plan generation not working (OpenAI API suspected)  
🔴 Manual activity edit not saving  

### **In Progress:**
🟡 Comprehensive testing  
🟡 Performance optimization  
🟡 Security hardening  

---

## 👥 Target Users

### **Primary:**
- Amateur cyclists training for events (Gran Fondos, centuries, races)
- Cycling club members
- Age-group racers
- Self-coached athletes

### **User Persona:**
- **Age:** 25-55
- **Experience:** Intermediate to advanced cyclists
- **Goals:** Event preparation, performance improvement
- **Tech-savvy:** Uses Strava, bike computer, power meter
- **Budget:** Can't afford $200-500/month coach
- **Motivation:** Data-driven, wants to understand "why"

---

## 🎯 Competitive Positioning

### **vs. TrainingPeaks:**
- ✅ AI-generated plans (TP: manual templates)
- ✅ Free tier (TP: $129/year minimum)
- ✅ Race strategy (TP: none)
- ✅ Post-race learning loop (TP: none)

### **vs. Strava:**
- ✅ Training plans (Strava: none)
- ✅ AI coaching (Strava: social only)
- ✅ Race analysis (Strava: basic stats)

### **vs. Best Bike Split:**
- ✅ Training plans (BBS: none)
- ✅ Post-race learning (BBS: none)
- ✅ Free tier (BBS: $10/month)

### **vs. Human Coaches:**
- ✅ $0-10/month (Coaches: $200-500/month)
- ✅ Instant feedback (Coaches: delayed)
- ✅ 24/7 availability (Coaches: limited)
- ❌ Personal relationship (Coaches: strong)
- ❌ Nuanced judgment (Coaches: better)

**Our Niche:** AI-powered coaching for self-motivated cyclists who want professional-level intelligence at amateur prices.

---

## 💰 Business Model (Planned)

### **Freemium Strategy:**

**Free Tier:**
- 1 training plan per month
- Basic race analysis
- Activity matching
- Manual activity logging
- Community features

**Pro Tier ($10/month):**
- Unlimited training plans
- Advanced race strategies
- GPX export to bike computer
- Post-race analysis
- Weather integration
- Priority support

**Club Tier ($50/month):**
- Team race strategy (future)
- Multiple riders
- Season planning
- Coach dashboard

---

## 🚀 Development Roadmap

### **Phase 1: Core Platform** ✅ (Complete)
- Individual training plans
- Race day preparation
- Activity tracking
- Performance analytics

### **Phase 2: Learning Loop** ✅ (Complete)
- Post-race analysis
- Adaptive plan adjustments
- Manual activity tracking
- Database backend

### **Phase 3: Polish & Scale** 🎯 (Current)
- Bug fixes and testing
- Performance optimization
- Security hardening
- User onboarding

### **Phase 4: Advanced Features** 🔮 (Future)
- Real-time race execution mode
- Team collaboration
- Strava webhooks
- Mobile app (PWA)
- Multi-sport support

---

## 📈 Success Metrics

### **User Success:**
- Training plan completion rate >70%
- Race performance improvement >10%
- User satisfaction >4.5/5 stars
- Weekly active users >80%

### **Business Success:**
- 100 active users (Year 1, Month 6)
- 1,000 active users (Year 1, Month 12)
- 10,000 active users (Year 2)
- 10% conversion to paid (Year 2)
- Profitable by Month 18

### **Technical Success:**
- Plan generation time <30 seconds
- Activity matching accuracy >85%
- Uptime >99.5%
- Page load time <2 seconds

---

## 🛠️ Development Principles

### **1. AI-First**
Every feature should leverage AI to provide intelligence, not just automation.

### **2. User Reality**
Plans must adapt to life's realities (missed sessions, illness, schedule changes).

### **3. Transparency**
Always explain why the AI recommends what it does.

### **4. Simplicity**
Complex algorithms, simple interface. Hide complexity from users.

### **5. Data-Driven**
Make decisions based on user data and feedback, not assumptions.

### **6. Continuous Learning**
The AI should get smarter with every race, every session, every user.

---

## 🔐 Privacy & Security

### **Data Handling:**
- User data stored in SQLite database
- Strava OAuth for secure authentication
- No data selling or third-party sharing
- GDPR-compliant data practices
- Users can export/delete their data

### **API Keys:**
- All keys stored in `.env` (not committed)
- Strava tokens refreshed automatically
- OpenAI API calls rate-limited
- Weather API cached (30 min)

---

## 🎨 Brand Identity

### **Name:** RiderLabs
**Meaning:** "Rider" (cycling) + "Labs" (data science, experimentation, engineering)

### **Tagline:** "Where Performance is Engineered"

### **Logo:** 🔬 (Microscope - represents scientific approach)

### **Colors:**
- Primary: Lab Blue (#2563EB)
- Secondary: Cyan (#06B6D4)
- Accent: Purple (#9333EA)
- Gradient: Blue-to-Purple

### **Voice & Tone:**
- Professional but approachable
- Data-driven but not robotic
- Motivational but realistic
- Technical but accessible

---

## 📚 Key Documentation

### **Technical:**
- `README.md` - Setup and installation
- `SETUP_GUIDE.md` - Detailed configuration
- `DEPLOYMENT.md` - Production deployment
- `QUICK_RUN.md` - Development commands
- `SCALING_STRATEGY.md` - Growth planning

### **Product:**
- `ROADMAP.md` - Feature priorities
- `TODO.md` - Current tasks
- `CHANGELOG.md` - Version history
- `MISSION_STATEMENT.md` - Vision and values

### **Features:**
- `MANUAL_ACTIVITY_SYSTEM.md` - Manual activity docs
- `ADAPTIVE_PLAN_FEATURES.md` - Plan adjustment docs
- `POST_RACE_IMPLEMENTATION_GUIDE.md` - Race analysis docs
- `WEATHER_WIDGET_IMPLEMENTATION.md` - Weather feature docs

---

## 🤝 Integrations & Compliance

### **Third-Party Services:**
- **Strava®** - Activity data (compliant, trademarked)
- **Google Calendar™** - Workout export (compliant, trademarked)
- **Zwift®** - Workout recommendations (compliant, trademarked)
- **OpenWeather** - Weather data (API key required)
- **Plausible** - Privacy-friendly analytics

### **Legal:**
- Terms of Service (includes trademark disclaimers)
- Privacy Policy (GDPR-compliant)
- Not affiliated with Strava, Zwift, or Google
- Informational use only for third-party services

---

## 🧪 Testing Strategy

### **Alpha Testing (Current):**
- Single user (developer) testing
- Real-world usage
- Bug identification and fixing
- Feature validation

### **Beta Testing (Next):**
- 10-20 invited users
- Structured feedback collection
- Performance monitoring
- Iteration based on feedback

### **Public Launch:**
- Soft launch to cycling communities
- Gradual user growth
- Continuous monitoring
- Regular updates

---

## 🌍 Future Vision

### **3 Years:**
- 10,000+ active users
- Market leader in AI cycling coaching
- Profitable and sustainable
- Team collaboration features

### **5 Years:**
- 100,000+ users across multiple sports
- Platform for coaches to manage athletes
- International expansion
- Mobile app (iOS/Android)

### **10 Years:**
- The standard platform for amateur endurance sports
- AI that rivals professional coaches
- Global community of millions
- Transforming how people train and compete

---

## 📞 Contact & Links

**Website:** https://riderlabs.io  
**GitHub:** https://github.com/speckysimon/ai-fitness-coach  
**Email:** [To be set up]  
**Support:** [To be set up]

---

## 🏁 Current Focus (October 2025)

### **Immediate Priorities:**
1. Fix training plan generation (OpenAI API issue)
2. Fix manual activity edit bug
3. Comprehensive testing of all features
4. Performance optimization
5. Security hardening

### **This Week:**
- Debug and fix critical bugs
- Test all user flows
- Monitor production performance
- Gather initial user feedback

### **This Month:**
- Achieve stable alpha version
- Begin beta user recruitment
- Implement user onboarding
- Add help documentation

---

**RiderLabs Team**  
*Train Smarter. Race Faster. Perform Better.*

---

*"The best time to plant a tree was 20 years ago. The second best time is now."*

**The best time to build the future of cycling coaching is now.** 🚴‍♂️🔬
