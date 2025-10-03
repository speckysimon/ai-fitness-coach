# AI Fitness Coach - Packaging Summary

This document provides an overview of the deployment packaging for the AI Fitness Coach application.

## 📦 What's Included

Your project is now fully packaged for both **development portability** and **production deployment** on various platforms including Raspberry Pi.

## 🎯 Two Main Use Cases

### 1. Development on Different Computer (Windsurf)

**Quick Start:**
```bash
git clone https://github.com/speckysimon/ai-fitness-coach.git
cd ai-fitness-coach
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

**What you need:**
- Node.js 18+
- Your API keys (Strava, OpenAI, Google)
- 5 minutes

**See:** `DEPLOYMENT.md` → Development Setup section

---

### 2. Production Deployment on Raspberry Pi

**Three deployment options:**

#### Option A: Native Installation (Recommended for Pi)
```bash
# On your Raspberry Pi
git clone https://github.com/speckysimon/ai-fitness-coach.git
cd ai-fitness-coach
chmod +x scripts/setup-pi.sh
./scripts/setup-pi.sh
```

**See:** `DEPLOYMENT.md` → Raspberry Pi Deployment section

#### Option B: Docker Deployment
```bash
# On your Raspberry Pi
git clone https://github.com/speckysimon/ai-fitness-coach.git
cd ai-fitness-coach
cp .env.example .env
# Edit .env
npm run docker:build
npm run docker:run
```

**See:** `DOCKER_DEPLOYMENT.md`

#### Option C: Manual Setup
Follow the detailed steps in `DEPLOYMENT.md`

---

## 📁 New Files Created

### Documentation
- **`DEPLOYMENT.md`** - Complete deployment guide for all scenarios
- **`DOCKER_DEPLOYMENT.md`** - Docker-specific deployment guide
- **`PACKAGING_SUMMARY.md`** - This file

### Docker Files
- **`Dockerfile`** - Multi-stage Docker build configuration
- **`.dockerignore`** - Files to exclude from Docker builds
- **`docker-compose.yml`** - Docker Compose orchestration
- **`nginx.conf`** - Nginx reverse proxy configuration

### Scripts
- **`scripts/setup-pi.sh`** - Automated Raspberry Pi setup
- **`scripts/deploy.sh`** - Quick deployment/update script

### Code Changes
- **`server/index.js`** - Updated to serve static files in production
- **`package.json`** - Added production scripts

---

## 🚀 Quick Reference

### For Development (Any Computer)

| Action | Command |
|--------|---------|
| Install | `npm install` |
| Run dev mode | `npm run dev` |
| Build | `npm run build` |
| Run production | `npm start` |

### For Raspberry Pi (Native)

| Action | Command |
|--------|---------|
| Initial setup | `./scripts/setup-pi.sh` |
| Start service | `sudo systemctl start ai-fitness-coach` |
| Stop service | `sudo systemctl stop ai-fitness-coach` |
| View logs | `sudo journalctl -u ai-fitness-coach -f` |
| Update app | `./scripts/deploy.sh` |

### For Docker (Any Platform)

| Action | Command |
|--------|---------|
| Build | `npm run docker:build` |
| Start | `npm run docker:run` |
| Stop | `npm run docker:stop` |
| Logs | `npm run docker:logs` |
| Health check | `curl http://localhost:5000/api/health` |

---

## 🔑 Environment Variables Required

All deployment methods require a `.env` file. Copy from `.env.example`:

```bash
cp .env.example .env
```

**Minimum required:**
- `STRAVA_CLIENT_ID` - From Strava API settings
- `STRAVA_CLIENT_SECRET` - From Strava API settings
- `OPENAI_API_KEY` - From OpenAI dashboard
- `SESSION_SECRET` - Random string (generate with: `openssl rand -hex 32`)

**Optional but recommended:**
- Google Calendar API credentials (for calendar sync)

---

## 📊 Architecture Overview

### Development Mode
```
┌─────────────┐     ┌──────────────┐
│   Vite Dev  │────▶│   React App  │
│   :5173     │     │   (Hot reload)│
└─────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Express API │
                    │    :5000     │
                    └──────────────┘
```

### Production Mode (Native)
```
┌─────────────────┐
│   Express API   │
│     :5000       │
│                 │
│  ┌───────────┐  │
│  │ Static    │  │
│  │ Files     │  │
│  │ (React)   │  │
│  └───────────┘  │
└─────────────────┘
```

### Production Mode (Docker + Nginx)
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Nginx     │────▶│  Static      │     │  Express    │
│   :80/443   │     │  Files       │────▶│  API :5000  │
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## 🔧 Customization

### Change Ports

**Development:**
Edit `vite.config.js` for frontend port
Edit `server/index.js` for backend port

**Production:**
Edit `.env`:
```env
PORT=5000  # Change to your preferred port
```

### Add Custom Domain

1. Update Strava OAuth settings with your domain
2. Update `.env`:
   ```env
   STRAVA_REDIRECT_URI=https://yourdomain.com/api/auth/strava/callback
   FRONTEND_URL=https://yourdomain.com
   ```
3. Configure SSL (see `DEPLOYMENT.md`)

---

## 🛡️ Security Checklist

Before deploying to production:

- [ ] Generate strong `SESSION_SECRET`
- [ ] Use HTTPS/SSL in production
- [ ] Update Strava OAuth redirect URIs
- [ ] Restrict CORS origins
- [ ] Set up firewall rules
- [ ] Enable automatic security updates
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity

---

## 📱 Access Points

### Development
- Frontend: http://localhost:5173
- API: http://localhost:5000
- Health: http://localhost:5000/api/health

### Production (Native)
- Application: http://your-pi-ip:5000
- Health: http://your-pi-ip:5000/api/health

### Production (Docker + Nginx)
- Application: http://your-pi-ip
- API: http://your-pi-ip/api
- Health: http://your-pi-ip/health

---

## 🐛 Troubleshooting

### Common Issues

**"Port already in use"**
```bash
# Find and kill process
sudo lsof -i :5000
sudo kill -9 <PID>
```

**"Cannot find module"**
```bash
rm -rf node_modules package-lock.json
npm install
```

**"Database locked"**
```bash
# Stop all instances
sudo systemctl stop ai-fitness-coach
# Or for Docker
docker-compose down
```

**"Out of memory" (Raspberry Pi)**
```bash
# Enable swap or limit Node.js memory
node --max-old-space-size=512 server/index.js
```

See full troubleshooting in `DEPLOYMENT.md`

---

## 📚 Documentation Index

1. **`README.md`** - Project overview and features
2. **`DEPLOYMENT.md`** - Complete deployment guide ⭐
3. **`DOCKER_DEPLOYMENT.md`** - Docker-specific guide
4. **`QUICK_START.md`** - Quick start for development
5. **`SETUP_GUIDE.md`** - Initial setup instructions
6. **`API_DOCS.md`** - API documentation
7. **`ARCHITECTURE.md`** - System architecture
8. **`CHANGELOG.md`** - Version history

---

## 🎓 Learning Resources

### For Raspberry Pi Beginners
- [Raspberry Pi Documentation](https://www.raspberrypi.org/documentation/)
- [Linux Command Line Basics](https://ubuntu.com/tutorials/command-line-for-beginners)

### For Docker Beginners
- [Docker Getting Started](https://docs.docker.com/get-started/)
- [Docker Compose Tutorial](https://docs.docker.com/compose/gettingstarted/)

### For Node.js Deployment
- [Node.js Production Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 Process Manager](https://pm2.keymetrics.io/)

---

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting sections in the docs
2. Review logs: `sudo journalctl -u ai-fitness-coach -f`
3. Check GitHub issues
4. Verify environment variables are set correctly

---

## 🎉 Success Criteria

You'll know it's working when:

- ✅ Health check returns `{"status":"ok"}`
- ✅ You can access the frontend
- ✅ Strava authentication works
- ✅ Service restarts automatically after reboot (Pi)
- ✅ Logs show no errors

---

## 📝 Next Steps After Deployment

1. **Test Strava OAuth** - Connect your Strava account
2. **Import Activities** - Sync your training data
3. **Set FTP** - Configure your fitness parameters
4. **Generate Plan** - Create your first training plan
5. **Setup Backups** - Configure automated database backups
6. **Monitor Performance** - Check logs and resource usage

---

## 🔄 Updating

### Pull Latest Changes
```bash
git pull origin main
```

### Development
```bash
npm install
npm run dev
```

### Production (Native)
```bash
./scripts/deploy.sh
```

### Production (Docker)
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

---

**Happy Deploying! 🚀**
