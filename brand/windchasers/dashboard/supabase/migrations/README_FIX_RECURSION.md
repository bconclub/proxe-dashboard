# Fix Infinite Recursion Error in dashboard_users RLS Policy

## Error Message
```
infinite recursion detected in policy for relation "dashboard_users"
```

## Cause
The RLS (Row Level Security) policies on `dashboard_users` table are checking the same table they're protecting, causing infinite recursion.

## Solution
Run the migration `010_fix_dashboard_users_rls_recursion.sql` to fix this issue.

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `brand/windchasers/dashboard/supabase/migrations/010_fix_dashboard_users_rls_recursion.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute

### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
cd brand/windchasers/dashboard
supabase db push
```

### Option 3: Direct SQL Execution
1. Connect to your Supabase database
2. Run the SQL from `010_fix_dashboard_users_rls_recursion.sql`

## What the Migration Does
1. **Drops** the problematic RLS policies that cause recursion
2. **Creates** a `SECURITY DEFINER` function `is_admin()` that bypasses RLS to check admin status
3. **Recreates** the policies using the function (avoiding recursion)
4. **Updates** related policies in `dashboard_settings` and `user_invitations` tables

## Verification
After applying the migration:
1. Check the System Status page at `/dashboard/status`
2. Database Status should show "OK" instead of "ERROR"
3. The error should no longer appear in logs

## Migration File Location
`brand/windchasers/dashboard/supabase/migrations/010_fix_dashboard_users_rls_recursion.sql`
