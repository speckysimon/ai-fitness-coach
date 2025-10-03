# Docker Deployment Guide

This guide covers deploying the AI Fitness Coach using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ available RAM
- Port 5000 (and optionally 80/443) available

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/speckysimon/ai-fitness-coach.git
cd ai-fitness-coach

# Copy and configure environment variables
cp .env.example .env
nano .env  # Add your API keys
```

### 2. Build and Run

```bash
# Build the Docker image
npm run docker:build

# Start the application
npm run docker:run

# View logs
npm run docker:logs
```

The application will be available at:
- API: http://localhost:5000
- Frontend: http://localhost:80 (if using nginx)

### 3. Stop the Application

```bash
npm run docker:stop
```

## Docker Compose Options

### Option 1: Backend Only (Simplest)

Edit `docker-compose.yml` and comment out the nginx service:

```yaml
services:
  ai-fitness-coach:
    # ... keep this service
  
  # nginx:
  #   ... comment out nginx service
```

Then run:
```bash
docker-compose up -d ai-fitness-coach
```

Access at: http://localhost:5000

### Option 2: Backend + Nginx (Recommended)

Keep both services in `docker-compose.yml`:

```bash
docker-compose up -d
```

Access at: http://localhost:80

## Environment Variables

Create a `.env` file with:

```env
# Server
NODE_ENV=production
PORT=5000

# Strava
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=http://your-domain:5000/api/auth/strava/callback

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://your-domain:5000/api/google/callback

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Session
SESSION_SECRET=$(openssl rand -hex 32)

# Database
DATABASE_PATH=/app/data/fitness-coach.db

# Frontend
FRONTEND_URL=http://your-domain
```

## Data Persistence

Data is persisted in the following directories:

- `./data/` - SQLite database
- `./tokens/` - OAuth tokens

These are mounted as volumes in the container.

## Raspberry Pi Deployment

### Install Docker on Raspberry Pi

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose

# Reboot
sudo reboot
```

### Deploy

```bash
cd ~/ai-fitness-coach

# Build for ARM architecture
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Auto-start on Boot

Docker Compose services with `restart: unless-stopped` will automatically start on boot.

## Updating

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ai-fitness-coach

# Last 100 lines
docker-compose logs --tail=100 ai-fitness-coach
```

### Check Health

```bash
# Container status
docker-compose ps

# Health check
curl http://localhost:5000/api/health

# Resource usage
docker stats
```

### Enter Container

```bash
docker-compose exec ai-fitness-coach sh
```

## Backup

### Database Backup

```bash
# Create backup
docker-compose exec ai-fitness-coach cp /app/data/fitness-coach.db /app/data/backup-$(date +%Y%m%d).db

# Copy to host
docker cp ai-fitness-coach:/app/data/fitness-coach.db ./backup.db
```

### Automated Backups

Create a cron job:

```bash
crontab -e
```

Add:
```cron
# Daily backup at 2 AM
0 2 * * * cd ~/ai-fitness-coach && docker-compose exec -T ai-fitness-coach cp /app/data/fitness-coach.db /app/data/backup-$(date +\%Y\%m\%d).db
```

## SSL/HTTPS Setup

### Using Let's Encrypt with Nginx

1. **Update nginx.conf** to use your domain
2. **Install Certbot**:

```bash
sudo apt install -y certbot
```

3. **Get certificate**:

```bash
sudo certbot certonly --standalone -d your-domain.com
```

4. **Copy certificates**:

```bash
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
```

5. **Update nginx.conf** to enable HTTPS section

6. **Restart**:

```bash
docker-compose restart nginx
```

## Troubleshooting

### Port Already in Use

```bash
# Find process
sudo lsof -i :5000

# Or change port in .env
PORT=5001
```

### Container Won't Start

```bash
# Check logs
docker-compose logs ai-fitness-coach

# Rebuild
docker-compose build --no-cache
```

### Database Permission Issues

```bash
# Fix permissions
sudo chown -R 1001:1001 data/
```

### Memory Issues on Raspberry Pi

Edit `docker-compose.yml`:

```yaml
services:
  ai-fitness-coach:
    # ... other config
    deploy:
      resources:
        limits:
          memory: 512M
```

## Advanced Configuration

### Custom Network

```yaml
networks:
  ai-fitness-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Multiple Instances

Use different ports:

```yaml
services:
  ai-fitness-coach-1:
    ports:
      - "5001:5000"
  
  ai-fitness-coach-2:
    ports:
      - "5002:5000"
```

### External Database

If using an external database, update environment variables and remove the volume mount.

## Security Best Practices

- [ ] Use strong SESSION_SECRET
- [ ] Enable HTTPS in production
- [ ] Restrict exposed ports
- [ ] Regular updates: `docker-compose pull`
- [ ] Monitor logs for suspicious activity
- [ ] Use Docker secrets for sensitive data
- [ ] Run security scans: `docker scan ai-fitness-coach`

## Performance Optimization

### Build Optimization

```dockerfile
# Use multi-stage builds (already implemented)
# Minimize layers
# Use .dockerignore
```

### Runtime Optimization

```yaml
services:
  ai-fitness-coach:
    environment:
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=512
```

## Useful Commands

```bash
# View all containers
docker ps -a

# Remove stopped containers
docker-compose down --remove-orphans

# Clean up unused images
docker image prune -a

# Full cleanup
docker system prune -a --volumes

# Export container
docker export ai-fitness-coach > backup.tar

# Import container
docker import backup.tar
```
