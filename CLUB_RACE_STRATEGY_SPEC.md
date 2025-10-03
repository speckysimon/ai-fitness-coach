# Club Race Strategy Feature - Product Specification

**Status:** Planning Phase  
**Priority:** High (after technical debt cleanup)  
**Target Launch:** 4-6 weeks  
**Unique Value:** First AI-powered team race strategy platform

---

## 🎯 Vision

**Enable cycling clubs to win more races through AI-powered team strategy and coordination.**

Transform individual training into coordinated team tactics. Analyze each rider's strengths, assign optimal roles, and generate synchronized race plans that maximize team performance.

---

## 🏆 Market Opportunity

### **The Gap**

**Existing Solutions:**
- **TrainingPeaks:** Individual training only, no team features
- **Strava:** Social sharing, no race strategy
- **Zwift:** Group rides, no real-world race planning
- **Best Bike Split:** Individual pacing, no team coordination
- **Coaching Apps:** Manual, expensive, not AI-powered

**Our Solution:**
- ✅ AI-powered team race strategy
- ✅ Automated role assignment
- ✅ Coordinated pacing plans
- ✅ Post-race analysis
- ✅ Affordable for amateur clubs

### **Market Size**

**Target Audience:**
- Cycling clubs: 50,000+ worldwide
- Amateur racing teams: 100,000+ teams
- Gran Fondo groups: Unlimited
- Corporate cycling teams: Growing market

**Potential Users:**
- Average club: 20-50 members
- 1,000 clubs = 20,000-50,000 users
- Viral coefficient: 1 user → 10-50 teammates

---

## 💡 Core Features

### **Phase 1: MVP (Weeks 1-4)**

#### **1. Create Race Event**
**User Story:** As a club captain, I want to create a race event so my team can plan strategy together.

**Features:**
- Race name and date
- GPX route upload
- Race description
- Invite members (email/username)
- Public or private event

**UI:**
```
┌─────────────────────────────────────┐
│  Create Club Race Event              │
├─────────────────────────────────────┤
│  Race Name: [Club Championship 2025] │
│  Date: [Oct 15, 2025]                │
│  Route: [Upload GPX] ✓ uploaded     │
│  Description: [...]                  │
│                                      │
│  Invite Members:                     │
│  [john@email.com] [+ Add]            │
│  [sarah_cyclist] [+ Add]             │
│                                      │
│  Privacy: ○ Public  ● Private        │
│                                      │
│  [Cancel] [Create Race Event]        │
└─────────────────────────────────────┘
```

---

#### **2. Team Assembly & Analysis**
**User Story:** As a team member, I want to join a race event and have my strengths analyzed.

**Features:**
- Accept race invitation
- Auto-import rider profile from Intervals.icu/Strava
- Display team roster
- Show each rider's key metrics

**Data Collected:**
```javascript
{
  rider: {
    name: "John Doe",
    ftp: 280,
    weight: 70,
    wkg: 4.0,
    powerCurve: {
      "5s": 1200,
      "1min": 450,
      "5min": 320,
      "20min": 280
    },
    fitness: {
      ctl: 85,    // Fitness
      atl: 95,    // Fatigue
      tsb: -10    // Form
    },
    strengths: ["Climbing", "Endurance"],
    weaknesses: ["Sprinting"]
  }
}
```

---

#### **3. AI Role Assignment**
**User Story:** As a team, we want AI to assign optimal roles based on our strengths.

**Algorithm:**
```javascript
const assignRole = (rider, team, course) => {
  // Analyze rider capabilities
  const wkg = rider.ftp / rider.weight;
  const sprintPower = rider.powerCurve["5s"];
  const vo2max = rider.powerCurve["5min"];
  const endurance = rider.fitness.ctl;
  const form = rider.fitness.tsb;
  
  // Analyze course demands
  const climbingDemand = analyzeCourse(course).elevation;
  const sprintOpportunities = analyzeCourse(course).flatSections;
  
  // Role assignment logic
  if (wkg > 4.5 && form > 0 && climbingDemand > 1000) {
    return {
      role: "Team Leader",
      type: "Climber",
      priority: 1,
      description: "Attack on climbs, aim for podium"
    };
  }
  
  if (sprintPower > 1200 && form > -5 && sprintOpportunities > 0) {
    return {
      role: "Sprinter",
      type: "Finisher",
      priority: 2,
      description: "Stay fresh for final sprint"
    };
  }
  
  if (endurance > 100 && vo2max > 300) {
    return {
      role: "Domestique",
      type: "Support",
      priority: 3,
      description: "Control pace, protect leaders"
    };
  }
  
  // ... more roles
};
```

**Roles:**
- 👑 **Team Leader** - Best overall, aims for podium
- 🚀 **Sprinter** - High peak power, finishes race
- 🏔️ **Climber** - High W/kg, attacks on climbs
- 💪 **Domestique** - High endurance, supports team
- ⚡ **Breakaway Specialist** - High threshold + endurance
- 🛡️ **Protector** - Shields leader from wind

---

#### **4. AI Strategy Generation**
**User Story:** As a team, we want a coordinated race plan that tells each rider what to do and when.

**AI Prompt:**
```
You are an expert cycling race strategist. Analyze this team and course:

TEAM:
- Sarah: FTP 280W, 4.2 W/kg, Role: Team Leader (Climber)
- Tom: FTP 250W, 1200W sprint, Role: Sprinter
- John: FTP 270W, CTL 110, Role: Domestique
- Mike: FTP 260W, CTL 105, Role: Domestique

COURSE:
- Distance: 85km
- Elevation: 1200m
- Key climbs: Km 15-25 (10km, 6% avg)
- Finish: Flat sprint

WEATHER:
- Temperature: 22°C
- Wind: 15 km/h headwind on climb

Generate a detailed race strategy with:
1. Team tactics for each segment
2. Individual pacing plans
3. Attack points
4. Communication cues
5. Contingency plans

Format as structured JSON.
```

**AI Output:**
```json
{
  "strategy": {
    "overview": "Protect Sarah for climb, Tom for sprint",
    "keyPoints": [
      "Km 20: Sarah attacks on climb",
      "Km 40: Regroup for sprint",
      "Km 85: Tom leads out sprint"
    ]
  },
  "segments": [
    {
      "km": "0-15",
      "terrain": "Flat approach",
      "teamTactics": "John and Mike control pace at front",
      "riders": {
        "Sarah": {
          "power": "200W (Zone 2)",
          "position": "Middle of pack",
          "notes": "Stay protected, save energy"
        },
        "Tom": {
          "power": "190W (Zone 2)",
          "position": "Behind Sarah",
          "notes": "Minimal effort, stay fresh"
        },
        "John": {
          "power": "220W (Zone 3)",
          "position": "Front, pulling",
          "notes": "Control pace, block attacks"
        },
        "Mike": {
          "power": "220W (Zone 3)",
          "position": "Front, rotating",
          "notes": "Share workload with John"
        }
      }
    },
    {
      "km": "15-25",
      "terrain": "Main climb (10km, 6%)",
      "teamTactics": "Sarah attacks at km 20, others pace steady",
      "riders": {
        "Sarah": {
          "power": "240W until km 20, then 260W attack",
          "position": "Move to front at km 18",
          "notes": "Attack when gradient hits 8%, sustain to top"
        },
        "Tom": {
          "power": "210W (Zone 3)",
          "position": "Climb at own pace",
          "notes": "Don't chase Sarah, minimize losses"
        },
        "John": {
          "power": "230W (Zone 3)",
          "position": "Pace Sarah until km 20",
          "notes": "Lead Sarah to attack point, then recover"
        },
        "Mike": {
          "power": "230W (Zone 3)",
          "position": "Cover counter-attacks",
          "notes": "If anyone chases Sarah, follow"
        }
      }
    }
    // ... more segments
  ],
  "contingencies": [
    {
      "scenario": "Sarah has bad day",
      "plan": "Switch to Tom sprint strategy, all support him"
    },
    {
      "scenario": "Early breakaway",
      "plan": "Mike bridges, others control pace"
    }
  ]
}
```

---

#### **5. Individual Race Plans**
**User Story:** As a rider, I want my personal race plan that I can follow during the race.

**Features:**
- Downloadable PDF cue sheet
- Export to bike computer (.FIT, .ERG)
- Mobile-friendly view
- Printable format

**Example Plan (Sarah):**
```
┌─────────────────────────────────────┐
│  RACE PLAN: Sarah Johnson           │
│  Role: Team Leader (Climber)        │
│  Club Championship 2025              │
├─────────────────────────────────────┤
│                                      │
│  🎯 YOUR MISSION:                    │
│  Attack on main climb (km 20),       │
│  aim for podium finish               │
│                                      │
│  📊 KEY METRICS:                     │
│  FTP: 280W | W/kg: 4.2 | Form: +5    │
│                                      │
│  🗺️ RACE SEGMENTS:                   │
│                                      │
│  Km 0-15: Flat Approach              │
│  ⚡ Power: 200W (Zone 2)             │
│  📍 Position: Middle of pack         │
│  💬 Stay protected behind John/Mike  │
│  🥤 Sip water every 5 min            │
│                                      │
│  Km 15-25: MAIN CLIMB ⭐             │
│  ⚡ Power: 240W → 260W at km 20      │
│  📍 Move to front at km 18           │
│  💬 ATTACK when gradient hits 8%     │
│  🥤 Gel at km 20                     │
│  🎯 Sustain effort to summit         │
│                                      │
│  Km 25-40: Rolling terrain           │
│  ⚡ Power: 220W (Zone 3)             │
│  📍 Stay in lead group               │
│  💬 Work with others if needed       │
│                                      │
│  Km 40-85: Regroup & Sprint          │
│  ⚡ Power: 200W recovery             │
│  📍 Help Tom position for sprint     │
│  💬 Lead him to final km             │
│                                      │
│  ⚠️ IF THINGS GO WRONG:              │
│  • Bad legs? Signal team, switch     │
│    to Plan B (support Tom)           │
│  • Mechanical? Team waits at top     │
│    of climb                          │
│                                      │
│  📞 TEAM COMMUNICATION:               │
│  • Hand signals for attacks          │
│  • Shout "GO!" for sprint leadout    │
│                                      │
└─────────────────────────────────────┘

[Download PDF] [Export to Garmin]
```

---

### **Phase 2: Enhanced Features (Weeks 5-8)**

#### **6. Post-Race Analysis**
**Features:**
- Upload all team activities
- Compare plan vs execution
- Team performance metrics
- AI insights and learnings

**Analysis:**
```
┌─────────────────────────────────────┐
│  POST-RACE ANALYSIS                  │
│  Club Championship 2025 - Results    │
├─────────────────────────────────────┤
│                                      │
│  🏆 TEAM RESULTS:                    │
│  Sarah: 2nd place ⭐                 │
│  Tom: 8th place                      │
│  John: 15th place                    │
│  Mike: 12th place                    │
│                                      │
│  📊 STRATEGY ADHERENCE:               │
│  Overall: 85% ✅                     │
│  - Sarah: 95% (excellent)            │
│  - Tom: 80% (good)                   │
│  - John: 85% (good)                  │
│  - Mike: 80% (went too hard early)   │
│                                      │
│  🤖 AI INSIGHTS:                     │
│                                      │
│  ✅ What Worked:                     │
│  • Sarah's attack at km 20 was       │
│    perfectly timed                   │
│  • John's pacing protected Sarah     │
│    effectively                       │
│  • Team positioning was excellent    │
│                                      │
│  ⚠️ What Didn't Work:                │
│  • Mike went 15W too hard on climb   │
│    (faded in final 20km)             │
│  • Tom lost Sarah's wheel on climb   │
│    (cost 2 minutes)                  │
│  • Sprint leadout started too early  │
│                                      │
│  💡 LESSONS FOR NEXT RACE:           │
│  • Mike: More conservative on climbs │
│  • Tom: Practice climbing at race    │
│    pace                              │
│  • Team: Start sprint leadout at     │
│    500m, not 1km                     │
│                                      │
│  📈 PERFORMANCE vs PLAN:              │
│  [Chart showing planned vs actual    │
│   power for each rider]              │
│                                      │
└─────────────────────────────────────┘
```

---

#### **7. Team Chat & Communication**
**Features:**
- In-app messaging
- Pre-race discussion
- Strategy adjustments
- Post-race debrief

---

#### **8. Season Planning**
**Features:**
- Multiple races
- Season goals
- Team development tracking
- Performance trends

---

## 🔧 Technical Implementation

### **Data Sources**

#### **Primary: Intervals.icu API** (Recommended)
**Pros:**
- Better data quality (FTP, power curve, fitness metrics)
- Higher rate limits
- Already aggregates Strava data
- Free for personal use

**API Endpoints:**
```javascript
// Get athlete data
GET /api/v1/athlete/{id}

// Get power curve
GET /api/v1/athlete/{id}/power-curve

// Get activities
GET /api/v1/athlete/{id}/activities

// Get fitness (CTL, ATL, TSB)
GET /api/v1/athlete/{id}/wellness
```

**Authentication:**
- OAuth 2.0 flow
- Request commercial API access from David (creator)

---

#### **Secondary: Strava API + Webhooks**
**For users without Intervals.icu:**
- Use Strava webhooks for real-time updates
- Calculate metrics ourselves
- Less accurate but more accessible

---

### **Database Schema**

```sql
-- Club Races
CREATE TABLE club_races (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  gpx_data TEXT,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Race Participants
CREATE TABLE race_participants (
  id INTEGER PRIMARY KEY,
  race_id INTEGER REFERENCES club_races(id),
  user_id INTEGER REFERENCES users(id),
  role TEXT, -- 'Team Leader', 'Sprinter', etc.
  role_type TEXT, -- 'Climber', 'Finisher', 'Support'
  priority INTEGER,
  status TEXT DEFAULT 'invited', -- 'invited', 'accepted', 'declined'
  joined_at DATETIME
);

-- Race Strategy
CREATE TABLE race_strategies (
  id INTEGER PRIMARY KEY,
  race_id INTEGER REFERENCES club_races(id),
  strategy_json TEXT, -- Full AI-generated strategy
  generated_at DATETIME,
  version INTEGER DEFAULT 1
);

-- Individual Race Plans
CREATE TABLE individual_race_plans (
  id INTEGER PRIMARY KEY,
  race_id INTEGER REFERENCES club_races(id),
  user_id INTEGER REFERENCES users(id),
  plan_json TEXT, -- Individual rider plan
  generated_at DATETIME
);

-- Post-Race Results
CREATE TABLE race_results (
  id INTEGER PRIMARY KEY,
  race_id INTEGER REFERENCES club_races(id),
  user_id INTEGER REFERENCES users(id),
  strava_activity_id TEXT,
  placement INTEGER,
  adherence_score REAL, -- How well they followed plan
  analysis_json TEXT, -- AI analysis
  uploaded_at DATETIME
);
```

---

### **API Endpoints**

```javascript
// Create race
POST /api/club-races
Body: { name, date, gpxData, description, isPublic }

// Invite members
POST /api/club-races/:id/invite
Body: { emails: [...], usernames: [...] }

// Join race
POST /api/club-races/:id/join

// Generate strategy
POST /api/club-races/:id/generate-strategy
Returns: { strategy, individualPlans }

// Get race details
GET /api/club-races/:id

// Upload race result
POST /api/club-races/:id/results
Body: { stravaActivityId }

// Get post-race analysis
GET /api/club-races/:id/analysis
```

---

### **AI Integration**

```javascript
// services/clubRaceStrategyService.js

const generateTeamStrategy = async (race, participants) => {
  // 1. Analyze course
  const courseAnalysis = await analyzeGPX(race.gpxData);
  
  // 2. Analyze team
  const teamAnalysis = participants.map(p => ({
    name: p.name,
    ftp: p.ftp,
    weight: p.weight,
    wkg: p.ftp / p.weight,
    powerCurve: p.powerCurve,
    fitness: p.fitness,
    recentForm: calculateForm(p.activities)
  }));
  
  // 3. Assign roles
  const roles = await assignRoles(teamAnalysis, courseAnalysis);
  
  // 4. Generate strategy with OpenAI
  const prompt = buildStrategyPrompt(race, teamAnalysis, roles, courseAnalysis);
  const strategy = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an expert cycling race strategist..."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }
  });
  
  // 5. Generate individual plans
  const individualPlans = generateIndividualPlans(strategy, participants);
  
  return { strategy, individualPlans };
};
```

---

## 🎨 User Experience Flow

### **1. Club Captain Creates Race**
```
Dashboard → Club Races → Create New Race
→ Fill form → Upload GPX → Invite members
→ Race created, invitations sent
```

### **2. Members Join**
```
Email notification → Click join link
→ Review race details → Accept invitation
→ Profile auto-imported from Intervals.icu
→ Added to team roster
```

### **3. AI Generates Strategy**
```
Captain clicks "Generate Strategy"
→ AI analyzes team + course (30 seconds)
→ Roles assigned automatically
→ Strategy displayed
→ Individual plans available
```

### **4. Members Review Plans**
```
Member views their individual plan
→ Download PDF cue sheet
→ Export to Garmin (.FIT file)
→ Print for race day
```

### **5. Race Day**
```
Members execute strategy
→ Follow individual plans
→ Coordinate as team
```

### **6. Post-Race**
```
Members upload Strava activities
→ AI analyzes performance
→ Compares plan vs execution
→ Generates insights
→ Team reviews together
```

---

## 📊 Success Metrics

### **MVP Success Criteria:**
- ✅ 10+ club members onboarded
- ✅ 1 race strategy generated
- ✅ Strategy executed in real race
- ✅ Post-race analysis completed
- ✅ Positive feedback from team

### **Growth Metrics:**
- Number of clubs using feature
- Number of races created per month
- Average team size
- Strategy adherence rate
- Win rate improvement
- User retention (team stickiness)

### **Quality Metrics:**
- Strategy adherence: >80%
- User satisfaction: >4.5/5
- Time to generate strategy: <1 minute
- Plan accuracy: >85%

---

## 💰 Monetization Strategy

### **Free Tier:**
- 1 race per month
- Max 5 team members
- Basic strategy
- PDF export only

### **Pro Tier ($10/month):**
- Unlimited races
- Unlimited team members
- Advanced strategy
- All export formats (.FIT, .ERG, .ZWO)
- Post-race analysis
- Team chat

### **Club Tier ($50-100/month):**
- Everything in Pro
- Multiple teams
- Season planning
- Coach dashboard
- Priority support
- Custom branding

### **Revenue Projection:**
- 100 clubs × $75/month = $7,500/month
- 1,000 clubs × $75/month = $75,000/month
- 10,000 clubs × $75/month = $750,000/month

---

## 🚀 Go-to-Market Strategy

### **Phase 1: Beta (Your Club)**
- Onboard your race club
- Test with real races
- Gather feedback
- Iterate quickly

### **Phase 2: Local Expansion**
- Invite 5-10 nearby clubs
- Offer free Pro tier for 3 months
- Collect testimonials
- Build case studies

### **Phase 3: Viral Growth**
- Launch referral program
- "Invite your club, get 1 month free"
- Social sharing of race results
- Strava club integration

### **Phase 4: Partnerships**
- Partner with cycling clubs/federations
- Sponsor local races
- Content marketing (race strategy guides)
- Influencer partnerships

---

## 🎯 Competitive Advantages

### **Why We'll Win:**

1. **First Mover** - Nobody has AI team race strategy
2. **Network Effects** - Teams bring teams
3. **Data Quality** - Intervals.icu integration
4. **AI Expertise** - Already using OpenAI effectively
5. **Real Testing** - Your club validates the product
6. **Cycling Knowledge** - You understand the sport
7. **Technical Moat** - Hard to replicate

### **Barriers to Entry:**
- Requires rider profile data
- Requires AI/ML expertise
- Requires cycling domain knowledge
- Requires social/team features
- Requires GPX analysis capability

**Estimated time for competitor to build:** 12-18 months

---

## 📅 Development Timeline

### **Week 1: Intervals.icu Integration**
- [ ] OAuth flow
- [ ] Fetch athlete data
- [ ] Store in database
- [ ] Display in profile

### **Week 2: Club Race Creation**
- [ ] Create race page
- [ ] GPX upload
- [ ] Invite system
- [ ] Team roster display

### **Week 3: AI Strategy**
- [ ] Role assignment algorithm
- [ ] OpenAI strategy generation
- [ ] Individual plan creation
- [ ] Export functionality

### **Week 4: Testing & Polish**
- [ ] Beta test with your club
- [ ] Bug fixes
- [ ] UI/UX improvements
- [ ] Documentation

### **Week 5-8: Enhanced Features**
- [ ] Post-race analysis
- [ ] Team chat
- [ ] Season planning
- [ ] Mobile optimization

---

## 🔒 Risk Mitigation

### **Risk 1: Intervals.icu API Access**
**Mitigation:** 
- Contact David early for commercial permission
- Fallback to Strava API if needed
- Build abstraction layer for multiple data sources

### **Risk 2: Strategy Quality**
**Mitigation:**
- Test with real races
- Gather expert feedback
- Iterate on AI prompts
- Allow manual adjustments

### **Risk 3: User Adoption**
**Mitigation:**
- Start with your club (guaranteed users)
- Free tier to reduce barrier
- Clear value proposition
- Viral referral mechanics

### **Risk 4: Scaling Costs**
**Mitigation:**
- Cache AI-generated strategies
- Optimize API calls
- Tiered pricing covers costs
- Strava webhooks reduce polling

---

## 📚 Resources Needed

### **Technical:**
- Intervals.icu API documentation
- OpenAI API (already have)
- GPX parsing library (already have)
- Export libraries (.FIT, .ERG, .ZWO)

### **Testing:**
- Your race club (10-20 members)
- Upcoming race events
- Real GPX files
- Feedback sessions

### **Design:**
- Race creation flow mockups
- Strategy display designs
- Individual plan templates
- Mobile-responsive layouts

---

## 🎓 Learning & Iteration

### **Beta Testing Questions:**
1. Is the strategy realistic and helpful?
2. Are the roles assigned correctly?
3. Is the individual plan easy to follow?
4. Did the team coordinate effectively?
5. What would make this more valuable?

### **Metrics to Track:**
- Strategy generation time
- User engagement with plans
- Race day execution rate
- Post-race upload rate
- Team satisfaction scores

### **Iteration Cycle:**
- Weekly feedback sessions
- Bi-weekly feature updates
- Monthly strategy improvements
- Quarterly major releases

---

## 🌟 Vision for the Future

**Year 1:**
- 100 clubs using the platform
- 2,000 active users
- 500 races planned
- Proven ROI (teams winning more)

**Year 2:**
- 1,000 clubs
- 20,000 active users
- International expansion
- Mobile app launch
- Coach mode for team managers

**Year 3:**
- 10,000 clubs
- 200,000 active users
- Market leader in team race strategy
- Acquisition target for Strava/TrainingPeaks
- Or... IPO path 🚀

---

**This feature could transform your app from a personal training tool into THE platform for cycling clubs worldwide.**

---

**Last Updated:** October 3, 2025  
**Status:** Ready for Development  
**Next Step:** Fix technical debt, then build MVP
