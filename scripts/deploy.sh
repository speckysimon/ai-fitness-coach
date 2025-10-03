#!/bin/bash
# Deployment script for updates

set -e

echo "🚀 Deploying AI Fitness Coach..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Restart service
echo "🔄 Restarting service..."
sudo systemctl restart ai-fitness-coach

# Check status
echo "✅ Deployment complete!"
sudo systemctl status ai-fitness-coach --no-pager
