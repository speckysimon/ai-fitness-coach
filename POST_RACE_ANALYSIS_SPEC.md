# Post-Race Analysis Feature - Product Specification

**Status:** Planning Phase  
**Priority:** High (completes the race lifecycle)  
**Target Launch:** 2-3 weeks  
**Unique Value:** Close the learning loop from preparation → execution → improvement

---

## 🎯 The Gap

### **Current State:**
✅ Race Day Predictor (pre-race)  
✅ AI race plan generation  
✅ Pacing strategy  
❌ **Post-race analysis** ← MISSING  
❌ **Learning from races** ← MISSING  
❌ **Historical comparison** ← MISSING  

### **The Problem:**
Athletes don't learn from races systematically. They rely on memory and gut feeling.

### **The Solution:**
Complete the race lifecycle: **Predict → Execute → Analyze → Learn → Improve**

---

## 🚀 Core Features

### **1. Race Activity Detection**
- Auto-detect race activities from Strava
- Manual "Mark as Race" button
- Link to race plan (if generated)

### **2. Rider Feedback Collection**
Quick post-race survey:
- Overall feeling (1-5 stars)
- Plan adherence (yes/mostly/no)
- What went well (free text)
- What didn't go well (free text)
- Lessons learned
- Placement (optional)

### **3. AI Performance Analysis**
GPT-4 analyzes:
- Plan vs. execution comparison
- Power/HR data analysis
- Pacing evaluation
- Tactical decisions
- Rider feedback integration

**AI Output:**
- Overall assessment
- What went well (5 points)
- What didn't go well (5 points)
- Key insights (3 observations)
- Recommendations for next race (5 items)
- Training focus areas (3 areas)
- Performance scores (overall, pacing, execution, tactical)

### **4. Plan vs. Execution Comparison**
- Side-by-side power comparison
- Segment breakdown
- Time analysis
- Zone distribution
- Charts (planned vs actual)

### **5. Historical Race Database**
Store all race data:
- Performance metrics
- Results (placement)
- Weather conditions
- Rider state (FTP, form)
- Feedback
- AI analysis

### **6. Historical Comparison**
- View all past races
- Performance trends over time
- Improvement tracking
- Similar race comparison

### **7. Learning Loop Integration**
- Update rider profile based on results
- Refine future race predictions
- Adjust training plans
- Identify patterns and trends

---

## 📊 Example Analysis Output

```
🏆 RACE ANALYSIS
Club Championship - Oct 15, 2025
2nd Place • 85km • 2:15:32

📊 PERFORMANCE SUMMARY
Overall Score: 85/100 ⭐⭐⭐⭐
• Pacing: 70/100
• Execution: 90/100
• Tactics: 75/100

🤖 AI ASSESSMENT
Strong performance with 2nd place finish. Exceeded power 
targets but pacing needs refinement. Excellent climbing 
execution but faded in final 20km due to early intensity.

✅ WHAT WENT WELL
• Climb execution excellent - 270W vs 260W planned
• Finished 4:28 faster than estimated
• Good positioning throughout
• Nutrition timing on point
• Strong form translated to performance

⚠️ WHAT DIDN'T GO WELL
• Started too aggressively - 15W over target
• Faded in final 20km
• Missed key breakaway at km 40
• Spent 45min in Zone 4+ vs planned 30min
• Normalized power 20W higher than planned

💡 KEY INSIGHTS
• Climbing strength is major asset
• Pacing discipline is limiting factor
• Early intensity compromised late performance
• Missing breakaway cost potential win

🎯 RECOMMENDATIONS
• Start more conservatively - save 10-15W
• Practice negative split pacing
• Improve breakaway recognition
• Add surge/recover intervals
• Use power-based pacing alerts

🏋️ TRAINING FOCUS
• Threshold endurance (90-95% FTP)
• Race simulation with conservative starts
• Tactical skills and positioning
```

---

## 🔧 Technical Implementation

### **Database Schema:**
```sql
CREATE TABLE races (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  strava_activity_id TEXT,
  date DATE,
  name TEXT,
  type TEXT,
  distance REAL,
  elevation REAL,
  duration INTEGER,
  avg_power REAL,
  normalized_power REAL,
  placement INTEGER,
  total_riders INTEGER,
  ftp_at_time REAL,
  ctl_at_time REAL,
  race_plan_id TEXT
);

CREATE TABLE race_feedback (
  id TEXT PRIMARY KEY,
  race_id TEXT,
  overall_feeling INTEGER,
  plan_adherence TEXT,
  what_went_well TEXT,
  what_didnt_go_well TEXT,
  lessons TEXT
);

CREATE TABLE race_analysis (
  id TEXT PRIMARY KEY,
  race_id TEXT,
  overall_assessment TEXT,
  what_went_well_json TEXT,
  what_didnt_go_well_json TEXT,
  key_insights_json TEXT,
  recommendations_json TEXT,
  training_focus_json TEXT,
  performance_score REAL,
  pacing_score REAL,
  execution_score REAL,
  tactical_score REAL
);
```

### **API Endpoints:**
```
POST /api/races/mark - Mark activity as race
POST /api/races/:id/feedback - Submit feedback
POST /api/races/:id/analyze - Generate AI analysis
GET /api/races/:id/analysis - Get analysis
GET /api/races/history - Get race history
GET /api/races/compare?id1=x&id2=y - Compare races
```

---

## 🎯 Competitive Advantages

**vs. Strava:**
- ✅ AI-powered insights (Strava has none)
- ✅ Plan vs execution comparison
- ✅ Actionable recommendations

**vs. TrainingPeaks:**
- ✅ AI analysis (TP is manual)
- ✅ Free tier (TP is $129/year)
- ✅ Integrated with race planning

**vs. Intervals.icu:**
- ✅ AI insights (Intervals is data-only)
- ✅ Rider feedback integration
- ✅ Race-specific focus

**Your Unique Position:**
Complete race lifecycle: Predict → Execute → Analyze → Learn → Improve

**Nobody else has this end-to-end flow.**

---

## 💰 Monetization

**Free Tier:**
- 3 race analyses per year
- Basic insights

**Pro Tier ($10/month):**
- Unlimited race analyses
- Full AI insights
- Historical comparison
- Training plan integration

**Value:** One race analysis = $50-100 coach session

---

## 🚀 Development Timeline

**Week 1:** Race detection + feedback form + AI analysis  
**Week 2:** Plan comparison + charts + display  
**Week 3:** Historical database + trends + similar races  
**Week 4:** Learning loop + training integration + polish  

---

## 📊 Success Metrics

- % of races analyzed
- User satisfaction with insights
- Improvement in race scores over time
- Feature usage rate
- Premium conversion

---

**This completes your race feature set and creates a powerful learning loop that makes athletes faster over time.**
