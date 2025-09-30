# 🎯 Quick Reference Card

## Essential Commands

### Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Check environment configuration
node scripts/check-env.js
```

### Development
```bash
# Start both frontend and backend
npm run dev

# Start only backend (port 5000)
npm run server

# Start only frontend (port 3000)
npm run client
```

### Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Linting
```bash
# Run ESLint
npm run lint
```

## URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## Environment Variables

### Required
```env
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_secret
OPENAI_API_KEY=sk-proj-...
```

### Optional
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

## API Endpoints Quick Reference

### Strava
- `GET /api/strava/auth` - Get auth URL
- `GET /api/strava/activities` - Fetch activities
- `GET /api/strava/activities/:id` - Get activity details

### Google Calendar
- `GET /api/google/auth` - Get auth URL
- `POST /api/google/calendar/events` - Create event
- `POST /api/google/calendar/events/batch` - Batch create

### Training Plans
- `POST /api/training/plan/generate` - Generate AI plan
- `POST /api/training/plan/adapt` - Adapt existing plan
- `POST /api/training/session/recommend` - Get session recommendation

### Analytics
- `POST /api/analytics/ftp` - Calculate FTP
- `POST /api/analytics/load` - Calculate training load
- `POST /api/analytics/trends` - Get trend analysis

## Common Issues & Solutions

### Port Already in Use
```bash
# Change port in .env
PORT=5001

# Or kill process on port
lsof -ti:5000 | xargs kill -9
```

### Strava Auth Fails
- Check redirect URI: `http://localhost:5000/api/strava/callback`
- Verify "localhost" in Strava app settings
- Clear browser cache

### OpenAI Errors
- Verify API key is valid
- Check account has credits
- App falls back to rule-based plans

### Google Calendar Not Working
- Enable Calendar API in Google Cloud Console
- Verify redirect URI matches exactly
- Reconnect account in Settings

## File Structure Quick Map

```
ai-fitness-coach/
├── server/           # Backend code
│   ├── routes/      # API endpoints
│   └── services/    # Business logic
├── src/             # Frontend code
│   ├── components/  # React components
│   ├── pages/       # Page components
│   └── lib/         # Utilities
├── public/          # Static files
└── scripts/         # Helper scripts
```

## Key Files

- **Backend Entry**: `server/index.js`
- **Frontend Entry**: `src/main.jsx`
- **Main App**: `src/App.jsx`
- **Environment**: `.env`
- **Config**: `vite.config.js`, `tailwind.config.js`

## Useful Links

### API Documentation
- Strava: https://developers.strava.com/docs/reference/
- OpenAI: https://platform.openai.com/docs/api-reference
- Google Calendar: https://developers.google.com/calendar/api/v3/reference

### Get API Keys
- Strava: https://www.strava.com/settings/api
- OpenAI: https://platform.openai.com/api-keys
- Google: https://console.cloud.google.com/

## Project Documentation

- `README.md` - Full documentation
- `SETUP_GUIDE.md` - Step-by-step setup
- `API_DOCS.md` - Complete API reference
- `PROJECT_SUMMARY.md` - Project overview
- `CONTRIBUTING.md` - How to contribute
- `CHANGELOG.md` - Version history

## Support

### Getting Help
1. Check `README.md` for detailed docs
2. Review `SETUP_GUIDE.md` for setup issues
3. Check `API_DOCS.md` for API details
4. Open an issue on GitHub

## Version Info

- **Current Version**: 1.0.0
- **Node Version**: 18+
- **License**: MIT

---

**Quick Start**: `npm install && npm run dev` 🚀
