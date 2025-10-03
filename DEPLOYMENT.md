# Deployment Guide

This guide covers two deployment scenarios:
1. **Development Setup** - Opening the project in Windsurf on a different computer
2. **Production Deployment** - Running on a Raspberry Pi as an always-on server

## Table of Contents
- [Development Setup](#development-setup)
- [Raspberry Pi Deployment](#raspberry-pi-deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/speckysimon/ai-fitness-coach.git
   cd ai-fitness-coach
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your API keys and credentials (see [Environment Variables](#environment-variables))

4. **Initialize the database**
   The SQLite database will be created automatically on first run.

5. **Run in development mode**
   ```bash
   npm run dev
   ```
   This starts both the backend server (port 5000) and frontend dev server (port 5173)

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

---

## Raspberry Pi Deployment

### Prerequisites
- Raspberry Pi 3B+ or newer (4GB RAM recommended)
- Raspberry Pi OS (64-bit recommended)
- Node.js 18+ installed
- Domain name or Dynamic DNS (optional but recommended)
- SSL certificate (for production use with Strava OAuth)

### Initial Setup

1. **Update your Raspberry Pi**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js 18+**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   node --version  # Should be 18.x or higher
   ```

3. **Install Git**
   ```bash
   sudo apt install -y git
   ```

4. **Clone the repository**
   ```bash
   cd ~
   git clone https://github.com/speckysimon/ai-fitness-coach.git
   cd ai-fitness-coach
   ```

5. **Install dependencies**
   ```bash
   npm install --production
   ```

6. **Build the frontend**
   ```bash
   npm run build
   ```
   This creates optimized production files in the `dist/` directory.

### Configuration

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   nano .env
   ```
   Configure all required variables (see [Environment Variables](#environment-variables))

2. **Update Strava OAuth redirect URLs**
   - Go to https://www.strava.com/settings/api
   - Update Authorization Callback Domain to your Pi's domain/IP
   - Example: `http://your-pi-ip:5000/api/auth/strava/callback`

### Running as a Service (Recommended)

Create a systemd service to run the app automatically and restart on failure.

1. **Create service file**
   ```bash
   sudo nano /etc/systemd/system/ai-fitness-coach.service
   ```

2. **Add the following content** (adjust paths as needed):
   ```ini
   [Unit]
   Description=AI Fitness Coach
   After=network.target

   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/home/pi/ai-fitness-coach
   ExecStart=/usr/bin/node server/index.js
   Restart=always
   RestartSec=10
   StandardOutput=journal
   StandardError=journal
   SyslogIdentifier=ai-fitness-coach
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start the service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable ai-fitness-coach
   sudo systemctl start ai-fitness-coach
   ```

4. **Check service status**
   ```bash
   sudo systemctl status ai-fitness-coach
   ```

5. **View logs**
   ```bash
   sudo journalctl -u ai-fitness-coach -f
   ```

### Serving the Frontend

You have two options:

#### Option A: Serve via Express (Simpler)
Add this to your `server/index.js` before the `app.listen()` call:

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
```

#### Option B: Use Nginx (Production-grade)

1. **Install Nginx**
   ```bash
   sudo apt install -y nginx
   ```

2. **Create Nginx configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/ai-fitness-coach
   ```

3. **Add configuration**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # or your Pi's IP

       # Frontend
       location / {
           root /home/pi/ai-fitness-coach/dist;
           try_files $uri $uri/ /index.html;
       }

       # API proxy
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Enable the site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/ai-fitness-coach /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### SSL Setup (Recommended for Production)

1. **Install Certbot**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Obtain SSL certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal is configured automatically**
   ```bash
   sudo certbot renew --dry-run
   ```

### Performance Optimization for Raspberry Pi

1. **Enable swap (if needed)**
   ```bash
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile
   # Set CONF_SWAPSIZE=2048
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```

2. **Limit Node.js memory usage**
   Update the systemd service file:
   ```ini
   ExecStart=/usr/bin/node --max-old-space-size=512 server/index.js
   ```

3. **Use PM2 for process management (Alternative to systemd)**
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name ai-fitness-coach
   pm2 startup
   pm2 save
   ```

### Backup Strategy

1. **Database backups**
   ```bash
   # Create backup script
   nano ~/backup-db.sh
   ```

   ```bash
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   cp ~/ai-fitness-coach/server/fitness-coach.db ~/backups/fitness-coach_$DATE.db
   # Keep only last 7 days
   find ~/backups -name "fitness-coach_*.db" -mtime +7 -delete
   ```

   ```bash
   chmod +x ~/backup-db.sh
   # Add to crontab (daily at 2 AM)
   crontab -e
   # Add: 0 2 * * * /home/pi/backup-db.sh
   ```

### Monitoring

1. **Check system resources**
   ```bash
   htop
   ```

2. **Monitor logs**
   ```bash
   sudo journalctl -u ai-fitness-coach -f
   ```

3. **Check service health**
   ```bash
   curl http://localhost:5000/api/health
   ```

---

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Strava API
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=http://your-domain:5000/api/auth/strava/callback

# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://your-domain:5000/api/google/callback

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Session Secret (generate a random string)
SESSION_SECRET=your_random_secret_string

# Database (optional, defaults to ./server/fitness-coach.db)
DATABASE_PATH=./server/fitness-coach.db

# Frontend URL (for CORS)
FRONTEND_URL=http://your-domain
```

### Generating Secure Secrets

```bash
# Generate a random session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000
# Kill the process
sudo kill -9 <PID>
```

### Database Permission Issues
```bash
# Fix permissions
chmod 644 server/fitness-coach.db
chown pi:pi server/fitness-coach.db
```

### Service Won't Start
```bash
# Check logs
sudo journalctl -u ai-fitness-coach -n 50
# Check syntax
node server/index.js
```

### Memory Issues on Raspberry Pi
- Reduce Node.js memory limit
- Enable swap space
- Close unnecessary services
- Consider upgrading to Pi 4 with 4GB+ RAM

### Strava OAuth Fails
- Verify redirect URI matches exactly in Strava settings
- Check that your domain is accessible from the internet
- Ensure SSL is configured if using HTTPS

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Updating the Application

### Development
```bash
git pull origin main
npm install
npm run dev
```

### Production (Raspberry Pi)
```bash
cd ~/ai-fitness-coach
git pull origin main
npm install --production
npm run build
sudo systemctl restart ai-fitness-coach
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong SESSION_SECRET
- [ ] Enable firewall (ufw)
- [ ] Keep system updated
- [ ] Use SSL/HTTPS in production
- [ ] Restrict database file permissions
- [ ] Don't commit .env file
- [ ] Regular backups
- [ ] Monitor logs for suspicious activity

---

## Additional Resources

- [Raspberry Pi Documentation](https://www.raspberrypi.org/documentation/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Strava API Documentation](https://developers.strava.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
