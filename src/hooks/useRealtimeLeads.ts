'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface Lead {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  source: string | null
  first_touchpoint: string | null
  last_touchpoint: string | null
  brand: string | null
  timestamp: string
  last_interaction_at: string | null
  booking_date: string | null
  booking_time: string | null
  status: string | null
  metadata?: any
  unified_context?: any
  lead_score?: number | null
  lead_stage?: string | null
  sub_stage?: string | null
  stage_override?: boolean | null
  last_scored_at?: string | null
  is_active_chat?: boolean | null
}

export function useRealtimeLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch
    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase
          .from('unified_leads')
          .select('*')
          .order('last_interaction_at', { ascending: false })
          .limit(1000)

        if (error) {
          // Provide more helpful error messages
          console.error('Supabase error:', error)
          
          if (error.message.includes('relation') || error.message.includes('does not exist') || error.code === '42P01') {
            throw new Error('The unified_leads view does not exist. Please run the database migrations in supabase/migrations/')
          }
          if (error.message.includes('permission denied') || error.message.includes('RLS') || error.code === '42501') {
            throw new Error('Permission denied. Please check your Row Level Security (RLS) policies.')
          }
          if (error.message.includes('JWT') || error.message.includes('Invalid API key')) {
            throw new Error('Invalid Supabase configuration. Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
          }
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Unable to connect to Supabase. Please check your internet connection and Supabase project status.')
          }
          throw new Error(error.message || 'Failed to fetch leads')
        }
        
        // Map unified_leads data to include source field
        const mappedLeads = (data || []).map((lead: any) => ({
          ...lead,
          source: lead.first_touchpoint || lead.last_touchpoint || 'web',
        }))
        
        setLeads(mappedLeads)
        setLoading(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leads'
        console.error('Error fetching leads:', err)
        setError(errorMessage)
        setLoading(false)
      }
    }

    fetchLeads()

    // Subscribe to real-time changes from all_leads table
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'all_leads',
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          // On change, refetch from unified_leads view to get complete data
          try {
            const { data, error } = await supabase
              .from('unified_leads')
              .select('*')
              .order('last_interaction_at', { ascending: false })
              .limit(1000)

            if (!error && data) {
              // Map unified_leads data to include source field
              const mappedLeads = data.map((lead: any) => ({
                ...lead,
                source: lead.first_touchpoint || lead.last_touchpoint || 'web',
              }))
              setLeads(mappedLeads)
            }
          } catch (err) {
            console.error('Error refetching leads after realtime update:', err)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { leads, loading, error }
}


