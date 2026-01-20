#!/bin/bash
# Manual rebuild script for VPS
# Run this on the VPS to force a clean rebuild

set -e

echo "🔄 Starting manual rebuild on VPS..."

cd /var/www/windchasers-proxe

# Stop the app
echo "⏹️  Stopping application..."
pm2 stop windchasers-dashboard || pm2 stop ecosystem.config.js --only windchasers-dashboard || echo "App not running"

# Clean everything
echo "🧹 Cleaning build artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build
echo "🏗️  Building application..."
npm run build

# Verify build
if [ ! -d ".next" ]; then
  echo "❌ ERROR: Build failed - .next directory not found!"
  exit 1
fi

CHUNK_COUNT=$(find .next/static/chunks -name "*.js" 2>/dev/null | wc -l)
if [ "$CHUNK_COUNT" -lt 10 ]; then
  echo "⚠️  WARNING: Only $CHUNK_COUNT chunks found, build might be incomplete"
else
  echo "✅ Found $CHUNK_COUNT chunk files"
fi

# Restart
echo "🔄 Restarting application..."
if [ -f ecosystem.config.js ]; then
  pm2 restart ecosystem.config.js --only windchasers-dashboard || \
  pm2 start ecosystem.config.js --only windchasers-dashboard
else
  PORT=3003 pm2 restart windchasers-proxe || \
  PORT=3003 pm2 start npm --name windchasers-proxe -- start
fi

pm2 save

echo "✅ Rebuild complete!"
echo "📊 PM2 status:"
pm2 list | grep windchasers
