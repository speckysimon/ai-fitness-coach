# Changelog

All notable changes to AI Fitness Coach will be documented in this file.

## [2.1.0] - 2025-10-02

### 🚀 Major Features

#### **User Authentication & Profile Management**
- **Login System**: Secure login and registration with email/password
- **User Profile Page**: Manage personal information (age, height, weight, gender)
- **Profile Setup Flow**: Guided onboarding for new users
- **User Info in Sidebar**: Display current user name and email
- **Profile Integration**: User data automatically used in AI training plans and analytics
- **Health Metrics**: Automatic BMI calculation and power-to-weight ratio display
- **Age Categories**: Age-based categorization for performance analysis
- **Privacy First**: All data stored locally, never shared with third parties
- **Profile Persistence**: User data saved across sessions

#### **Race-Specific Training Plan Generation**
- **Event Type to Rider Type Mapping**: Training plans now automatically target the appropriate rider type based on event selection
  - Endurance → Rouleur (sustained power, aerobic capacity)
  - Criterium → Sprinter (explosive power, anaerobic capacity)
  - Time Trial → Time Trialist (threshold power, pacing)
  - Climbing → Climber (power-to-weight, VO2 max)
  - Gran Fondo → All Rounder (balanced abilities)
  - General Fitness → All Rounder (overall health)
- **Race-Specific Workout Design**: Every workout is tailored to develop the physiological characteristics needed for your target event
- **Contextual AI Prompts**: AI considers event type, days until event, current fitness, and training history to create highly specific workouts
- **Progressive Overload**: Plans build from your current fitness level with proper periodization
- **Workout Specificity**: Each session includes detailed explanations of HOW it develops race-specific abilities

### 📚 Enhanced AI Training Intelligence

#### **Improved Prompt Engineering**
- **Target Rider Profile Integration**: AI explicitly references target rider type in all workout descriptions
- **Physiological Goal Mapping**: Each event type maps to specific physiological adaptations
- **Key Workout Identification**: AI prioritizes workout types most relevant to event demands
- **Race Simulation**: Workouts designed to simulate actual race conditions and demands
- **Days Until Event**: AI considers time available and adjusts training intensity accordingly

#### **Training Context Awareness**
- **Current Fitness Analysis**: Uses FTP, recent training load, and consistency data
- **Historical Training Patterns**: Analyzes last 10 activities to understand training style
- **Load Management**: Respects current training load and builds progressively
- **Recovery Integration**: Balances intensity with adequate recovery based on recent training
- **Athlete Demographics**: AI considers age, gender, weight, and height for personalized recommendations
- **Power-to-Weight Integration**: Automatically calculates and displays W/kg in training plans

### 🎯 "Working Towards" System Enhancement
- **Automatic Rider Type Assignment**: Event type selection automatically determines target rider type
- **Consistent Messaging**: All workouts reference the target rider type being developed
- **Progress Tracking**: Visual feedback shows development towards race-specific characteristics
- **Motivational Context**: Progress messages tied to specific event goals

### 🐛 Bug Fixes
- Improved AI prompt structure for more consistent workout generation
- Enhanced error handling in training plan generation
- Better handling of edge cases in event type mapping

### 🎨 UI/UX Improvements
- **New Login Page**: Beautiful gradient design with registration flow
- **Profile Setup Wizard**: Guided experience for entering personal data
- **User Info Display**: Sidebar shows current user with avatar
- **Profile Management**: Easy-to-use interface for updating personal information
- **Health Metrics Cards**: Visual display of BMI, power-to-weight, and age category
- **Privacy Messaging**: Clear communication about data storage and usage

### 📖 Documentation
- Updated methodology to explain race-specific training approach
- Documented event type to rider type mapping logic
- Added examples of race-specific workout design
- Added user profile data usage explanations
- Privacy and data storage documentation

### 🔧 Technical Improvements
- User authentication state management
- Profile data integration with AI services
- LocalStorage-based user management (production should use proper backend)
- Protected routes requiring authentication
- Profile data validation and error handling

## [2.0.0] - 2025-10-01

### 🚀 Major Features

#### **Race Day Form Predictor**
- **CTL/ATL/TSB Calculations**: 42-day fitness, 7-day fatigue, form balance
- **Readiness Score**: 0-100% composite score with weighted factors
- **Performance Trends**: 2-week vs 4-week power comparison
- **Recovery Status**: Based on recent training load
- **Consistency Score**: 28-day training frequency analysis
- **Taper Strategy**: Phase-specific recommendations (Build, Pre-taper, Taper, Final prep)
- **Visual Charts**: 90-day fitness/fatigue/form progression with area charts
- **Smart Insights**: Personalized recommendations based on current status

#### **Training Plan Persistence & Confirmation**
- **Auto-Save**: Plans persist across sessions in localStorage
- **Replace Confirmation**: Custom modal warns before overwriting existing plan
- **"Saved Plan" Badge**: Visual indicator when plan loaded from storage
- **Progress Preservation**: Completed sessions maintained across sessions

#### **"Working Towards" Rider Type System**
- **Event Type Mapping**: Each plan type maps to target rider type
  - Endurance → Rouleur
  - Criterium → Sprinter
  - Time Trial → Time Trialist
  - Climbing → Climber
  - Gran Fondo → All Rounder
- **Progress Tracking**: Real-time progress towards target characteristics
- **Training Focus Distribution**: Visual breakdown of session types
- **Status Levels**: Starting → Building → Developing → Advanced → Mastered
- **Motivational Messages**: Progress-based encouragement

#### **Automatic Activity Matching**
- **Multi-Factor Algorithm**: 4-factor scoring system (Duration 30%, Intensity 40%, Type 20%, TSS 10%)
- **Intensity Verification**: Power/HR zone validation against session type
- **Auto-Completion**: Sessions with ≥60% match automatically marked complete
- **Match Quality Indicators**: Excellent (90-100%), Very Good (80-89%), Good (70-79%), Acceptable (60-69%)
- **Transparent Scoring**: Every completion shows match score and source

#### **Activity Match Modal**
- **View All Activities**: See all activities on session date
- **Manual Override**: Select different activity with 70% weighting
- **Activity Details**: Duration, distance, power, TSS displayed
- **Clear Match Option**: Remove match and mark incomplete
- **Visual Feedback**: Color-coded match quality (blue/orange/purple/yellow badges)

#### **Weighted Alignment System**
- **Auto-Matches**: Use actual alignment score (60-100%)
- **Manual Overrides**: Fixed 70% weight for manual selections
- **Manual Marks**: Full 100% weight for manual completions
- **Quality-Adjusted Scoring**: Reflects confidence in completion accuracy

#### **AI Race Plan Generator**
- **GPX Upload**: Parse and analyze race route files
- **Route Analysis**: Distance, elevation gain/loss, difficulty scoring
- **Climb Detection**: Automatic categorization (HC, Cat 1-4)
- **Elevation Profile**: Visual chart of route terrain
- **AI-Generated Strategy**: GPT-4o-mini powered personalized race plan
  - Overall Strategy
  - Pre-Race Preparation
  - Start Strategy
  - Segment-by-Segment Plan
  - Climb Strategy
  - Nutrition Plan
  - Pacing Zones
  - Contingency Plans
  - Final Push Strategy
- **Context-Aware**: Considers rider type, current form, training status

### 📚 Methodology Page Updates

#### **New Section: Automatic Activity Matching**
- Multi-factor algorithm explanation
- Matching thresholds and scoring
- Intensity zone verification table
- Hybrid approach benefits
- 3 academic references with DOI links:
  - Jobson et al. (2009) - Cycling training data analysis
  - Sanders & Heijboer (2019) - Power profile demands
  - Passfield et al. (2017) - Training load validity

#### **New Section: Training Alignment & Progress Tracking**
- Alignment calculation methodology
- Perfect vs partial alignment examples
- "Working Towards" rider type system
- Overall progress calculation formula
- 5 academic references with DOI links:
  - Seiler & Kjerland (2006) - Training intensity distribution
  - Stöggl & Sperlich (2015) - TID among elite athletes
  - Esteve-Lanao et al. (2007) - Impact of TID on performance
  - Bompa & Haff (2009) - Periodization theory
  - Foster et al. (2001) - Exercise training monitoring

### 🎨 UI/UX Improvements
- **Custom Modals**: Replaced browser alerts with themed modals
- **Progress Indicators**: Auto-matched vs manual session counts
- **Color-Coded Badges**: Visual distinction between completion types
- **"View Match" Button**: Easy access to activity matching details
- **Gradient Headers**: Beautiful visual design for key features
- **Responsive Layouts**: Optimized for all screen sizes

### 🐛 Bug Fixes
- Fixed training alignment calculation to use planned distribution
- Corrected completion tracking for new object format
- Improved error handling with detailed messages
- Fixed GPX parsing for various file formats
- Updated OpenAI model to gpt-4o-mini for reliability

### 🔧 Technical Improvements
- **GPX Parser**: Haversine formula for accurate distance calculation
- **Climb Categorization**: Industry-standard difficulty scoring
- **Route Difficulty Algorithm**: 0-100 scoring system
- **Weighted Completion Tracking**: Quality-adjusted progress
- **Better Error Messages**: Helpful debugging information

### 📖 Documentation
- Updated methodology with 8+ new academic sources
- Added comprehensive feature explanations
- Documented all calculation formulas
- Included DOI links for all research papers
- Created ROADMAP.md with prioritized improvements

### ⚠️ Known Issues
- **Race Plan Display**: Plan content may not display correctly due to OpenAI response parsing
- **OpenAI API Credits**: Requires active OpenAI account with credits
- **GPX Parser**: Some GPX formats may not parse correctly

### 🔮 Coming Next (v2.1.0)
- Fix race plan display parsing
- Real-time race execution mode
- Training plan templates
- Export race plans as PDF
- Mobile responsiveness improvements

## [1.2.0] - 2025-09-30

### 🎉 Training Plan Enhancements

#### **Smart Date-Based Planning**
- **Start Date Field**: Replace manual duration with start date picker
- **Automatic Duration Calculation**: Plan length calculated from start date to event date
- **Session Dates**: Every session shows exact date (e.g., "Monday, Oct 6")
- **Chronological Order**: Sessions flow in proper date sequence

#### **Proper Periodization & Tapering**
- **Automatic Taper Week**: Final week always includes 50% volume reduction
- **Race-Day Freshness**: Proper taper ensures peak performance on event day
- **Scientific Periodization**: Base → Build → Peak → Taper progression
- **AI Instructions Updated**: GPT-4 now explicitly includes taper in plans

#### **Celebration & Progress**
- **Confetti Animation**: Full-screen celebration when 100% of plan completed
- **Visual Progress**: Animated progress bar shows completion percentage
- **Session Completion**: Mark sessions complete with persistent tracking

#### **Calendar Integration**
- **Add to Calendar Button**: Prominent green button to sync all sessions
- **Smart Sync**: Creates Google Calendar events with proper dates and times
- **Detailed Events**: Each event includes type, duration, targets, and description
- **Always Visible**: Button shows helpful message if Google not connected

#### **UI Improvements**
- **Regenerate Plan Button**: Easy plan regeneration with progress reset
- **Better Date Display**: Sessions show formatted dates (e.g., "Sep 30")
- **Improved Layout**: Cleaner button arrangement and visual hierarchy

### 🐛 Bug Fixes
- Fixed date calculation to ensure chronological order
- Fixed missing icon imports (Clock, CalendarPlus, RefreshCw)
- Fixed session date parsing for proper timezone handling
- Corrected week-based date calculations

### 📚 Documentation
- Added training plan sources (Coggan, Friel, Bompa, Seiler)
- Documented taper methodology
- Explained periodization principles

## [1.1.0] - 2025-09-30

### 🎉 Major Feature Release

#### **Enhanced Training Plan Generator**
- **Interactive Session Details**: Click any session to view comprehensive modal with:
  - Detailed zone breakdowns (time in each power/HR zone)
  - Specific wattage targets based on your FTP
  - Zwift workout recommendations matched to session type
  - Main set descriptions and key training points
- **Progress Tracking**: Visual progress bar showing completed vs total sessions
- **Session Completion**: Mark sessions as complete with persistent tracking
- **Visual Improvements**: Color-coded sessions, completion status, hover effects

#### **All Activities Page**
- Complete activity browser with search and filtering
- Sort by date, distance, or duration
- TSS displayed on every activity
- Summary statistics (total distance, time, elevation)
- Click activities for detailed modal view

#### **FTP History Page**
- Track FTP progression over time with interactive graphs
- Adjustable time ranges (8, 12, 16, 24 weeks, or "This Year")
- Weekly FTP calculations with trend analysis
- Change tracking (watts and percentage)

#### **Methodology Page**
- Comprehensive scientific documentation
- 15+ peer-reviewed academic sources
- Detailed explanations of all calculations:
  - TSS (Training Stress Score)
  - FTP (Functional Threshold Power)
  - Training load zones
  - Normalized Power
  - AI training plan generation
- Data privacy and transparency information

#### **Activity Enhancements**
- **Smart Icons**: 
  - Zwift activities show orange "Z" badge
  - Indoor rides show house icon
  - Outdoor rides show mountain icon
  - Activity type specific icons
- **Load-Based Color Coding**: Traffic light system on activity borders
  - 🟢 Green (1-49 TSS): Easy/Recovery
  - 🟡 Yellow (50-99 TSS): Moderate
  - 🟠 Orange (100-149 TSS): Hard
  - 🔴 Red (150+ TSS): Very Hard
- **TSS Calculation**: All activities show Training Stress Score
- **Activity Detail Modal**: Click any activity for comprehensive stats

#### **Data & Performance**
- Smart caching system (5-minute cache for dashboard data)
- Activities persist across page navigation
- FTP auto-calculated from recent power data
- Session completion tracking in localStorage

### 🐛 Bug Fixes
- Fixed missing icon imports in Plan Generator
- Improved data loading and error handling
- Fixed activity sorting (most recent first)

### 🎨 UI/UX Improvements
- Consistent color coding across all pages
- Hover effects and visual feedback
- Responsive layouts
- Loading states and progress indicators
- Modal overlays for detailed views

## [1.0.1] - 2025-09-30

### 🐛 Bug Fixes
- **Port Conflict**: Changed default port from 5000 to 5001 to avoid conflict with macOS AirPlay/AirTunes
- **OAuth Redirect**: Fixed Strava and Google OAuth callbacks to properly redirect back to frontend
- **OpenAI Initialization**: Fixed lazy initialization of OpenAI client to prevent environment variable loading issues
- **Activity Sorting**: Activities now display in reverse chronological order (most recent first)

### 🔧 Configuration Changes
- Updated all redirect URIs to use port 5001
- Updated Vite proxy configuration to point to port 5001
- Improved environment variable handling

### ✅ Verified Working
- Strava OAuth connection ✓
- Activity import and display ✓
- Dashboard metrics and charts ✓
- FTP and TSS calculations ✓

## [1.0.0] - 2025-09-30

### 🎉 Initial Release

#### Features

**Data Ingestion**
- ✅ Strava OAuth integration
- ✅ Activity import with comprehensive metrics
- ✅ FTP/eFTP estimation
- ✅ Training load calculation (TSS)
- ✅ 6-week rolling trends

**Dashboard**
- ✅ Key metrics display (FTP, weekly load, time, distance)
- ✅ Interactive trend charts (volume, activity count)
- ✅ Recent activities list with details
- ✅ Real-time data sync from Strava

**AI Training Plans**
- ✅ OpenAI GPT-4 powered plan generation
- ✅ Customizable goals and constraints
- ✅ 2-16 week plan duration
- ✅ Session-level details with targets
- ✅ Rule-based fallback when AI unavailable
- ✅ Plan adaptation based on completed activities

**Calendar Integration**
- ✅ Google Calendar OAuth
- ✅ Batch event creation
- ✅ Monthly calendar view
- ✅ Past activities vs planned sessions
- ✅ Monthly summary statistics

**User Interface**
- ✅ Modern, responsive design with TailwindCSS
- ✅ Intuitive navigation
- ✅ Beautiful data visualizations with Recharts
- ✅ Lucide React icons
- ✅ Setup wizard for first-time users

**Technical**
- ✅ React 18 frontend
- ✅ Express.js backend
- ✅ Modular service architecture
- ✅ Environment-based configuration
- ✅ Error handling and fallbacks

#### Documentation
- ✅ Comprehensive README
- ✅ Quick setup guide
- ✅ API documentation
- ✅ Contributing guidelines
- ✅ Environment checker script

### Known Limitations

- Single user only (no multi-user support)
- Data stored in browser localStorage
- No offline support
- English language only
- Cycling-focused (running support limited)

### Future Roadmap

**v1.1.0 (Planned)**
- Weather integration
- Zwift workout export
- Mobile responsiveness improvements
- Dark mode

**v1.2.0 (Planned)**
- Multi-sport support (running, swimming)
- Training plan templates
- Advanced analytics
- Social features

**v2.0.0 (Planned)**
- Multi-user support
- Database backend
- Coach mode
- Mobile apps

---

## Version History

### [1.0.0] - 2025-09-30
- Initial release with core features

---

**Note**: This project follows [Semantic Versioning](https://semver.org/).
