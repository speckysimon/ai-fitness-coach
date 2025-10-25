#!/bin/bash
# Quick deployment script for RiderLabs on DigitalOcean
# Run this on your droplet as the riderlabs user
# Usage: ./QUICK_DEPLOY.sh

echo "🚀 Starting deployment..."

# Navigate to project directory
cd ~/ai-fitness-coach || exit 1

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install dependencies (including dev dependencies for build)
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Run database migrations
echo "💾 Running database migrations..."
node server/migrations/run-migrations.js

# Restart application with PM2 and reload env vars
echo "🔄 Restarting application..."
pm2 restart riderlabs --update-env

# Show logs
echo "📊 Deployment complete! Showing logs..."
pm2 logs riderlabs --lines 30

echo ""
echo "✅ Deployment finished!"
echo "🌐 Check your site: https://riderlabs.io"
echo "💡 Hard refresh browser (Cmd+Shift+R) to clear cache"
