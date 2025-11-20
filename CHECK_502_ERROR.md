# Check 502 Error - Step by Step

## Step 1: Check PM2 Logs on VPS

SSH into your VPS and run:

```bash
pm2 logs dashboard --lines 100
```

**Look for these errors:**

### Error 1: "Could not find the table 'public.unified_leads'"
**Solution:** Run the SQL migration in Supabase:
1. Go to https://supabase.com/dashboard
2. SQL Editor → New query
3. Copy entire contents of `supabase/migrations/008_update_unified_leads_view.sql`
4. Paste and Run
5. Wait for success
6. Restart: `pm2 restart dashboard`

### Error 2: "Could not find a production build"
**Solution:** Build failed or .next missing:
```bash
cd /var/www/dashboard
npm run build
pm2 restart dashboard
```

### Error 3: "EADDRINUSE" or port conflict
**Solution:** Port 3000 is in use:
```bash
lsof -ti:3000 | xargs kill -9
pm2 restart dashboard
```

### Error 4: Runtime error (JavaScript/TypeScript)
**Solution:** Check the exact error message in logs and share it.

## Step 2: Verify unified_leads View Exists

Run this in Supabase SQL Editor:

```sql
SELECT * FROM unified_leads LIMIT 1;
```

- ✅ **If it works** → View exists, check other issues
- ❌ **If error** → View doesn't exist, run migration `008_update_unified_leads_view.sql`

## Step 3: Check Environment Variables

On VPS:
```bash
cd /var/www/dashboard
cat .env.local
```

Should have:
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `PORT=3001`

## Step 4: Check if App is Running

```bash
pm2 status
netstat -tlnp | grep 3001
```

Should show:
- PM2 process running
- Port 3001 listening

## Step 5: Manual Restart

```bash
cd /var/www/dashboard
pm2 stop dashboard
pm2 delete dashboard
PORT=3001 pm2 start npm --name dashboard -- start
pm2 logs dashboard
```

## Most Common Issue

**90% of 502 errors are because `unified_leads` view doesn't exist.**

**Quick fix:**
1. Run `supabase/migrations/008_update_unified_leads_view.sql` in Supabase
2. Restart: `pm2 restart dashboard`

## Share the Error

If still not working, share the output of:
```bash
pm2 logs dashboard --lines 100
```

This will show the exact error message.

