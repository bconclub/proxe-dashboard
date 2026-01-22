# VPS Troubleshooting Guide

## Issue: VPS showing wrong content (static page instead of Next.js app)

### Quick Diagnostic Steps

SSH into your VPS and run these commands:

```bash
# 1. Check PM2 processes
pm2 list
pm2 describe windchasers-dashboard

# 2. Check if the app is running on port 3003
curl http://localhost:3003
netstat -tlnp | grep :3003

# 3. Check deployment directory
ls -la /var/www/windchasers-proxe
ls -la /var/www/windchasers-proxe/.next

# 4. Check for static HTML files that might interfere
find /var/www/windchasers-proxe -name "*.html" -type f

# 5. Check Nginx configuration
cat /etc/nginx/sites-available/proxe.windchasers.in | grep -A 10 "location /"

# 6. Check PM2 logs
pm2 logs windchasers-dashboard --lines 50
```

### Common Issues and Fixes

#### Issue 1: PM2 process not running or wrong process

```bash
# Stop all windchasers processes
pm2 stop all
pm2 delete all

# Navigate to deployment directory
cd /var/www/windchasers-proxe

# Ensure ecosystem.config.js exists
ls -la ecosystem.config.js

# Start with ecosystem config
pm2 start ecosystem.config.js --only windchasers-dashboard

# Or start manually
PORT=3003 pm2 start npm --name windchasers-dashboard -- start

# Save PM2 config
pm2 save
```

#### Issue 2: Static HTML file interfering

```bash
# Find and remove any static HTML files
cd /var/www/windchasers-proxe
find . -name "index.html" -type f
find . -name "*.html" -type f

# If found, remove them (they shouldn't be there for Next.js)
rm -f index.html
rm -f public/*.html
```

#### Issue 3: Build incomplete or missing

```bash
cd /var/www/windchasers-proxe

# Check if .next directory exists
if [ ! -d ".next" ]; then
  echo "Build missing - rebuilding..."
  rm -rf .next node_modules/.cache
  npm ci
  npm run build
fi

# Verify build
if [ ! -f ".next/BUILD_ID" ]; then
  echo "Build incomplete - rebuilding..."
  npm run build
fi
```

#### Issue 4: Nginx serving wrong location

```bash
# Check Nginx config
sudo cat /etc/nginx/sites-available/proxe.windchasers.in

# Should have:
# location / {
#     proxy_pass http://localhost:3003;
# }

# If wrong, edit:
sudo nano /etc/nginx/sites-available/proxe.windchasers.in

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

#### Issue 5: Wrong directory being served

```bash
# Verify PM2 is using correct directory
pm2 describe windchasers-dashboard | grep "cwd"

# Should show: /var/www/windchasers-proxe

# If wrong, update ecosystem.config.js or restart with correct path
cd /var/www/windchasers-proxe
pm2 restart ecosystem.config.js --only windchasers-dashboard
```

### Full Reset Procedure

If nothing works, do a complete reset:

```bash
# 1. Stop all processes
pm2 stop all
pm2 delete all

# 2. Clean deployment directory
cd /var/www/windchasers-proxe
rm -rf .next node_modules/.cache

# 3. Reinstall dependencies
npm ci

# 4. Rebuild
npm run build

# 5. Verify build
if [ ! -f ".next/BUILD_ID" ]; then
  echo "Build failed!"
  exit 1
fi

# 6. Start with ecosystem
pm2 start ecosystem.config.js --only windchasers-dashboard
pm2 save

# 7. Wait and check
sleep 10
curl http://localhost:3003/api/health
pm2 logs windchasers-dashboard --lines 20
```

### Verify Deployment

After fixing, verify:

```bash
# 1. Check PM2
pm2 list | grep windchasers-dashboard

# 2. Check port
curl -I http://localhost:3003

# 3. Check health endpoint
curl http://localhost:3003/api/health

# 4. Check from browser
# Visit: https://proxe.windchasers.in
# Should see the dashboard, not a static page
```

### Run Diagnostic Script

A diagnostic script is available:

```bash
cd /var/www/windchasers-proxe
chmod +x scripts/check-vps-status.sh
./scripts/check-vps-status.sh
```

This will show:
- PM2 process status
- Directory contents
- Build status
- Port status
- Health check
- Nginx configuration
