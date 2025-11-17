import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { channel: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const channel = params.channel

    // Validate channel
    const validChannels = ['web', 'whatsapp', 'voice', 'social']
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel' },
        { status: 400 }
      )
    }

    // Get sessions for this specific channel from the sessions table
    // Channel session tables (web_sessions, etc.) are JOIN tables that reference sessions
    // We query sessions directly filtered by channel column
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('channel', channel)

    if (sessionsError) throw sessionsError

    // Map session data to unified_leads format
    const leads = sessions?.map((session: any) => ({
      id: session.id,
      name: session.user_name || null,
      email: session.email || null,
      phone: session.phone || null,
      source: channel,
      timestamp: session.created_at || new Date().toISOString(),
      status: session.booking_status === 'confirmed' ? 'booked' : 
              session.booking_status === 'pending' ? 'pending' :
              session.booking_status === 'cancelled' ? 'cancelled' : null,
      booking_date: session.booking_date || null,
      booking_time: session.booking_time || null,
      metadata: {
        conversation_summary: session.conversation_summary,
        user_inputs_summary: session.user_inputs_summary,
        message_count: session.message_count,
        last_message_at: session.last_message_at,
        google_event_id: session.google_event_id,
        booking_created_at: session.booking_created_at,
        brand: session.brand,
        website_url: session.website_url,
        channel_data: session.channel_data,
      },
    })) || []

    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Calculate channel-specific metrics
    const totalConversations = leads?.length || 0
    const activeConversations =
      leads?.filter((lead) => new Date(lead.timestamp) >= last24Hours).length ||
      0

    // Calculate conversion rate
    const bookedLeads =
      leads?.filter((lead) => lead.booking_date && lead.booking_time).length ||
      0
    const conversionRate =
      totalConversations > 0
        ? Math.round((bookedLeads / totalConversations) * 100)
        : 0

    // Average response time (mock data - replace with actual calculation)
    const avgResponseTime = 5 // minutes

    // Conversations over time (last 7 days)
    const conversationsOverTime = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const count =
        leads?.filter((lead) => lead.timestamp.startsWith(dateStr)).length || 0
      conversationsOverTime.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      })
    }

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    leads?.forEach((lead) => {
      const status = lead.status || 'new'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    const statusBreakdown = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }))

    return NextResponse.json({
      totalConversations,
      activeConversations,
      avgResponseTime,
      conversionRate,
      conversationsOverTime,
      statusBreakdown,
    })
  } catch (error) {
    console.error('Error fetching channel metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channel metrics' },
      { status: 500 }
    )
  }
}


