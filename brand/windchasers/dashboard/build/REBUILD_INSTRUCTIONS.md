# Manual Rebuild Instructions

If you're experiencing chunk loading errors (400 Bad Request, ChunkLoadError), follow these steps to manually rebuild on the VPS.

## Quick Fix: Run Rebuild Script

SSH into your VPS and run:

```bash
cd /var/www/windchasers-proxe
bash scripts/rebuild-on-vps.sh
```

This script will:
1. Stop the application
2. Clean all build artifacts
3. Reinstall dependencies
4. Rebuild the application
5. Verify the build
6. Restart the application

## Manual Steps (if script doesn't work)

### 1. SSH into VPS

```bash
ssh user@your-vps-ip
```

### 2. Navigate to dashboard directory

```bash
cd /var/www/windchasers-proxe
```

### 3. Stop the application

```bash
pm2 stop windchasers-dashboard
# OR if using ecosystem:
pm2 stop ecosystem.config.js --only windchasers-dashboard
```

### 4. Clean build artifacts

```bash
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache 2>/dev/null || true
```

### 5. Reinstall dependencies

```bash
npm ci
```

### 6. Rebuild

```bash
npm run build
```

### 7. Verify build

```bash
# Check if .next directory exists
ls -la .next

# Check chunk count
find .next/static/chunks -name "*.js" | wc -l
# Should show many chunks (50+)

# Check BUILD_ID
cat .next/BUILD_ID
```

### 8. Restart application

```bash
# If using ecosystem:
pm2 restart ecosystem.config.js --only windchasers-dashboard

# OR if using individual process:
PORT=3003 pm2 restart windchasers-proxe
```

### 9. Verify health

```bash
# Check health endpoint
curl http://localhost:3003/api/health

# Check PM2 status
pm2 status

# View logs
pm2 logs windchasers-dashboard --lines 50
```

## Check Build Health via API

After rebuilding, check the health endpoint:

```bash
curl http://localhost:3003/api/health
```

Or visit in browser:
- `http://your-vps-ip:3003/api/health`
- `https://proxe.windchasers.in/api/health`

The response should show:
```json
{
  "status": "healthy",
  "checks": {
    "buildDirectoryExists": true,
    "chunksDirectoryExists": true,
    "buildIdExists": true,
    "chunkCount": 150  // Should be many chunks
  }
}
```

## Common Issues

### Issue: Still getting chunk errors after rebuild

**Solution**: Clear browser cache
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear site data in browser settings

### Issue: Build fails with errors

**Solution**: Check logs
```bash
pm2 logs windchasers-dashboard --lines 100
npm run build 2>&1 | tee build.log
```

### Issue: Chunk count is very low (< 10)

**Solution**: Build is incomplete
```bash
# Clean everything and try again
rm -rf .next node_modules/.cache
npm ci
npm run build
```

### Issue: Port already in use

**Solution**: Check what's using the port
```bash
netstat -tlnp | grep :3003
# Kill the process or use different port
```

## Trigger GitHub Actions Deployment

Alternatively, you can trigger a fresh deployment via GitHub Actions:

1. Go to GitHub repository
2. Navigate to "Actions" tab
3. Select "Deploy Windchasers Dashboard" workflow
4. Click "Run workflow"
5. Select branch (production or main)
6. Click "Run workflow"

This will automatically:
- Clean the build
- Rebuild on VPS
- Verify chunks
- Restart the app
