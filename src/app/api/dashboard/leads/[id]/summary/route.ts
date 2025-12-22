import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
    console.log('Generating summary for lead:', leadId)

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('all_leads')
      .select('id, customer_name, email, phone, created_at, last_interaction_at, lead_stage, sub_stage, booking_date, booking_time, unified_context')
      .eq('id', leadId)
      .single()

    if (leadError) {
      console.error('Error fetching lead:', leadError)
      return NextResponse.json({ error: 'Failed to fetch lead', details: leadError.message }, { status: 500 })
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Fetch last messages from all channels
    let webMessages = null
    let whatsappMessages = null
    let voiceMessages = null
    let socialMessages = null
    let allMessages: any[] = []

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('content, sender, created_at, channel')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        allMessages = data
        // Get last message per channel
        const webMsgs = data.filter(m => m.channel === 'web')
        const whatsappMsgs = data.filter(m => m.channel === 'whatsapp')
        const voiceMsgs = data.filter(m => m.channel === 'voice')
        const socialMsgs = data.filter(m => m.channel === 'social')

        webMessages = webMsgs.length > 0 ? webMsgs[webMsgs.length - 1] : null
        whatsappMessages = whatsappMsgs.length > 0 ? whatsappMsgs[whatsappMsgs.length - 1] : null
        voiceMessages = voiceMsgs.length > 0 ? voiceMsgs[voiceMsgs.length - 1] : null
        socialMessages = socialMsgs.length > 0 ? socialMsgs[socialMsgs.length - 1] : null
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      // Continue with empty messages - will generate summary anyway
    }

    // Calculate response rate (percentage of customer messages)
    let responseRate = 0
    if (allMessages && allMessages.length > 0) {
      const customerMessages = allMessages.filter(m => m.sender === 'customer').length
      const totalMessages = allMessages.length
      responseRate = totalMessages > 0 ? Math.round((customerMessages / totalMessages) * 100) : 0
    }

    // Calculate days inactive
    const lastInteraction = lead.last_interaction_at || lead.created_at
    const daysInactive = lastInteraction
      ? Math.max(0, Math.floor((new Date().getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    // Get last message (most recent across all channels)
    const lastMessage = [webMessages, whatsappMessages, voiceMessages, socialMessages]
      .filter(Boolean)
      .sort((a, b) => new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime())[0]

    // Check for scheduled follow-ups (from unified_context or sequences)
    const nextTouchpoint = lead.unified_context?.next_touchpoint || lead.unified_context?.sequence?.next_step

    // Extract key info from unified_context
    const keyInfo = {
      budget: lead.unified_context?.budget || lead.unified_context?.web?.budget || lead.unified_context?.whatsapp?.budget,
      serviceInterest: lead.unified_context?.service_interest || lead.unified_context?.web?.service_interest,
      painPoints: lead.unified_context?.pain_points || lead.unified_context?.web?.pain_points,
    }

    // Determine conversation status
    const hoursSinceLastMessage = lastMessage
      ? Math.floor((new Date().getTime() - new Date(lastMessage.created_at).getTime()) / (1000 * 60 * 60))
      : daysInactive * 24

    let conversationStatus = 'No recent activity'
    if (hoursSinceLastMessage < 1) {
      conversationStatus = 'Actively chatting'
    } else if (lastMessage?.sender === 'agent') {
      conversationStatus = `Waiting on customer (${hoursSinceLastMessage}h ago)`
    } else if (lastMessage?.sender === 'customer') {
      conversationStatus = `No response (${hoursSinceLastMessage}h ago)`
    }

    // Build summary data
    const summaryData = {
      leadName: lead.customer_name || 'Customer',
      lastMessage: lastMessage ? {
        content: lastMessage.content,
        sender: lastMessage.sender,
        timestamp: lastMessage.created_at,
        channel: lastMessage.channel,
      } : null,
      conversationStatus,
      responseRate,
      daysInactive,
      nextTouchpoint,
      keyInfo,
      leadStage: lead.lead_stage,
      subStage: lead.sub_stage,
      bookingDate: lead.booking_date,
      bookingTime: lead.booking_time,
    }

    // Generate AI summary if Claude API key is available
    const apiKey = process.env.CLAUDE_API_KEY
    if (apiKey) {
      try {
        const prompt = `Generate a concise, actionable summary for this lead. Use natural paragraph format, not bullet points.

Lead: ${summaryData.leadName}
Stage: ${lead.lead_stage || 'Unknown'}${lead.sub_stage ? ` (${lead.sub_stage})` : ''}
Days Inactive: ${daysInactive}
Response Rate: ${responseRate}%

${summaryData.lastMessage ? `Last Message (${summaryData.lastMessage.sender === 'customer' ? 'Customer' : 'PROXe'}, ${summaryData.lastMessage.channel}, ${new Date(summaryData.lastMessage.timestamp).toLocaleString()}): ${summaryData.lastMessage.content.substring(0, 200)}` : 'No messages yet'}

Conversation Status: ${conversationStatus}
${summaryData.nextTouchpoint ? `Next Touchpoint: ${summaryData.nextTouchpoint}` : ''}
${keyInfo.budget ? `Budget mentioned: ${keyInfo.budget}` : ''}
${keyInfo.serviceInterest ? `Service interest: ${keyInfo.serviceInterest}` : ''}
${keyInfo.painPoints ? `Pain points: ${keyInfo.painPoints}` : ''}

Generate a natural paragraph summary covering:
1. Last message preview (who sent, when, preview text)
2. Conversation status (actively chatting/waiting on customer/no response X hours)
3. Latest action taken (if any)
4. Next scheduled touchpoint (if any)
5. Key extracted info (budget, service interest, pain points if mentioned)

Make it contextual, useful, and actionable - not generic.`

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 400,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const aiSummary = data.content?.[0]?.text || ''
          if (aiSummary) {
            return NextResponse.json({
              summary: aiSummary,
              data: summaryData,
            })
          }
        } else {
          const errorText = await response.text()
          console.error('Claude API error:', response.status, errorText)
        }
      } catch (error) {
        console.error('Error generating AI summary:', error)
        // Continue to fallback
      }
    }

    // Fallback: Generate basic summary without AI
    let fallbackSummary = `${summaryData.leadName} is currently in the ${lead.lead_stage || 'Unknown'} stage`
    if (lead.sub_stage) {
      fallbackSummary += ` (${lead.sub_stage})`
    }
    fallbackSummary += `. `

    if (summaryData.lastMessage) {
      const sender = summaryData.lastMessage.sender === 'customer' ? 'Customer' : 'PROXe'
      const timeAgo = hoursSinceLastMessage < 24
        ? `${hoursSinceLastMessage}h ago`
        : `${daysInactive}d ago`
      fallbackSummary += `Last message from ${sender} ${timeAgo}: "${summaryData.lastMessage.content.substring(0, 100)}...". `
    }

    fallbackSummary += `Conversation status: ${conversationStatus}. `
    fallbackSummary += `Response rate: ${responseRate}%. `

    if (keyInfo.budget || keyInfo.serviceInterest || keyInfo.painPoints) {
      fallbackSummary += 'Key info: '
      if (keyInfo.budget) fallbackSummary += `Budget: ${keyInfo.budget}. `
      if (keyInfo.serviceInterest) fallbackSummary += `Interest: ${keyInfo.serviceInterest}. `
      if (keyInfo.painPoints) fallbackSummary += `Pain points: ${keyInfo.painPoints}. `
    }

    console.log('Returning fallback summary for lead:', leadId)
    return NextResponse.json({
      summary: fallbackSummary,
      data: summaryData,
    })
  } catch (error) {
    console.error('Error generating lead summary:', error)
    // Always return a basic summary even on error
    const errorSummary = `Unable to generate detailed summary. Please check the lead details manually.`
    return NextResponse.json({
      summary: errorSummary,
      data: {
        daysInactive: 0,
        responseRate: 0,
      },
      error: String(error),
    })
  }
}

