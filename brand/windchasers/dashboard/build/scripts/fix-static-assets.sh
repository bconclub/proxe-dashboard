#!/bin/bash

# Fix Next.js static assets 404 errors
# This script clears the build cache and rebuilds

echo "🔧 Fixing Next.js static assets..."

cd "$(dirname "$0")/.." || exit 1

# Stop any running dev server
echo "📦 Stopping any running processes..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Clear Next.js cache
echo "🧹 Clearing .next directory..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache 2>/dev/null || true

echo "✅ Cache cleared"

# Check if we're in dev mode or need to build
if [ "$1" == "build" ]; then
  echo "🏗️  Building for production..."
  npm run build
  
  if [ ! -d ".next" ]; then
    echo "❌ ERROR: Build failed - .next directory not found!"
    exit 1
  fi
  
  echo "✅ Build complete"
else
  echo "🚀 Starting dev server..."
  echo "   Run: npm run dev:dashboard"
  echo ""
  echo "   The dev server will automatically generate .next directory"
fi

echo ""
echo "✅ Done! Restart your dev server with:"
echo "   npm run dev:dashboard"
