# Digital Ocean Deployment Guide - RiderLabs

Complete guide to deploy RiderLabs on Digital Ocean with SSL, custom domain, and production-ready setup.

---

## ⚡ Quick Deploy (Existing Setup)

**For updating existing production deployment:**

```bash
# 1. SSH into droplet
ssh root@riderlabs.io

# 2. Switch to riderlabs user
su - riderlabs

# 3. Navigate to project
cd ~/ai-fitness-coach

# 4. Pull latest changes
git pull origin main

# 5. Install dependencies (including dev dependencies for build)
npm install

# 6. Build frontend
npm run build

# 7. Run database migrations (if any)
node server/migrations/run-migrations.js

# 8. Restart application with updated env vars
pm2 restart riderlabs --update-env

# 9. Verify deployment
pm2 logs riderlabs --lines 30
```

**⚠️ IMPORTANT NOTES:**
- Use `npm install` (NOT `npm ci --production`) to get dev dependencies needed for build
- Use `pm2 restart riderlabs --update-env` to reload environment variables from `.env`
- Environment file location: `/home/riderlabs/ai-fitness-coach/.env`
- Hard refresh browser (Cmd+Shift+R) after deployment to clear cache

**One-liner for quick updates:**
```bash
ssh root@riderlabs.io "su - riderlabs -c 'cd ~/ai-fitness-coach && git pull && npm install && npm run build && node server/migrations/run-migrations.js && pm2 restart riderlabs --update-env && pm2 logs riderlabs --lines 20'"
```

---

## 🚀 Quick Start (15 minutes - First Time Setup)

### Prerequisites
- Digital Ocean account
- Domain name (optional but recommended)
- Strava API credentials
- OpenAI API key
- Google Calendar API credentials (optional)

---

## Step 1: Create a Droplet

1. **Log into Digital Ocean**
   - Go to https://cloud.digitalocean.com

2. **Create Droplet**
   - Click "Create" → "Droplets"
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic
   - **CPU Options**: Regular (2GB RAM minimum, $12/month)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `riderlabs-prod`
   - Click "Create Droplet"

3. **Note your Droplet's IP address**
   - Example: `164.92.123.45`

---

## Step 2: Initial Server Setup

### Connect to your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Update system

```bash
apt update && apt upgrade -y
```

### Create a non-root user

```bash
adduser riderlabs
usermod -aG sudo riderlabs
```

### Set up firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

### Switch to new user

```bash
su - riderlabs
```

---

## Step 3: Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x or higher
npm --version
```

---

## Step 4: Install and Configure Nginx

```bash
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify it's running
curl http://localhost
```

---

## Step 5: Clone and Setup Application

```bash
# Clone repository
cd ~
git clone https://github.com/speckysimon/ai-fitness-coach.git
cd ai-fitness-coach

# Install dependencies
npm install

# Build frontend
npm run build
```

---

## Step 6: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit environment variables
nano .env
```

**Update these values:**

```env
# Server
PORT=5001
NODE_ENV=production

# Strava API
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=https://yourdomain.com/api/auth/strava/callback

# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google/callback

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Session Secret (generate random string)
SESSION_SECRET=generate_random_string_here

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

**Generate secure session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 7: Set Up PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
pm2 start server/index.js --name riderlabs

# Set up PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

# Save PM2 process list
pm2 save

# Check status
pm2 status
pm2 logs riderlabs
```

---

## Step 8: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/riderlabs
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend - serve static files
    location / {
        root /home/riderlabs/ai-fitness-coach/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - proxy to Node.js
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

**Enable the site:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/riderlabs /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 9: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot automatically:
- Obtains SSL certificate
- Updates Nginx configuration
- Sets up auto-renewal (runs twice daily)

---

## Step 10: Configure Domain DNS

### Point your domain to Digital Ocean:

1. **In your domain registrar** (GoDaddy, Namecheap, etc.):
   - Add an **A Record**:
     - Name: `@`
     - Value: `YOUR_DROPLET_IP`
     - TTL: 3600
   
   - Add a **CNAME Record** (optional, for www):
     - Name: `www`
     - Value: `yourdomain.com`
     - TTL: 3600

2. **Wait for DNS propagation** (5-30 minutes)
   ```bash
   # Check DNS propagation
   dig yourdomain.com
   ```

---

## Step 11: Update OAuth Redirect URLs

### Strava API Settings

1. Go to https://www.strava.com/settings/api
2. Update **Authorization Callback Domain**:
   - Add: `yourdomain.com`
3. Update redirect URI in your `.env` file

### Google Calendar API Settings

1. Go to https://console.cloud.google.com/
2. Navigate to your project → Credentials
3. Edit OAuth 2.0 Client ID
4. Add authorized redirect URI:
   - `https://yourdomain.com/api/google/callback`

---

## Step 12: Test Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs riderlabs

# Check Nginx status
sudo systemctl status nginx

# Test API endpoint
curl https://yourdomain.com/api/health

# Test frontend
curl https://yourdomain.com
```

**Visit your site:**
- https://yourdomain.com

---

## 📊 Monitoring & Maintenance

### View Application Logs

```bash
# Real-time logs
pm2 logs riderlabs

# Last 100 lines
pm2 logs riderlabs --lines 100

# Error logs only
pm2 logs riderlabs --err
```

### Monitor Resources

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk usage
df -h

# Memory usage
free -h
```

### Restart Application

```bash
# Restart app
pm2 restart riderlabs

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔄 Updating the Application

```bash
# Navigate to app directory
cd ~/ai-fitness-coach

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Restart application
pm2 restart riderlabs

# Clear Nginx cache (if needed)
sudo systemctl reload nginx
```

---

## 💾 Database Backups

### Automated Daily Backups

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
nano ~/backup-db.sh
```

**Add this script:**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH=~/ai-fitness-coach/server/fitness-coach.db
BACKUP_DIR=~/backups

# Create backup
cp $DB_PATH $BACKUP_DIR/fitness-coach_$DATE.db

# Keep only last 7 days
find $BACKUP_DIR -name "fitness-coach_*.db" -mtime +7 -delete

echo "Backup completed: fitness-coach_$DATE.db"
```

```bash
# Make executable
chmod +x ~/backup-db.sh

# Test it
~/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
0 2 * * * /home/riderlabs/backup-db.sh >> /home/riderlabs/backup.log 2>&1
```

### Manual Backup

```bash
# Create backup
cp ~/ai-fitness-coach/server/fitness-coach.db ~/backups/fitness-coach_$(date +%Y%m%d).db

# Download to local machine
scp riderlabs@YOUR_DROPLET_IP:~/backups/fitness-coach_*.db ./
```

---

## 🔒 Security Best Practices

### 1. Keep System Updated

```bash
# Update packages weekly
sudo apt update && sudo apt upgrade -y

# Auto-security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 2. Configure Firewall

```bash
# Check firewall status
sudo ufw status

# Should show:
# 22/tcp (SSH)
# 80/tcp (HTTP)
# 443/tcp (HTTPS)
```

### 3. Secure SSH

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# PermitRootLogin no
# PasswordAuthentication no  # If using SSH keys
# Port 2222  # Change default port (optional)

# Restart SSH
sudo systemctl restart sshd
```

### 4. Set Up Fail2Ban

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Start service
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 🚨 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs riderlabs --err

# Check if port is in use
sudo lsof -i :5001

# Restart PM2
pm2 restart riderlabs
```

### Nginx Errors

```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check auto-renewal timer
sudo systemctl status certbot.timer
```

### Database Permission Issues

```bash
# Fix permissions
chmod 644 ~/ai-fitness-coach/server/fitness-coach.db
chown riderlabs:riderlabs ~/ai-fitness-coach/server/fitness-coach.db
```

### Out of Memory

```bash
# Check memory usage
free -h

# Add swap space (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 💰 Cost Estimate

**Digital Ocean Droplet:**
- Basic 2GB RAM: **$12/month**
- Basic 4GB RAM: **$24/month** (recommended for production)

**Additional Costs:**
- Domain name: ~$10-15/year
- SSL Certificate: **FREE** (Let's Encrypt)

**Total: ~$12-24/month + domain**

---

## 📈 Scaling Options

### Upgrade Droplet

```bash
# Power off droplet (from DO dashboard)
# Resize to larger plan
# Power back on
```

### Add Database Droplet (Future)

When you outgrow SQLite:
1. Create managed PostgreSQL database
2. Migrate data
3. Update connection string

### Add Load Balancer (High Traffic)

For multiple droplets behind load balancer.

---

## ✅ Post-Deployment Checklist

- [ ] Application accessible at https://yourdomain.com
- [ ] SSL certificate installed and auto-renewing
- [ ] Strava OAuth working
- [ ] Google Calendar sync working (if enabled)
- [ ] PM2 running and auto-starts on reboot
- [ ] Nginx serving frontend correctly
- [ ] API endpoints responding
- [ ] Database backups scheduled
- [ ] Firewall configured
- [ ] Monitoring set up
- [ ] DNS propagated
- [ ] All environment variables set

---

## 🆘 Support

**Issues?**
- Check logs: `pm2 logs riderlabs`
- Check Nginx: `sudo tail -f /var/log/nginx/error.log`
- Test API: `curl https://yourdomain.com/api/health`

**Digital Ocean Resources:**
- [Community Tutorials](https://www.digitalocean.com/community/tutorials)
- [Support Tickets](https://cloud.digitalocean.com/support/tickets)

---

**Deployment Time: ~15-30 minutes**
**Difficulty: Intermediate**
**Cost: $12-24/month**

🎉 **Your RiderLabs app is now live!**
