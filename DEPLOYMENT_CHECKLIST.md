# Deployment Checklist

Use this checklist to ensure a smooth deployment.

## 📋 Pre-Deployment

### For Any Deployment

- [ ] Clone repository: `git clone https://github.com/speckysimon/ai-fitness-coach.git`
- [ ] Navigate to directory: `cd ai-fitness-coach`
- [ ] Copy environment file: `cp .env.example .env`
- [ ] Edit `.env` with your API credentials
- [ ] Verify Node.js version: `node --version` (should be 18+)

### API Credentials Checklist

- [ ] **Strava API**
  - [ ] Create app at https://www.strava.com/settings/api
  - [ ] Copy Client ID to `.env`
  - [ ] Copy Client Secret to `.env`
  - [ ] Set Authorization Callback Domain
  - [ ] Update `STRAVA_REDIRECT_URI` in `.env`

- [ ] **OpenAI API**
  - [ ] Get API key from https://platform.openai.com/api-keys
  - [ ] Add to `.env` as `OPENAI_API_KEY`
  - [ ] Verify you have credits/billing set up

- [ ] **Google Calendar** (Optional)
  - [ ] Create project at https://console.cloud.google.com
  - [ ] Enable Google Calendar API
  - [ ] Create OAuth 2.0 credentials
  - [ ] Add credentials to `.env`

- [ ] **Session Secret**
  - [ ] Generate: `openssl rand -hex 32`
  - [ ] Add to `.env` as `SESSION_SECRET`

---

## 🖥️ Development Setup (Windsurf/Any Computer)

- [ ] Install dependencies: `npm install`
- [ ] Verify `.env` configuration
- [ ] Test development mode: `npm run dev`
- [ ] Access frontend: http://localhost:5173
- [ ] Access API: http://localhost:5000
- [ ] Test health endpoint: `curl http://localhost:5000/api/health`
- [ ] Test Strava OAuth flow
- [ ] Verify database creation in `server/`

---

## 🥧 Raspberry Pi Deployment (Native)

### Initial Setup

- [ ] SSH into Raspberry Pi: `ssh pi@your-pi-ip`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js 18+
- [ ] Clone repository
- [ ] Run setup script: `./scripts/setup-pi.sh`
- [ ] Edit `.env` file: `nano .env`
- [ ] Update Strava redirect URI to Pi's IP/domain
- [ ] Build frontend: `npm run build`

### Service Configuration

- [ ] Enable service: `sudo systemctl enable ai-fitness-coach`
- [ ] Start service: `sudo systemctl start ai-fitness-coach`
- [ ] Check status: `sudo systemctl status ai-fitness-coach`
- [ ] Verify no errors in logs: `sudo journalctl -u ai-fitness-coach -n 50`
- [ ] Test health endpoint: `curl http://localhost:5000/api/health`
- [ ] Access from browser: `http://your-pi-ip:5000`

### Optional: Nginx Setup

- [ ] Install Nginx: `sudo apt install nginx`
- [ ] Copy nginx config: `sudo cp nginx.conf /etc/nginx/sites-available/ai-fitness-coach`
- [ ] Create symlink: `sudo ln -s /etc/nginx/sites-available/ai-fitness-coach /etc/nginx/sites-enabled/`
- [ ] Test config: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`
- [ ] Access via port 80: `http://your-pi-ip`

### Optional: SSL/HTTPS

- [ ] Install Certbot: `sudo apt install certbot python3-certbot-nginx`
- [ ] Get certificate: `sudo certbot --nginx -d your-domain.com`
- [ ] Test auto-renewal: `sudo certbot renew --dry-run`
- [ ] Update Strava redirect URI to HTTPS
- [ ] Update `.env` with HTTPS URLs

### Backup Setup

- [ ] Create backup directory: `mkdir ~/backups`
- [ ] Create backup script: `nano ~/backup-db.sh`
- [ ] Make executable: `chmod +x ~/backup-db.sh`
- [ ] Test backup: `./backup-db.sh`
- [ ] Add to crontab: `crontab -e`
- [ ] Verify cron job runs

---

## 🐳 Docker Deployment

### Prerequisites

- [ ] Install Docker: `curl -fsSL https://get.docker.com | sh`
- [ ] Install Docker Compose: `sudo apt install docker-compose`
- [ ] Add user to docker group: `sudo usermod -aG docker $USER`
- [ ] Logout and login again
- [ ] Verify: `docker --version` and `docker-compose --version`

### Build and Deploy

- [ ] Configure `.env` file
- [ ] Build image: `npm run docker:build` or `docker-compose build`
- [ ] Create data directories: `mkdir -p data tokens`
- [ ] Start services: `npm run docker:run` or `docker-compose up -d`
- [ ] Check status: `docker-compose ps`
- [ ] View logs: `docker-compose logs -f`
- [ ] Test health: `curl http://localhost:5000/api/health`
- [ ] Access application

### Verify Docker Deployment

- [ ] Container is running: `docker ps`
- [ ] No errors in logs: `docker-compose logs --tail=50`
- [ ] Health check passing: `docker inspect ai-fitness-coach | grep Health`
- [ ] Database persisted in `./data/`
- [ ] Can access frontend
- [ ] Can access API

---

## 🔒 Security Checklist

### Before Going Live

- [ ] Strong `SESSION_SECRET` generated
- [ ] `.env` file not committed to git
- [ ] HTTPS/SSL enabled (production)
- [ ] Firewall configured
  - [ ] `sudo ufw allow 22` (SSH)
  - [ ] `sudo ufw allow 80` (HTTP)
  - [ ] `sudo ufw allow 443` (HTTPS)
  - [ ] `sudo ufw enable`
- [ ] Database file permissions: `chmod 644 server/fitness-coach.db`
- [ ] Regular backups configured
- [ ] System updates automated: `sudo apt install unattended-upgrades`
- [ ] Monitoring/logging in place
- [ ] Strava OAuth redirect URIs restricted to your domain
- [ ] CORS origins restricted in production

---

## ✅ Post-Deployment Verification

### Functionality Tests

- [ ] Health endpoint responds: `curl http://your-domain/api/health`
- [ ] Frontend loads correctly
- [ ] Strava OAuth flow works
  - [ ] Click "Connect Strava"
  - [ ] Authorize on Strava
  - [ ] Redirect back works
  - [ ] Token saved
- [ ] Activities sync from Strava
- [ ] FTP can be set
- [ ] Training plan can be generated
- [ ] Calendar sync works (if configured)
- [ ] Database persists data after restart

### Performance Tests

- [ ] Page load time acceptable
- [ ] API response times good
- [ ] Memory usage reasonable: `free -h`
- [ ] CPU usage acceptable: `htop`
- [ ] Disk space sufficient: `df -h`

### Reliability Tests

- [ ] Service survives reboot
- [ ] Logs are being written
- [ ] No memory leaks over time
- [ ] Database backups working
- [ ] Auto-restart on failure works

---

## 🔄 Maintenance Checklist

### Weekly

- [ ] Check service status
- [ ] Review logs for errors
- [ ] Monitor disk space
- [ ] Verify backups are running

### Monthly

- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Update Node.js dependencies: `npm update`
- [ ] Review and rotate logs
- [ ] Test backup restoration
- [ ] Check SSL certificate expiry

### As Needed

- [ ] Pull latest code: `git pull origin main`
- [ ] Rebuild and restart
- [ ] Test after updates
- [ ] Update documentation

---

## 🆘 Troubleshooting Checklist

### Service Won't Start

- [ ] Check logs: `sudo journalctl -u ai-fitness-coach -n 50`
- [ ] Verify `.env` file exists and is configured
- [ ] Check port availability: `sudo lsof -i :5000`
- [ ] Verify Node.js version
- [ ] Check file permissions
- [ ] Verify database path exists

### Can't Access Application

- [ ] Service is running: `sudo systemctl status ai-fitness-coach`
- [ ] Port is open: `sudo netstat -tlnp | grep 5000`
- [ ] Firewall allows traffic
- [ ] Correct IP/domain in browser
- [ ] Check Nginx config (if using)
- [ ] Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Strava OAuth Fails

- [ ] Redirect URI matches exactly in Strava settings
- [ ] Domain is accessible from internet
- [ ] SSL configured if using HTTPS
- [ ] `.env` has correct Strava credentials
- [ ] Check browser console for errors
- [ ] Review server logs

### Database Issues

- [ ] Database file exists: `ls -la server/fitness-coach.db`
- [ ] Correct permissions: `chmod 644 server/fitness-coach.db`
- [ ] Not locked by another process
- [ ] Sufficient disk space
- [ ] Restore from backup if corrupted

### Performance Issues

- [ ] Check memory: `free -h`
- [ ] Check CPU: `htop`
- [ ] Check disk I/O: `iostat`
- [ ] Review logs for errors
- [ ] Restart service
- [ ] Consider upgrading hardware

---

## 📊 Monitoring Setup

### Basic Monitoring

- [ ] Set up log rotation
- [ ] Configure email alerts for service failures
- [ ] Monitor disk space
- [ ] Track memory usage
- [ ] Monitor API response times

### Advanced Monitoring (Optional)

- [ ] Install monitoring tools (Prometheus, Grafana)
- [ ] Set up uptime monitoring
- [ ] Configure performance metrics
- [ ] Set up error tracking
- [ ] Create dashboards

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Service starts automatically on boot
- ✅ Health endpoint returns `{"status":"ok"}`
- ✅ Frontend is accessible and loads correctly
- ✅ Strava authentication works end-to-end
- ✅ Activities can be synced
- ✅ Training plans can be generated
- ✅ Database persists data
- ✅ Backups are running
- ✅ Logs show no critical errors
- ✅ Performance is acceptable
- ✅ HTTPS is enabled (production)

---

## 📝 Notes

Use this space to track your specific configuration:

**Deployment Date:** _______________

**Platform:** [ ] Raspberry Pi [ ] Docker [ ] Other: _______________

**Domain/IP:** _______________

**Node.js Version:** _______________

**Special Configuration:**
- 
- 
- 

**Known Issues:**
- 
- 
- 

**Next Steps:**
- 
- 
- 

---

**Deployment Complete! 🎉**

Keep this checklist for future reference and updates.
