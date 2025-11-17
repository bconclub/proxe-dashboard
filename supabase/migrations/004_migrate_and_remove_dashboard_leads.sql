-- Migration: Migrate dashboard_leads to sessions and remove dashboard_leads table
-- This migration moves any existing data from dashboard_leads to sessions table
-- and then drops the dashboard_leads table since we're now using sessions as the master table

-- Step 1: Migrate existing dashboard_leads data to sessions table
-- Only migrate if sessions table exists and dashboard_leads has data
DO $$
DECLARE
  lead_count INTEGER;
BEGIN
  -- Check if dashboard_leads table exists and has data
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'dashboard_leads'
  ) THEN
    -- Count existing leads
    SELECT COUNT(*) INTO lead_count FROM dashboard_leads;
    
    IF lead_count > 0 THEN
      -- Migrate data from dashboard_leads to sessions
      -- Map dashboard_leads fields to sessions structure
      INSERT INTO sessions (
        id,
        external_session_id,
        user_name,
        email,
        phone,
        channel,
        booking_date,
        booking_time,
        booking_status,
        channel_data,
        created_at,
        updated_at
      )
      SELECT 
        dl.id,
        -- Generate external_session_id from id if not exists
        COALESCE(
          dl.metadata->>'external_session_id',
          'migrated_' || dl.id::text
        ) AS external_session_id,
        dl.name AS user_name,
        dl.email,
        dl.phone,
        dl.source AS channel, -- Map source to channel
        dl.booking_date,
        dl.booking_time,
        -- Map status to booking_status
        CASE 
          WHEN dl.status = 'booked' THEN 'confirmed'
          WHEN dl.status = 'pending' THEN 'pending'
          WHEN dl.status = 'cancelled' THEN 'cancelled'
          ELSE NULL
        END AS booking_status,
        -- Store original metadata and chat_session_id in channel_data
        jsonb_build_object(
          'original_metadata', COALESCE(dl.metadata, '{}'::jsonb),
          'chat_session_id', dl.chat_session_id,
          'notes', dl.notes,
          'original_status', dl.status,
          'migrated_from', 'dashboard_leads'
        ) AS channel_data,
        dl.created_at,
        dl.created_at AS updated_at
      FROM dashboard_leads dl
      WHERE NOT EXISTS (
        -- Don't migrate if session already exists with this ID
        SELECT 1 FROM sessions s WHERE s.id = dl.id
      )
      ON CONFLICT (external_session_id) DO NOTHING;
      
      RAISE NOTICE 'Migrated % leads from dashboard_leads to sessions', lead_count;
    ELSE
      RAISE NOTICE 'dashboard_leads table is empty, no migration needed';
    END IF;
  END IF;
END $$;

-- Step 2: Remove dashboard_leads from realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'dashboard_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE dashboard_leads;
  END IF;
END $$;

-- Step 3: Drop RLS policies for dashboard_leads
DROP POLICY IF EXISTS "Authenticated users can view dashboard_leads" ON dashboard_leads;
DROP POLICY IF EXISTS "Authenticated users can insert dashboard_leads" ON dashboard_leads;
DROP POLICY IF EXISTS "Authenticated users can update dashboard_leads" ON dashboard_leads;

-- Step 4: Drop indexes for dashboard_leads
DROP INDEX IF EXISTS idx_dashboard_leads_created_at;
DROP INDEX IF EXISTS idx_dashboard_leads_source;
DROP INDEX IF EXISTS idx_dashboard_leads_status;
DROP INDEX IF EXISTS idx_dashboard_leads_booking_date;
DROP INDEX IF EXISTS idx_dashboard_leads_chat_session_id;

-- Step 5: Drop dashboard_leads table
DROP TABLE IF EXISTS dashboard_leads CASCADE;

