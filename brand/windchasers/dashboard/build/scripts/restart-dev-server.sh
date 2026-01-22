#!/bin/bash

# Restart Next.js dev server to fix 404 routing issues

echo "🔄 Restarting Windchasers Dashboard dev server..."

cd "$(dirname "$0")/.." || exit 1

# Find and kill existing dev server on port 4001
echo "🛑 Stopping existing dev server..."
pkill -f "next dev -p 4001" 2>/dev/null || true
sleep 2

# Clear .next directory to force rebuild
echo "🧹 Clearing build cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Cache cleared"

# Start dev server in background
echo "🚀 Starting dev server on port 4001..."
npm run dev:dashboard > /tmp/windchasers-dashboard-dev.log 2>&1 &

# Wait a moment for server to start
sleep 5

# Check if server started
if curl -s http://localhost:4001 > /dev/null 2>&1; then
  echo "✅ Dev server is running on http://localhost:4001"
  echo ""
  echo "📋 Logs are being written to: /tmp/windchasers-dashboard-dev.log"
  echo "   View logs with: tail -f /tmp/windchasers-dashboard-dev.log"
else
  echo "❌ Dev server failed to start"
  echo "   Check logs: cat /tmp/windchasers-dashboard-dev.log"
  exit 1
fi
