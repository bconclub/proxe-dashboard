import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch all activities for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = params.id

    // Fetch activities with user names
    const { data: activities, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        creator:created_by (
          id,
          full_name,
          email
        )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      )
    }

    // Format activities with creator names
    const formattedActivities = activities?.map((activity) => {
      const creator = activity.creator as any
      const creatorName = creator?.full_name || creator?.email || 'Unknown User'

      return {
        ...activity,
        creator_name: creatorName,
      }
    }) || []

    return NextResponse.json({
      success: true,
      activities: formattedActivities,
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// POST: Create a new activity
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = params.id
    const body = await request.json()
    const { 
      activity_type, 
      note, 
      duration,
      next_followup
    } = body

    // Validate activity_type
    const validTypes = ['call', 'meeting', 'message', 'note']
    if (!activity_type || !validTypes.includes(activity_type)) {
      return NextResponse.json(
        { error: `Invalid activity_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate note
    if (!note || !note.trim()) {
      return NextResponse.json(
        { error: 'Note is required' },
        { status: 400 }
      )
    }

    // Create activity
    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity_type,
        note: note.trim(),
        duration_minutes: duration || null,
        next_followup_date: next_followup || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating activity:', error)
      return NextResponse.json(
        { error: 'Failed to create activity' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      activity,
    })
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}

