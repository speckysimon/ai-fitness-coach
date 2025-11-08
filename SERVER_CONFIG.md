# Server Configuration Reference

**Last Updated**: November 8, 2025  
**Server**: riderlabs-prod  
**Domain**: riderlabs.io

---

## 🖥️ Server Details

### Production Server
- **Hostname**: `riderlabs-prod`
- **Domain**: `riderlabs.io`, `www.riderlabs.io`
- **SSH**: `ssh riderlabs@riderlabs.io`
- **User**: `riderlabs`
- **Home**: `/home/riderlabs`
- **App Path**: `/home/riderlabs/ai-fitness-coach`

### Ports
- **HTTP**: 80 (redirects to HTTPS)
- **HTTPS**: 443 (SSL via Let's Encrypt)
- **Backend**: 5001 (Node.js/Express)
- **Frontend**: Served via nginx from `/dist`

---

## 🔧 Nginx Configuration

### Config File Location
```
/etc/nginx/sites-available/riderlabs
/etc/nginx/sites-enabled/riderlabs (symlink)
```

### Current Configuration

```nginx
server {
    server_name riderlabs.io www.riderlabs.io;

    # Serve static files from dist
    root /home/riderlabs/ai-fitness-coach/dist;
    index index.html;

    # API requests go to Node.js backend
    location /api/ {
        client_max_body_size 50M;  # Allow large file uploads (avatars, images)
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # All other requests serve the React app
    location / {
        try_files $uri $uri/ /index.html;
    }

    # SSL Configuration (managed by Certbot)
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/riderlabs.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/riderlabs.io/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name riderlabs.io www.riderlabs.io;
    
    if ($host = www.riderlabs.io) {
        return 301 https://$host$request_uri;
    }
    
    if ($host = riderlabs.io) {
        return 301 https://$host$request_uri;
    }
    
    return 404;
}
```

### Key Settings
- **`client_max_body_size 50M`**: Allows uploads up to 50MB (AI-generated images, avatars)
- **`proxy_pass http://localhost:5001`**: Forwards API requests to Express backend
- **`try_files $uri $uri/ /index.html`**: Enables React Router (SPA routing)
- **SSL**: Managed by Let's Encrypt Certbot (auto-renewal)

---

## 🚀 PM2 Process Manager

### Process Name
```
riderlabs
```

### Common Commands
```bash
# View status
pm2 status
pm2 info riderlabs

# View logs
pm2 logs riderlabs
pm2 logs riderlabs --lines 100

# Restart
pm2 restart riderlabs

# Stop/Start
pm2 stop riderlabs
pm2 start riderlabs

# Save configuration
pm2 save

# View monitoring
pm2 monit
```

### PM2 Configuration
The app is configured to:
- Auto-restart on crashes
- Start on system boot
- Run as user `riderlabs`
- Execute: `node server/index.js`
- Working directory: `/home/riderlabs/ai-fitness-coach`

---

## 📁 Directory Structure

```
/home/riderlabs/ai-fitness-coach/
├── dist/                    # Built frontend (served by nginx)
├── server/                  # Backend Node.js app
│   ├── index.js            # Express server entry point
│   ├── fitness-coach.db    # SQLite database
│   ├── schema.sql          # Database schema
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── uploads/            # Uploaded files (avatars, images)
├── node_modules/           # Dependencies
├── package.json            # Project metadata
└── .env                    # Environment variables
```

---

## 🔐 SSL/TLS Configuration

### Certificate Provider
**Let's Encrypt** (via Certbot)

### Certificate Locations
- **Certificate**: `/etc/letsencrypt/live/riderlabs.io/fullchain.pem`
- **Private Key**: `/etc/letsencrypt/live/riderlabs.io/privkey.pem`
- **Options**: `/etc/letsencrypt/options-ssl-nginx.conf`
- **DH Params**: `/etc/letsencrypt/ssl-dhparams.pem`

### Auto-Renewal
Certbot automatically renews certificates via systemd timer:
```bash
# Check renewal status
sudo certbot renew --dry-run

# View timer
sudo systemctl status certbot.timer
```

### Manual Renewal (if needed)
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 🗄️ Database

### Database File
```
/home/riderlabs/ai-fitness-coach/server/fitness-coach.db
```

### Schema File
```
/home/riderlabs/ai-fitness-coach/server/schema.sql
```

### Backup Strategy
```bash
# Manual backup
cp server/fitness-coach.db server/fitness-coach.db.backup-$(date +%Y%m%d-%H%M%S)

# Automated backup (recommended - add to crontab)
0 2 * * * cp /home/riderlabs/ai-fitness-coach/server/fitness-coach.db /home/riderlabs/backups/fitness-coach-$(date +\%Y\%m\%d).db
```

---

## 🔄 Deployment Workflow

### Standard Deployment
```bash
# 1. SSH to server
ssh riderlabs@riderlabs.io

# 2. Navigate to app
cd ~/ai-fitness-coach

# 3. Pull latest code
git pull origin main

# 4. Install dependencies (if package.json changed)
npm install

# 5. Build frontend
npm run build

# 6. Restart backend
pm2 restart riderlabs

# 7. Verify
pm2 logs riderlabs --lines 20
curl -I https://riderlabs.io/api/health
```

### Schema Changes
```bash
# After pulling code with schema changes
pm2 restart riderlabs  # Schema auto-applies on startup

# Or manually apply
sqlite3 server/fitness-coach.db < server/schema.sql
pm2 restart riderlabs
```

---

## 🛠️ Common Maintenance Tasks

### Update Nginx Configuration
```bash
# Edit config
sudo nano /etc/nginx/sites-available/riderlabs

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### View Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Check Disk Space
```bash
df -h
du -sh /home/riderlabs/ai-fitness-coach/*
```

### Check Memory Usage
```bash
free -h
pm2 monit
```

### Restart All Services
```bash
# Restart nginx
sudo systemctl restart nginx

# Restart PM2 app
pm2 restart riderlabs

# Restart entire PM2
pm2 restart all
```

---

## 🔍 Troubleshooting

### App Not Responding
```bash
# Check PM2 status
pm2 status
pm2 logs riderlabs --lines 50

# Check if port is in use
sudo netstat -tulpn | grep :5001

# Restart app
pm2 restart riderlabs
```

### Nginx Issues
```bash
# Check nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Check certificate expiry
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Database Issues
```bash
# Check database integrity
sqlite3 server/fitness-coach.db "PRAGMA integrity_check;"

# Check table count
sqlite3 server/fitness-coach.db ".tables"

# Restore from backup
cp server/fitness-coach.db.backup-YYYYMMDD-HHMMSS server/fitness-coach.db
pm2 restart riderlabs
```

### Upload Issues (413 Error)
```bash
# Check nginx upload limit
grep -r "client_max_body_size" /etc/nginx/

# Should show: client_max_body_size 50M;
# If not, add it to /api/ location block and reload nginx
```

---

## 📊 Monitoring

### Health Check Endpoint
```bash
curl https://riderlabs.io/api/health
# Expected: {"status":"ok","timestamp":"2025-11-08T..."}
```

### Check Response Times
```bash
curl -w "@-" -o /dev/null -s https://riderlabs.io <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
      time_redirect:  %{time_redirect}\n
   time_pretransfer:  %{time_pretransfer}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
```

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Web dashboard (optional)
pm2 plus
```

---

## 🔒 Security

### Firewall (UFW)
```bash
# Check status
sudo ufw status

# Should allow:
# - 22/tcp (SSH)
# - 80/tcp (HTTP)
# - 443/tcp (HTTPS)
```

### SSH Configuration
- **Key-based authentication**: Recommended
- **Password authentication**: Should be disabled
- **Root login**: Should be disabled

### File Permissions
```bash
# App directory
chown -R riderlabs:riderlabs /home/riderlabs/ai-fitness-coach

# Database file
chmod 644 /home/riderlabs/ai-fitness-coach/server/fitness-coach.db

# Uploads directory
chmod 755 /home/riderlabs/ai-fitness-coach/server/uploads
```

---

## 📝 Environment Variables

### Location
```
/home/riderlabs/ai-fitness-coach/.env
```

### Required Variables
```bash
NODE_ENV=production
PORT=5001
SESSION_SECRET=<secret>
ADMIN_JWT_SECRET=<secret>
# API keys loaded from database via admin panel
```

---

## 🆘 Emergency Procedures

### Complete Service Restart
```bash
sudo systemctl restart nginx
pm2 restart all
```

### Rollback Deployment
```bash
cd ~/ai-fitness-coach
git log --oneline -5  # Find previous commit
git reset --hard <commit-hash>
npm install
npm run build
pm2 restart riderlabs
```

### Database Restore
```bash
# Stop app
pm2 stop riderlabs

# Restore backup
cp server/fitness-coach.db.backup-YYYYMMDD-HHMMSS server/fitness-coach.db

# Restart app
pm2 start riderlabs
```

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| SSH to server | `ssh riderlabs@riderlabs.io` |
| View app logs | `pm2 logs riderlabs` |
| Restart app | `pm2 restart riderlabs` |
| Reload nginx | `sudo systemctl reload nginx` |
| Test nginx config | `sudo nginx -t` |
| Check SSL cert | `sudo certbot certificates` |
| Database backup | `cp server/fitness-coach.db server/fitness-coach.db.backup-$(date +%Y%m%d)` |
| Health check | `curl https://riderlabs.io/api/health` |

---

**For deployment procedures, see**: `DEPLOYMENT_GUIDE.md`  
**For database reference, see**: `DATABASE_REFERENCE.md`
