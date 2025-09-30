# Changelog

All notable changes to AI Fitness Coach will be documented in this file.

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
