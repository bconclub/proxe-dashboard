# Fix Next.js Static Assets 404 Errors

## Problem
Getting 404 errors for:
1. Next.js static chunks: `GET http://localhost:4001/_next/static/chunks/... net::ERR_ABORTED 404 (Not Found)`
2. Pages/routes: `404: This page could not be found` when accessing `/auth/login` or other routes

## Solution

### Quick Fix (Development)

1. **Stop the dev server** (Ctrl+C in the terminal running `npm run dev`)

2. **Kill any remaining processes:**
   ```bash
   pkill -f "next dev -p 4001"
   ```

3. **Clear the build cache:**
   ```bash
   cd brand/windchasers/dashboard/build
   rm -rf .next
   rm -rf node_modules/.cache
   ```

4. **Restart the dev server:**
   ```bash
   npm run dev:dashboard
   ```

   Or if using the combined dev command:
   ```bash
   npm run dev
   ```

5. **Wait for the build to complete** - You should see:
   ```
   ✓ Compiled /auth/login in XXXms
   ✓ Compiled /dashboard in XXXms
   ```

6. **Verify routes are working:**
   ```bash
   curl http://localhost:4001/auth/login
   # Should return HTML, not 404
   ```

7. **Hard refresh the browser** (Ctrl+Shift+R or Cmd+Shift+R)

### Alternative: Use the Restart Script

```bash
cd brand/windchasers/dashboard/build
./scripts/restart-dev-server.sh
```

### Alternative: Use the Fix Script

```bash
cd brand/windchasers/dashboard/build
./scripts/fix-static-assets.sh
npm run dev:dashboard
```

### If Still Not Working

1. **Check if port 4001 is already in use:**
   ```bash
   lsof -i :4001
   # Kill any process using port 4001
   kill -9 <PID>
   ```

2. **Verify Next.js is installed:**
   ```bash
   npm list next
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check for TypeScript/ESLint errors:**
   ```bash
   npm run type-check
   npm run lint
   ```

## Why This Happens

- The `.next` directory contains compiled Next.js code
- In development, Next.js generates chunks on-demand
- If the dev server isn't running or was interrupted, chunks won't be generated
- Old/incomplete builds can cause 404 errors

## Prevention

- Always stop the dev server cleanly (Ctrl+C)
- Don't delete `.next` while the dev server is running
- If you see build errors, fix them before continuing
