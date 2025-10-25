#!/bin/bash
# Quick deployment script for RiderLabs on DigitalOcean
# Run this on your droplet as the riderlabs user
# Usage: ./QUICK_DEPLOY.sh

set -e  # Exit on any error

echo "🚀 Starting RiderLabs deployment..."
echo ""

# Navigate to project directory
echo "📂 Navigating to project directory..."
cd ~/ai-fitness-coach || { echo "❌ Project directory not found"; exit 1; }

# Show current branch and commit
echo "📍 Current status:"
git branch --show-current
git log -1 --oneline
echo ""

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }
echo ""

# Install dependencies (including dev dependencies for build)
echo "📦 Installing dependencies..."
echo "⚠️  Using 'npm install' (not 'npm ci --production') to get dev deps for build"
npm install || { echo "❌ npm install failed"; exit 1; }
echo ""

# Build frontend
echo "🏗️  Building frontend with Vite..."
npm run build || { echo "❌ Build failed"; exit 1; }
echo ""

# Run database migrations
echo "💾 Running database migrations..."
node server/migrations/run-migrations.js || { echo "⚠️  Migration warning (may be okay if already applied)"; }
echo ""

# Restart application with PM2 and reload env vars
echo "🔄 Restarting application with PM2..."
pm2 restart riderlabs --update-env || { echo "❌ PM2 restart failed"; exit 1; }
echo ""

# Wait a moment for app to start
echo "⏳ Waiting for app to start..."
sleep 3

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status
echo ""

# Show recent logs
echo "📋 Recent logs (last 20 lines):"
pm2 logs riderlabs --lines 20 --nostream
echo ""

# Final status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Site: https://riderlabs.io"
echo "💡 Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)"
echo "📊 View logs: pm2 logs riderlabs"
echo "📈 Monitor: pm2 monit"
echo ""
