-- Update unified_leads View to Include Sessions and Channel Session Tables
-- This migration updates the unified_leads view to pull from sessions table
-- and includes channel-specific session tables

-- Drop existing view
DROP VIEW IF EXISTS unified_leads;

-- Recreate unified_leads view based on sessions table structure
-- Sessions table is the master table with all session data
-- Channel session tables (web_sessions, whatsapp_sessions, etc.) are JOIN tables that reference sessions
-- We query sessions directly and use the channel column to determine the source
CREATE OR REPLACE VIEW unified_leads AS
SELECT 
  s.id,
  s.user_name AS name,
  s.email,
  s.phone,
  s.channel AS source,
  s.created_at AS timestamp,
  -- Map booking_status to status for compatibility
  CASE 
    WHEN s.booking_status = 'confirmed' THEN 'booked'
    WHEN s.booking_status = 'pending' THEN 'pending'
    WHEN s.booking_status = 'cancelled' THEN 'cancelled'
    ELSE NULL
  END AS status,
  s.booking_date,
  s.booking_time,
  s.channel AS lead_type,
  -- Combine channel_data and other metadata into metadata JSONB
  COALESCE(
    jsonb_build_object(
      'conversation_summary', s.conversation_summary,
      'user_inputs_summary', s.user_inputs_summary,
      'message_count', s.message_count,
      'last_message_at', s.last_message_at,
      'google_event_id', s.google_event_id,
      'booking_created_at', s.booking_created_at,
      'brand', s.brand,
      'website_url', s.website_url,
      'channel_data', s.channel_data
    ),
    '{}'::jsonb
  ) AS metadata
FROM sessions s
WHERE (
  s.user_name IS NOT NULL 
  OR s.email IS NOT NULL 
  OR s.phone IS NOT NULL
);

-- Grant access to authenticated users
GRANT SELECT ON unified_leads TO authenticated;

-- Add RLS policies for sessions table if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND policyname = 'Authenticated users can view sessions'
  ) THEN
    ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can view sessions"
      ON sessions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Add RLS policies for channel session tables
DO $$
BEGIN
  -- Web sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'web_sessions' 
    AND policyname = 'Authenticated users can view web_sessions'
  ) THEN
    ALTER TABLE web_sessions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can view web_sessions"
      ON web_sessions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  -- WhatsApp sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'whatsapp_sessions' 
    AND policyname = 'Authenticated users can view whatsapp_sessions'
  ) THEN
    ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can view whatsapp_sessions"
      ON whatsapp_sessions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  -- Voice sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'voice_sessions' 
    AND policyname = 'Authenticated users can view voice_sessions'
  ) THEN
    ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can view voice_sessions"
      ON voice_sessions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  -- Social sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'social_sessions' 
    AND policyname = 'Authenticated users can view social_sessions'
  ) THEN
    ALTER TABLE social_sessions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can view social_sessions"
      ON social_sessions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Note: Indexes are already created in the main sessions migration:
-- - sessions_channel_idx (on channel column)
-- - sessions_created_at_idx (on created_at column)
-- - sessions_brand_idx (on brand column)
-- - sessions_booking_date_idx (on booking_date column)
-- No additional indexes needed here

-- Enable Realtime for sessions table and channel session tables
-- Note: These commands will fail silently if tables are already in the publication
DO $$
BEGIN
  -- Add sessions table to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
  END IF;

  -- Add channel session tables to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'web_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE web_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'whatsapp_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'voice_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE voice_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'social_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_sessions;
  END IF;
END $$;

