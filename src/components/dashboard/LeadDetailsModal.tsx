'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDateTime, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { MdLanguage, MdChat, MdPhone, MdShare, MdAutoAwesome, MdOpenInNew, MdHistory, MdCall, MdEvent, MdMessage, MdNote, MdEdit, MdTrendingUp, MdTrendingDown, MdRemove, MdCheckCircle, MdSchedule } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import LeadStageSelector from './LeadStageSelector'
import ActivityLoggerModal from './ActivityLoggerModal'
import { LeadStage } from '@/types'

// Helper functions for IST date/time formatting
function formatDateIST(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).replace(/\//g, '-');
  return day;
}

function formatTimeIST(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

function formatDateTimeIST(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return `${formatDateIST(dateString)}, ${formatTimeIST(dateString)}`;
}

function formatBookingTime(timeString: string | null | undefined): string {
  if (!timeString) return '';
  const timeParts = timeString.toString().split(':');
  if (timeParts.length < 2) return timeString.toString();
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return timeString.toString();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const minutesStr = minutes.toString().padStart(2, '0');
  return `${hours12}:${minutesStr} ${period}`;
}

const ALL_CHANNELS = ['web', 'whatsapp', 'voice', 'social'];

const ChannelIcon = ({ channel, size = 16, active = false }: { channel: string; size?: number; active?: boolean }) => {
  const style = {
    opacity: active ? 1 : 0.3,
    filter: 'invert(1) brightness(2)',
  };
  
  switch (channel) {
    case 'web':
      return <img src="/browser-stroke-rounded.svg" alt="Web" width={size} height={size} style={style} title="Website" />;
    case 'whatsapp':
      return <img src="/whatsapp-business-stroke-rounded.svg" alt="WhatsApp" width={size} height={size} style={style} title="WhatsApp" />;
    case 'voice':
      return <img src="/ai-voice-stroke-rounded.svg" alt="Voice" width={size} height={size} style={style} title="Voice" />;
    case 'social':
      return <img src="/video-ai-stroke-rounded.svg" alt="Social" width={size} height={size} style={style} title="Social" />;
    default:
      return null;
  }
};

interface Lead {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  source: string | null
  first_touchpoint?: string | null
  last_touchpoint?: string | null
  timestamp: string
  status: string | null
  booking_date: string | null
  booking_time: string | null
  metadata?: any
  unified_context?: any
  lead_score?: number | null
  lead_stage?: string | null
  sub_stage?: string | null
  stage_override?: boolean | null
  last_scored_at?: string | null
  last_interaction_at?: string | null
}

interface LeadDetailsModalProps {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onStatusUpdate: (leadId: string, newStatus: string) => Promise<void>
}

const CHANNEL_CONFIG = {
  web: {
    name: 'Web',
    icon: MdLanguage,
    color: '#3B82F6',
    emoji: '🌐'
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: MdChat,
    color: '#22C55E',
    emoji: '💬'
  },
  voice: {
    name: 'Voice',
    icon: MdPhone,
    color: 'var(--accent-primary)',
    emoji: '📞'
  },
  social: {
    name: 'Social',
    icon: MdShare,
    color: '#EC4899',
    emoji: '📱'
  }
}

const STAGE_PROGRESSION = [
  { stage: 'New', order: 0 },
  { stage: 'Engaged', order: 1 },
  { stage: 'Qualified', order: 2 },
  { stage: 'High Intent', order: 3 },
  { stage: 'Booking Made', order: 4 },
  { stage: 'Converted', order: 5 },
]

export default function LeadDetailsModal({ lead, isOpen, onClose, onStatusUpdate }: LeadDetailsModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'activity' | 'summary' | 'breakdown' | 'interaction'>('activity')
  const [showStageDropdown, setShowStageDropdown] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const stageButtonRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below')
  const [pendingStageChange, setPendingStageChange] = useState<{
    oldStage: string | null
    newStage: LeadStage
  } | null>(null)
  const [unifiedSummary, setUnifiedSummary] = useState<string>('')
  const [summaryAttribution, setSummaryAttribution] = useState<string>('')
  const [summaryData, setSummaryData] = useState<any>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  
  // 100-Day Interaction data
  const [interaction90Days, setInteraction90Days] = useState<{
    totalInteractions: number
    trend: number
    dailyData: Array<{ date: string; count: number }>
    busiestDay: string
    avgDaily: number
  } | null>(null)
  const [loading90Days, setLoading90Days] = useState(false)
  
  // New state for enhanced metrics
  const [channelData, setChannelData] = useState<{
    web: { count: number; firstDate: string | null; lastDate: string | null }
    whatsapp: { count: number; firstDate: string | null; lastDate: string | null }
    voice: { count: number; firstDate: string | null; lastDate: string | null }
    social: { count: number; firstDate: string | null; lastDate: string | null }
  }>({
    web: { count: 0, firstDate: null, lastDate: null },
    whatsapp: { count: 0, firstDate: null, lastDate: null },
    voice: { count: 0, firstDate: null, lastDate: null },
    social: { count: 0, firstDate: null, lastDate: null },
  })
  const [quickStats, setQuickStats] = useState<{
    totalMessages: number
    responseRate: number
    avgResponseTime: number
    hasBooking: boolean
  }>({
    totalMessages: 0,
    responseRate: 0,
    avgResponseTime: 0,
    hasBooking: false,
  })
  const [previousScore, setPreviousScore] = useState<number | null>(null)
  const [freshLeadData, setFreshLeadData] = useState<Lead | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    aiScore: number
    activityScore: number
    businessScore: number
    totalScore: number
  } | null>(null)

  // Calculate Lead Score Breakdown
  const calculateLeadScore = async (leadData: Lead) => {
    try {
      const supabase = createClient()
      
      // Fetch messages for analysis
      const { data: messages } = await supabase
        .from('conversations')
        .select('content, sender, created_at, channel')
        .eq('lead_id', leadData.id)
        .order('created_at', { ascending: true })

      // Get conversation summaries from unified_context
      const unifiedContext = leadData.unified_context || {}
      const conversationSummary = 
        unifiedContext.unified_summary ||
        unifiedContext.web?.conversation_summary ||
        unifiedContext.whatsapp?.conversation_summary ||
        unifiedContext.voice?.conversation_summary ||
        unifiedContext.social?.conversation_summary ||
        ''
      
      // Combine all text for analysis
      const allText = [
        conversationSummary,
        ...(messages || []).map((m: any) => m.content || '').filter(Boolean)
      ].join(' ').toLowerCase()

      // ============================================
      // 1. AI Analysis (60% weight)
      // ============================================
      let aiScore = 0
      
      // Intent signals detection
      const intentKeywords = {
        pricing: ['price', 'cost', 'pricing', 'fee', 'charge', 'afford', 'budget', 'expensive', 'cheap', 'discount', 'offer'],
        booking: ['book', 'booking', 'schedule', 'appointment', 'reserve', 'available', 'slot', 'time', 'date'],
        urgency: ['urgent', 'asap', 'soon', 'immediately', 'quickly', 'fast', 'today', 'now', 'hurry', 'rushed']
      }
      
      let intentSignals = 0
      Object.values(intentKeywords).forEach(keywords => {
        const found = keywords.some(keyword => allText.includes(keyword))
        if (found) intentSignals++
      })
      // Intent signals: 0-3, normalize to 0-100
      const intentScore = Math.min(100, (intentSignals / 3) * 100)
      
      // Sentiment analysis (simple keyword-based)
      const positiveWords = ['good', 'great', 'excellent', 'perfect', 'love', 'amazing', 'wonderful', 'happy', 'satisfied', 'interested', 'yes', 'sure', 'definitely']
      const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'disappointed', 'frustrated', 'angry', 'no', 'not', "don't", "won't", 'cancel']
      
      const positiveCount = positiveWords.filter(word => allText.includes(word)).length
      const negativeCount = negativeWords.filter(word => allText.includes(word)).length
      const sentimentScore = positiveCount > negativeCount 
        ? Math.min(100, 50 + (positiveCount * 10))
        : Math.max(0, 50 - (negativeCount * 10))
      
      // Buying signals detection
      const buyingSignals = [
        'when can', 'how much', 'what is the price', 'tell me about', 'i want', 'i need',
        'interested in', 'looking for', 'considering', 'deciding', 'compare', 'options'
      ]
      const buyingSignalCount = buyingSignals.filter(signal => allText.includes(signal)).length
      const buyingSignalScore = Math.min(100, buyingSignalCount * 20)
      
      // Combine AI scores (weighted average)
      aiScore = (intentScore * 0.4 + sentimentScore * 0.3 + buyingSignalScore * 0.3)
      
      // ============================================
      // 2. Activity (30% weight)
      // ============================================
      const messageCount = messages?.length || 0
      // Message count: normalize to 0-1 (100 messages = 1.0, capped at 1.0)
      const msgCountNormalized = Math.min(1.0, messageCount / 100)
      
      // Response rate (52% = good baseline)
      const customerMessages = messages?.filter((m: any) => m.sender === 'customer').length || 0
      const agentMessages = messages?.filter((m: any) => m.sender === 'agent').length || 0
      const responseRate = customerMessages > 0 
        ? (agentMessages / customerMessages) 
        : 0
      // Response rate is already 0-1 (e.g., 0.52 for 52%)
      
      // Recency score (days since last interaction)
      const lastInteraction = 
        leadData.last_interaction_at || 
        unifiedContext.whatsapp?.last_interaction ||
        unifiedContext.web?.last_interaction ||
        unifiedContext.voice?.last_interaction ||
        unifiedContext.social?.last_interaction ||
        leadData.timestamp
      
      const daysSinceLastInteraction = lastInteraction
        ? Math.floor((new Date().getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
        : 999
      
      // Recency: 0 days = 1.0, 7 days = 0.5, 30 days = 0 (normalize to 0-1)
      const recencyScore = Math.max(0, Math.min(1.0, 1.0 - (daysSinceLastInteraction / 30)))
      
      // Channel mix bonus (2+ channels = bonus) - add 0.1 to the average
      const activeChannels = new Set(messages?.map((m: any) => m.channel).filter(Boolean) || []).size
      const channelMixBonus = activeChannels >= 2 ? 0.1 : 0
      
      // Activity score: ((msg_count/100 + response_rate + recency_score) / 3) * 0.3
      // Then convert to 0-100 scale for display
      const activityScoreBase = ((msgCountNormalized + responseRate + recencyScore) / 3) + channelMixBonus
      const activityScore = Math.min(100, activityScoreBase * 100)
      
      // ============================================
      // 3. Business Signals (10% weight)
      // ============================================
      let businessScore = 0
      
      // Booking exists = +10 points
      const hasBooking = !!(leadData.booking_date || leadData.booking_time || 
        unifiedContext.web?.booking_date || unifiedContext.web?.booking?.date ||
        unifiedContext.whatsapp?.booking_date || unifiedContext.whatsapp?.booking?.date ||
        unifiedContext.voice?.booking_date || unifiedContext.voice?.booking?.date ||
        unifiedContext.social?.booking_date || unifiedContext.social?.booking?.date)
      if (hasBooking) businessScore += 10
      
      // Email/phone provided = +5 points
      if (leadData.email || leadData.phone) businessScore += 5
      
      // Multi-touchpoint = +5 points (2+ channels)
      if (activeChannels >= 2) businessScore += 5
      
      // Business score can be 0-20, but we need it to contribute 10% (0-10 points) to total
      // So we normalize: businessScore (0-20) -> (0-10) for the 10% weight
      const businessScoreNormalized = Math.min(10, businessScore)
      
      // ============================================
      // Calculate Total Score
      // ============================================
      const totalScore = Math.min(100, 
        (aiScore * 0.6) + 
        (activityScore * 0.3) + 
        businessScoreNormalized
      )
      
      return {
        aiScore: Math.round(aiScore * 0.6), // Already weighted (0-60)
        activityScore: Math.round(activityScore * 0.3), // Already weighted (0-30)
        businessScore: Math.round(businessScoreNormalized), // Already normalized to 0-10 for 10% weight
        totalScore: Math.round(totalScore)
      }
    } catch (error) {
      console.error('Error calculating lead score:', error)
      return {
        aiScore: 0,
        activityScore: 0,
        businessScore: 0,
        totalScore: 0
      }
    }
  }

  // Fetch fresh lead data from database when modal opens
  const loadFreshLeadData = async () => {
    if (!lead) return
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('all_leads')
        .select('id, customer_name, email, phone, created_at, last_interaction_at, booking_date, booking_time, lead_score, lead_stage, sub_stage, stage_override, unified_context, first_touchpoint, last_touchpoint, status')
        .eq('id', lead.id)
        .single()

      if (error) {
        console.error('Error fetching fresh lead data:', error)
        return
      }

      if (data) {
        // Get booking from multiple sources (same logic as loadQuickStats)
        const unifiedContext = data.unified_context || lead.unified_context
        const bookingDate = 
          data.booking_date || 
          lead.booking_date || 
          unifiedContext?.web?.booking_date || 
          unifiedContext?.web?.booking?.date ||
          unifiedContext?.whatsapp?.booking_date ||
          unifiedContext?.whatsapp?.booking?.date ||
          unifiedContext?.voice?.booking_date ||
          unifiedContext?.voice?.booking?.date ||
          unifiedContext?.social?.booking_date ||
          unifiedContext?.social?.booking?.date ||
          null
        
        const bookingTime = 
          data.booking_time || 
          lead.booking_time || 
          unifiedContext?.web?.booking_time || 
          unifiedContext?.web?.booking?.time ||
          unifiedContext?.whatsapp?.booking_time ||
          unifiedContext?.whatsapp?.booking?.time ||
          unifiedContext?.voice?.booking_time ||
          unifiedContext?.voice?.booking?.time ||
          unifiedContext?.social?.booking_time ||
          unifiedContext?.social?.booking?.time ||
          null
        
        // Merge fresh data with existing lead prop
        const mergedLead: Lead = {
          ...lead,
          name: data.customer_name || lead.name,
          email: data.email || lead.email,
          phone: data.phone || lead.phone,
          timestamp: data.created_at || lead.timestamp,
          last_interaction_at: data.last_interaction_at || lead.last_interaction_at || null,
          booking_date: bookingDate,
          booking_time: bookingTime,
          lead_score: data.lead_score ?? lead.lead_score ?? null,
          lead_stage: data.lead_stage || lead.lead_stage || null,
          sub_stage: data.sub_stage || lead.sub_stage || null,
          stage_override: data.stage_override ?? lead.stage_override ?? null,
          unified_context: data.unified_context || lead.unified_context || null,
          first_touchpoint: data.first_touchpoint || lead.first_touchpoint || null,
          last_touchpoint: data.last_touchpoint || lead.last_touchpoint || null,
          status: data.status || lead.status || null,
        }
        setFreshLeadData(mergedLead)
      }
    } catch (error) {
      console.error('Error loading fresh lead data:', error)
    }
  }

  // Load 100-day interaction data
  const load90DayInteractions = async () => {
    if (!lead) return
    setLoading90Days(true)
    try {
      const supabase = createClient()
      
      // Get current date and 100 days ago
      const now = new Date()
      const oneHundredDaysAgo = new Date(now)
      oneHundredDaysAgo.setDate(oneHundredDaysAgo.getDate() - 100)
      const twoHundredDaysAgo = new Date(now)
      twoHundredDaysAgo.setDate(twoHundredDaysAgo.getDate() - 200)
      
      // Fetch messages from last 100 days (customer messages only)
      const { data: messages100Days, error: error100 } = await supabase
        .from('conversations')
        .select('created_at, sender')
        .eq('lead_id', lead.id)
        .eq('sender', 'customer')
        .gte('created_at', oneHundredDaysAgo.toISOString())
        .order('created_at', { ascending: true })
      
      // Fetch messages from previous 100 days (for trend comparison)
      const { data: messagesPrevious100, error: errorPrev } = await supabase
        .from('conversations')
        .select('created_at, sender')
        .eq('lead_id', lead.id)
        .eq('sender', 'customer')
        .gte('created_at', twoHundredDaysAgo.toISOString())
        .lt('created_at', oneHundredDaysAgo.toISOString())
      
      if (error100 || errorPrev) {
        console.error('Error loading 100-day interactions:', error100 || errorPrev)
        setLoading90Days(false)
        return
      }
      
      // Group messages by date for last 100 days
      const dailyCounts: Record<string, number> = {}
      const nowDate = new Date(now)
      
      // Initialize all 100 days with 0
      for (let i = 0; i < 100; i++) {
        const date = new Date(nowDate)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        dailyCounts[dateStr] = 0
      }
      
      // Count messages per day
      messages100Days?.forEach((msg: any) => {
        const dateStr = new Date(msg.created_at).toISOString().split('T')[0]
        if (dailyCounts[dateStr] !== undefined) {
          dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1
        }
      })
      
      // Convert to array and sort by date
      const dailyData = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
      
      // Calculate total interactions
      const totalInteractions = messages100Days?.length || 0
      const previousTotal = messagesPrevious100?.length || 0
      
      // Calculate trend
      const trend = previousTotal > 0 
        ? Math.round(((totalInteractions - previousTotal) / previousTotal) * 100)
        : totalInteractions > 0 ? 100 : 0
      
      // Calculate busiest day of week
      const dayCounts: Record<string, number> = {}
      messages100Days?.forEach((msg: any) => {
        const dayName = new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'long' })
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
      })
      const busiestDay = Object.entries(dayCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      
      // Calculate average daily
      const avgDaily = totalInteractions / 100
      
      setInteraction90Days({
        totalInteractions,
        trend,
        dailyData,
        busiestDay,
        avgDaily,
      })
    } catch (error) {
      console.error('Error loading 90-day interactions:', error)
    } finally {
      setLoading90Days(false)
    }
  }

  // Load all data when lead changes
  useEffect(() => {
    if (lead && isOpen) {
      loadFreshLeadData()
      loadUnifiedSummary()
      loadActivities()
      loadChannelData()
      loadQuickStats()
      loadScoreHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead, isOpen])

  // Load score breakdown when breakdown tab is active
  useEffect(() => {
    if (activeTab === 'breakdown' && lead && isOpen) {
      loadScoreBreakdown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, lead, isOpen, freshLeadData])

  // Load 100-day interaction data when interaction tab is active
  useEffect(() => {
    if (activeTab === 'interaction' && lead && isOpen) {
      load90DayInteractions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, lead, isOpen])

  const loadUnifiedSummary = async () => {
    if (!lead) return
    setLoadingSummary(true)
    try {
      const response = await fetch(`/api/dashboard/leads/${lead.id}/summary`)
      const data = await response.json()
      if (data.summary) {
        setUnifiedSummary(data.summary)
        setSummaryAttribution(data.attribution || '')
        setSummaryData(data.data || null)
      }
    } catch (error) {
      console.error('Error loading unified summary:', error)
    } finally {
      setLoadingSummary(false)
    }
  }

  const loadActivities = async () => {
    if (!lead) return
    setLoadingActivities(true)
    try {
      const response = await fetch(`/api/dashboard/leads/${lead.id}/activities`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.activities) {
          setActivities(data.activities)
        }
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }

  const loadChannelData = async () => {
    if (!lead) return
    try {
      const supabase = createClient()
      const { data: messages } = await supabase
        .from('conversations')
        .select('channel, created_at')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: true })

      if (messages && Array.isArray(messages)) {
        const channelStats: typeof channelData = {
          web: { count: 0, firstDate: null, lastDate: null },
          whatsapp: { count: 0, firstDate: null, lastDate: null },
          voice: { count: 0, firstDate: null, lastDate: null },
          social: { count: 0, firstDate: null, lastDate: null },
        }

        messages.forEach((msg: any) => {
          const channel = msg.channel as keyof typeof channelStats
          if (channelStats[channel]) {
            channelStats[channel].count++
            if (!channelStats[channel].firstDate) {
              channelStats[channel].firstDate = msg.created_at
            }
            channelStats[channel].lastDate = msg.created_at
          }
        })

        setChannelData(channelStats)
      }
    } catch (error) {
      console.error('Error loading channel data:', error)
    }
  }

  const loadQuickStats = async () => {
    if (!lead) return
    try {
      const supabase = createClient()
      // Select metadata to get response_time_ms
      const { data: messages } = await supabase
        .from('conversations')
        .select('sender, created_at, metadata')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: true })

      // Fetch fresh lead data to check booking
      const { data: leadData } = await supabase
        .from('all_leads')
        .select('booking_date, booking_time, unified_context')
        .eq('id', lead.id)
        .single()

      if (messages && Array.isArray(messages) && messages.length > 0) {
        // Calculate response rate: (agent replies / customer messages) * 100
        const customerMessages = messages.filter((m: any) => m.sender === 'customer')
        const agentMessages = messages.filter((m: any) => m.sender === 'agent')
        const responseRate = customerMessages.length > 0 
          ? Math.round((agentMessages.length / customerMessages.length) * 100)
          : 0

        // Calculate average response time from metadata.response_time_ms
        let totalResponseTime = 0
        let responseCount = 0
        
        // First, try to use metadata.response_time_ms
        messages.forEach((msg: any) => {
          if (msg.sender === 'agent' && msg.metadata?.response_time_ms) {
            const responseTimeMs = typeof msg.metadata.response_time_ms === 'number' 
              ? msg.metadata.response_time_ms 
              : parseInt(msg.metadata.response_time_ms, 10)
            if (!isNaN(responseTimeMs) && responseTimeMs > 0) {
              totalResponseTime += responseTimeMs
              responseCount++
            }
          }
        })
        
        // Fallback to timestamp calculation if no metadata.response_time_ms
        if (responseCount === 0) {
          for (let i = 0; i < messages.length - 1; i++) {
            const msg1 = messages[i] as any
            const msg2 = messages[i + 1] as any
            if (msg1.sender === 'customer' && msg2.sender === 'agent') {
              const timeDiff = new Date(msg2.created_at).getTime() - new Date(msg1.created_at).getTime()
              if (timeDiff > 0) {
                totalResponseTime += timeDiff
                responseCount++
              }
            }
          }
        }
        
        // Convert to minutes (metadata is in ms, timestamp diff is also in ms)
        const avgResponseTime = responseCount > 0 
          ? Math.round(totalResponseTime / responseCount / 60000) 
          : 0

        // Check booking from multiple sources - prioritize fresh data
        const unifiedContext = leadData?.unified_context || lead.unified_context
        const bookingDate = 
          leadData?.booking_date || 
          lead.booking_date || 
          unifiedContext?.web?.booking_date || 
          unifiedContext?.web?.booking?.date ||
          unifiedContext?.whatsapp?.booking_date ||
          unifiedContext?.whatsapp?.booking?.date ||
          unifiedContext?.voice?.booking_date ||
          unifiedContext?.voice?.booking?.date ||
          unifiedContext?.social?.booking_date ||
          unifiedContext?.social?.booking?.date ||
          null
        
        const bookingTime = 
          leadData?.booking_time || 
          lead.booking_time || 
          unifiedContext?.web?.booking_time || 
          unifiedContext?.web?.booking?.time ||
          unifiedContext?.whatsapp?.booking_time ||
          unifiedContext?.whatsapp?.booking?.time ||
          unifiedContext?.voice?.booking_time ||
          unifiedContext?.voice?.booking?.time ||
          unifiedContext?.social?.booking_time ||
          unifiedContext?.social?.booking?.time ||
          null
        
        const hasBooking = !!(bookingDate || bookingTime)

        setQuickStats({
          totalMessages: messages.length,
          responseRate,
          avgResponseTime,
          hasBooking,
        })
      } else {
        // Even with no messages, check for booking
        const unifiedContext = leadData?.unified_context || lead.unified_context
        const bookingDate = 
          leadData?.booking_date || 
          lead.booking_date || 
          unifiedContext?.web?.booking_date || 
          unifiedContext?.web?.booking?.date ||
          unifiedContext?.whatsapp?.booking_date ||
          unifiedContext?.whatsapp?.booking?.date ||
          unifiedContext?.voice?.booking_date ||
          unifiedContext?.voice?.booking?.date ||
          unifiedContext?.social?.booking_date ||
          unifiedContext?.social?.booking?.date ||
          null
        
        const bookingTime = 
          leadData?.booking_time || 
          lead.booking_time || 
          unifiedContext?.web?.booking_time || 
          unifiedContext?.web?.booking?.time ||
          unifiedContext?.whatsapp?.booking_time ||
          unifiedContext?.whatsapp?.booking?.time ||
          unifiedContext?.voice?.booking_time ||
          unifiedContext?.voice?.booking?.time ||
          unifiedContext?.social?.booking_time ||
          unifiedContext?.social?.booking?.time ||
          null
        
        const hasBooking = !!(bookingDate || bookingTime)
        
        setQuickStats({
          totalMessages: 0,
          responseRate: 0,
          avgResponseTime: 0,
          hasBooking,
        })
      }
    } catch (error) {
      console.error('Error loading quick stats:', error)
    }
  }

  const loadScoreHistory = async () => {
    if (!lead) return
    try {
      const supabase = createClient()
      const { data: history } = await supabase
        .from('stage_history')
        .select('score_at_change, changed_at')
        .eq('lead_id', lead.id)
        .order('changed_at', { ascending: false })
        .limit(2)

      if (history && Array.isArray(history) && history.length > 1) {
        const prev = history[1] as any
        setPreviousScore(prev.score_at_change)
      }
    } catch (error) {
      console.error('Error loading score history:', error)
    }
  }

  const loadScoreBreakdown = async () => {
    if (!lead) return
    const leadData = freshLeadData || lead
    const breakdown = await calculateLeadScore(leadData)
    setScoreBreakdown(breakdown)
  }

  if (!isOpen || !lead) return null

  // Use fresh lead data if available, otherwise fall back to prop
  const currentLead = freshLeadData || lead

  // Calculate days in pipeline
  const daysInPipeline = Math.floor((new Date().getTime() - new Date(currentLead.timestamp).getTime()) / (1000 * 60 * 60 * 24))

  // Calculate days inactive - prioritize all_leads.last_interaction_at, then check unified_context channels
  const lastInteraction: string | null = 
    currentLead.last_interaction_at || 
    currentLead.unified_context?.whatsapp?.last_interaction ||
    currentLead.unified_context?.web?.last_interaction ||
    currentLead.unified_context?.voice?.last_interaction ||
    currentLead.unified_context?.social?.last_interaction ||
    currentLead.timestamp || 
    null
  const daysInactive = lastInteraction ? Math.floor((new Date().getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)) : 0

  // Get health score and color
  const score = currentLead.lead_score ?? 0
  const getHealthColor = (score: number) => {
    if (score >= 70) return { bg: '#EF4444', text: '#FFFFFF', label: 'Hot' }
    if (score >= 40) return { bg: '#F97316', text: '#FFFFFF', label: 'Warm' }
    return { bg: '#3B82F6', text: '#FFFFFF', label: 'Cold' }
  }
  const healthColor = getHealthColor(score)

  // Calculate health trend
  const getHealthTrend = () => {
    if (previousScore === null) return null
    const diff = score - previousScore
    if (diff > 5) return { icon: MdTrendingUp, color: '#22C55E', label: 'Warming' }
    if (diff < -5) return { icon: MdTrendingDown, color: '#EF4444', label: 'Cooling' }
    return { icon: MdRemove, color: '#6B7280', label: 'Stable' }
  }
  const healthTrend = getHealthTrend()

  // Auto-detect stage from conversation
  const autoDetectStage = (): string => {
    if (currentLead.lead_stage && !currentLead.stage_override) {
      return currentLead.lead_stage
    }
    
    // Simple auto-detection based on score and activity
    if (score >= 86 || currentLead.booking_date) return 'Booking Made'
    if (score >= 61) return 'High Intent'
    if (score >= 31) return 'Qualified'
    if (quickStats.totalMessages > 3) return 'Engaged'
    return 'New'
  }
  const detectedStage = autoDetectStage()
  const currentStage = currentLead.lead_stage || detectedStage

  // Calculate stage duration
  const getStageDuration = () => {
    try {
      const supabase = createClient()
      // This would need to fetch from stage_history, simplified for now
      return daysInPipeline
    } catch {
      return daysInPipeline
    }
  }
  const stageDuration = getStageDuration()

  // Get stage progress
  const getStageProgress = () => {
    const stageOrder = STAGE_PROGRESSION.find(s => s.stage === currentStage)?.order ?? 0
    return Math.round((stageOrder / (STAGE_PROGRESSION.length - 1)) * 100)
  }

  // Get stage badge color
  const getStageBadgeClass = (stage: string | null) => {
    if (!stage) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    const stageColors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Engaged': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'Qualified': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'High Intent': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Booking Made': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Converted': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'Closed Lost': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'In Sequence': '', // Will use inline styles with CSS variables
      'Cold': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    return stageColors[stage] || stageColors['New']
  }

  // Handle stage change
  const handleStageChange = (newStage: LeadStage) => {
    const oldStage: string | null = currentLead.lead_stage || null
    setPendingStageChange({ oldStage, newStage })
    setShowStageDropdown(false)
    setShowActivityModal(true)
  }

  const handleActivitySave = async (activity: {
    activity_type: 'call' | 'meeting' | 'message' | 'note'
    note: string
    duration?: number
    next_followup?: string
  }) => {
    if (!pendingStageChange) return

    try {
      const response = await fetch(`/api/dashboard/leads/${lead.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_stage: pendingStageChange.newStage,
          activity_type: activity.activity_type,
          note: activity.note,
          duration_minutes: activity.duration,
          next_followup_date: activity.next_followup,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update stage')
      }

      const supabase = createClient()
      const { data } = await supabase
        .from('all_leads')
        .select('lead_stage, sub_stage, lead_score, stage_override, last_interaction_at, booking_date, booking_time, unified_context')
        .eq('id', lead.id)
        .single()
      
      if (data) {
        const leadData = data as any
        // Update fresh lead data state
        setFreshLeadData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            lead_stage: leadData.lead_stage,
            sub_stage: leadData.sub_stage,
            lead_score: leadData.lead_score,
            stage_override: leadData.stage_override,
            last_interaction_at: leadData.last_interaction_at || prev.last_interaction_at,
            booking_date: leadData.booking_date || leadData.unified_context?.web?.booking_date || leadData.unified_context?.whatsapp?.booking_date || prev.booking_date,
            booking_time: leadData.booking_time || leadData.unified_context?.web?.booking_time || leadData.unified_context?.whatsapp?.booking_time || prev.booking_time,
            unified_context: leadData.unified_context || prev.unified_context,
          }
        })
      }

      setShowActivityModal(false)
      setPendingStageChange(null)
      loadFreshLeadData() // Reload fresh data
      loadUnifiedSummary()
      loadActivities()
    } catch (err) {
      console.error('Error updating stage:', err)
      alert(err instanceof Error ? err.message : 'Failed to update stage')
    }
  }

  // Get active channels in order
  const getActiveChannels = () => {
    const channels: Array<{
      name: string
      icon: any
      color: string
      emoji: string
      key: string
      count: number
      firstDate: string | null
      lastDate: string | null
    }> = []
    if (channelData.web.count > 0) channels.push({ ...CHANNEL_CONFIG.web, key: 'web', ...channelData.web })
    if (channelData.whatsapp.count > 0) channels.push({ ...CHANNEL_CONFIG.whatsapp, key: 'whatsapp', ...channelData.whatsapp })
    if (channelData.voice.count > 0) channels.push({ ...CHANNEL_CONFIG.voice, key: 'voice', ...channelData.voice })
    if (channelData.social.count > 0) channels.push({ ...CHANNEL_CONFIG.social, key: 'social', ...channelData.social })
    return channels.sort((a, b) => {
      const aDate = a.firstDate ? new Date(a.firstDate).getTime() : 0
      const bDate = b.firstDate ? new Date(b.firstDate).getTime() : 0
      return aDate - bDate
    })
  }
  const activeChannels = getActiveChannels()

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40" onClick={onClose}></div>
      
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="relative w-full max-w-4xl bg-white dark:bg-[#1A1A1A] rounded-lg shadow-xl z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#262626]">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentLead.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{currentLead.email || currentLead.phone || 'No contact info'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* TOP SECTION - Lead Health Card */}
          <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#1F1F1F] dark:to-[#262626] border-b border-gray-200 dark:border-[#262626]">
            <div className="flex items-center justify-between gap-6">
              {/* Large Score Badge */}
              <div className="flex items-center gap-4">
                <div 
                  className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center shadow-lg"
                  style={{ backgroundColor: healthColor.bg, color: healthColor.text }}
                >
                  <span className="text-4xl font-bold">{score}</span>
                  <span className="text-xs font-medium opacity-90">{healthColor.label}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Lead Health</span>
                    {healthTrend && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: healthTrend.color }}>
                        <healthTrend.icon size={16} />
                        <span>{healthTrend.label}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {daysInPipeline} days in pipeline • {daysInactive} days inactive
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last activity: {lastInteraction ? formatDateTimeIST(lastInteraction) : 'Never'}
                  </p>
                </div>
              </div>

              {/* Stage Badge */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div 
                    className={`px-4 py-2 rounded-lg text-base font-semibold ${getStageBadgeClass(currentStage)}`}
                    style={currentStage === 'In Sequence' ? {
                      backgroundColor: 'var(--accent-subtle)',
                      color: 'var(--accent-primary)'
                    } : undefined}
                  >
                    {currentStage}
                  </div>
                  <button
                    onClick={() => setShowStageDropdown(!showStageDropdown)}
                    className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Edit stage"
                  >
                    <MdEdit size={18} />
                  </button>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${getStageProgress()}%`,
                        backgroundColor: healthColor.bg,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stageDuration} days in {currentStage}
                  </p>
                </div>
              </div>
            </div>

            {/* Stage Dropdown */}
            {showStageDropdown && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowStageDropdown(false)} />
                <div className="absolute right-6 top-32 z-[70] bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] rounded-lg shadow-xl p-2 w-[220px]">
                  {['New', 'Engaged', 'Qualified', 'High Intent', 'Booking Made', 'Converted', 'Closed Lost', 'In Sequence', 'Cold'].map((stage) => (
                    <button
                      key={stage}
                      onClick={() => handleStageChange(stage as LeadStage)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        currentStage === stage
                          ? getStageBadgeClass(stage) + ' font-semibold'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                      style={currentStage === stage && stage === 'In Sequence' ? {
                        backgroundColor: 'var(--accent-subtle)',
                        color: 'var(--accent-primary)'
                      } : undefined}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* CHANNEL TIMELINE */}
          {activeChannels.length > 0 && (
            <div className="p-6 border-b border-gray-200 dark:border-[#262626]">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Customer Journey</h3>
              <div className="flex items-center gap-4">
                {activeChannels.map((channel, index) => (
                  <div key={channel.key} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: channel.color }}
                      >
                        <channel.icon size={24} />
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{channel.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{channel.count} msgs</p>
                        {channel.firstDate && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDateIST(channel.firstDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    {index < activeChannels.length - 1 && (
                      <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK STATS ROW */}
          <div className="p-6 border-b border-gray-200 dark:border-[#262626]">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-[#1F1F1F] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Messages</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{quickStats.totalMessages}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">exchanged</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#1F1F1F] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Response Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{quickStats.responseRate}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">customer replies</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#1F1F1F] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {quickStats.avgResponseTime > 0 ? `${quickStats.avgResponseTime}m` : '-'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">response time</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#1F1F1F] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Booking</p>
                {quickStats.hasBooking ? (
                  <>
                    <div className="flex items-center gap-2">
                      <MdCheckCircle className="text-green-500" size={24} />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDateIST(
                          currentLead.booking_date || 
                          currentLead.unified_context?.web?.booking_date || 
                          currentLead.unified_context?.web?.booking?.date ||
                          currentLead.unified_context?.whatsapp?.booking_date ||
                          currentLead.unified_context?.whatsapp?.booking?.date ||
                          currentLead.unified_context?.voice?.booking_date ||
                          currentLead.unified_context?.voice?.booking?.date ||
                          currentLead.unified_context?.social?.booking_date ||
                          currentLead.unified_context?.social?.booking?.date
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatBookingTime(
                        currentLead.booking_time || 
                        currentLead.unified_context?.web?.booking_time || 
                        currentLead.unified_context?.web?.booking?.time ||
                        currentLead.unified_context?.whatsapp?.booking_time ||
                        currentLead.unified_context?.whatsapp?.booking?.time ||
                        currentLead.unified_context?.voice?.booking_time ||
                        currentLead.unified_context?.voice?.booking?.time ||
                        currentLead.unified_context?.social?.booking_time ||
                        currentLead.unified_context?.social?.booking?.time
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">-</p>
                )}
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-gray-200 dark:border-[#262626]">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'breakdown'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Score Breakdown
            </button>
            <button
              onClick={() => setActiveTab('interaction')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'interaction'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              100-Day Interaction
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="p-6 max-h-[50vh] overflow-y-auto">
            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div>
                {loadingActivities ? (
                  <div className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="animate-pulse">Loading activities...</div>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">
                    No activities yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => {
                      const getActivityIcon = () => {
                        if (activity.type === 'proxe') {
                          return activity.icon === 'sequence' ? <MdHistory size={16} /> : <MdMessage size={16} />
                        } else if (activity.type === 'team') {
                          switch (activity.icon) {
                            case 'call': return <MdCall size={16} />
                            case 'meeting': return <MdEvent size={16} />
                            case 'message': return <MdMessage size={16} />
                            case 'note': return <MdNote size={16} />
                            default: return <MdHistory size={16} />
                          }
                        } else {
                          return activity.icon === 'booking' ? <MdEvent size={16} /> : <MdMessage size={16} />
                        }
                      }
                      const color = activity.color || '#6B7280'
                      const Icon = getActivityIcon()
                      return (
                        <div key={activity.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                              {Icon}
                            </div>
                            {index < activities.length - 1 && (
                              <div className="w-0.5 flex-1 mt-2" style={{ backgroundColor: color, opacity: 0.3 }} />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {activity.action || 'Activity'}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color }}>
                                  {activity.actor || 'Unknown'}
                                </p>
                              </div>
                              <span className="text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                                {formatDateTimeIST(activity.timestamp)}
                              </span>
                            </div>
                            {activity.content && (
                              <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                                {activity.content}
                              </p>
                            )}
                            {activity.channel && (
                              <span className="text-xs mt-1 inline-block px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                via {activity.channel}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                    <MdAutoAwesome size={16} className="text-blue-500" />
                    Unified Summary
                    {loadingSummary && (
                      <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">Generating...</span>
                    )}
                  </h3>
                  {loadingSummary ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <div className="animate-pulse">Loading summary...</div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm leading-relaxed mb-3 text-gray-700 dark:text-gray-300">
                        {unifiedSummary || 'No summary available. Summary will be generated on next page load.'}
                      </p>
                      {summaryAttribution && (
                        <p className="text-xs pt-3 border-t border-blue-200 dark:border-blue-800 text-gray-500 dark:text-gray-400">
                          {summaryAttribution}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {summaryData && (
                  <div className="space-y-3">
                    {summaryData.keyInfo && (summaryData.keyInfo.budget || summaryData.keyInfo.serviceInterest || summaryData.keyInfo.painPoints) && (
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F1F]">
                        <p className="text-xs font-semibold mb-2 text-gray-900 dark:text-white">Buying Signals</p>
                        <div className="space-y-1">
                          {summaryData.keyInfo.budget && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Budget:</span> {summaryData.keyInfo.budget}
                            </p>
                          )}
                          {summaryData.keyInfo.serviceInterest && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Interest:</span> {summaryData.keyInfo.serviceInterest}
                            </p>
                          )}
                          {summaryData.keyInfo.painPoints && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Pain Points:</span> {summaryData.keyInfo.painPoints}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Score Breakdown Tab */}
            {activeTab === 'breakdown' && (
              <div className="space-y-4">
                {scoreBreakdown ? (
                  <>
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#1F1F1F]">
                      <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white">Score Components</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">AI Analysis (60%)</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">
                              {scoreBreakdown.aiScore}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-blue-500" 
                              style={{ width: `${Math.min(100, (scoreBreakdown.aiScore / 60) * 100)}%` }} 
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Intent signals, sentiment analysis, buying signals from conversation
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Activity (30%)</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">
                              {scoreBreakdown.activityScore}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-green-500" 
                              style={{ width: `${Math.min(100, (scoreBreakdown.activityScore / 30) * 100)}%` }} 
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Message count, response rate, recency, channel mix
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Business Signals (10%)</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">
                              {scoreBreakdown.businessScore}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (scoreBreakdown.businessScore / 10) * 100)}%`,
                                backgroundColor: 'var(--accent-primary)'
                              }} 
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Booking exists, contact info provided, multi-touchpoint
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#262626]">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Total Score</span>
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {scoreBreakdown.totalScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#1F1F1F]">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Score is calculated automatically based on engagement, intent signals, and activity patterns.
                        {currentLead.last_scored_at && ` Last updated: ${formatDateTimeIST(currentLead.last_scored_at)}`}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="animate-pulse">Calculating score breakdown...</div>
                  </div>
                )}
              </div>
            )}

            {/* 100-Day Interaction Tab */}
            {activeTab === 'interaction' && (
              <div className="space-y-4">
                {loading90Days ? (
                  <div className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="animate-pulse">Loading interaction data...</div>
                  </div>
                ) : interaction90Days ? (
                  <>
                    {/* Main Metric */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                          {interaction90Days.totalInteractions}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total interactions</p>
                      </div>
                      {interaction90Days.trend !== 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: interaction90Days.trend > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: interaction90Days.trend > 0 ? '#22C55E' : '#EF4444'
                          }}
                        >
                          {interaction90Days.trend > 0 ? (
                            <MdTrendingUp size={14} />
                          ) : (
                            <MdTrendingDown size={14} />
                          )}
                          <span>{Math.abs(interaction90Days.trend)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Dot Matrix Heatmap - 15 weeks (columns) × 7 days (rows) = 105 cells, showing last 100 days */}
                    <div className="w-full">
                      <div className="flex flex-col gap-1">
                        {/* Week labels row (top) - Right to left, most recent first */}
                        <div className="flex gap-1 mb-1 justify-end">
                          <div className="w-10 text-xs text-gray-500 dark:text-gray-400"></div>
                          {Array.from({ length: 15 }, (_, weekIndex) => {
                            // Reverse order: week 0 (this week) on right, week 14 on left
                            const reversedIndex = 14 - weekIndex
                            return (
                              <div key={weekIndex} className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 font-medium min-w-[30px]">
                                {reversedIndex === 0 ? 'Now' : `${reversedIndex}w`}
                              </div>
                            )
                          }).reverse()}
                        </div>
                        {/* Day rows - 7 rows (days of week), each with 15 columns (weeks) */}
                        {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                          const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                          
                          // Build a map of date -> count for quick lookup
                          const dateCountMap = new Map<string, number>()
                          interaction90Days.dailyData.forEach(d => {
                            dateCountMap.set(d.date, d.count)
                          })
                          
                          // Calculate dates for this day of week across 15 weeks (right to left)
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const weekCells: Array<{ date: string; count: number }> = []
                          
                          // For each of the 15 weeks (0 = this week, 14 = 14 weeks ago)
                          for (let weekIndex = 0; weekIndex < 15; weekIndex++) {
                            // Calculate the date: go back (weekIndex * 7) days, then adjust to this day of week
                            const baseDate = new Date(today)
                            baseDate.setDate(baseDate.getDate() - (weekIndex * 7))
                            
                            // Find the date that falls on this day of week in this week
                            const daysToSubtract = (baseDate.getDay() - dayOfWeek + 7) % 7
                            const targetDate = new Date(baseDate)
                            targetDate.setDate(targetDate.getDate() - daysToSubtract)
                            
                            // Check if this date is within the last 100 days
                            const daysAgo = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
                            
                            if (daysAgo >= 0 && daysAgo < 100) {
                              const dateStr = targetDate.toISOString().split('T')[0]
                              const count = dateCountMap.get(dateStr) || 0
                              weekCells.push({ date: dateStr, count })
                            } else {
                              weekCells.push({ date: '', count: 0 })
                            }
                          }
                          
                          // Reverse the array so most recent is on the right
                          const reversedCells = [...weekCells].reverse()
                          
                          return (
                            <div key={dayOfWeek} className="flex items-center gap-1 justify-end">
                              {/* Day label on left */}
                              <div className="w-10 text-xs text-gray-500 dark:text-gray-400 text-right pr-2 font-medium flex-shrink-0">
                                {dayNames[dayOfWeek]}
                              </div>
                              {/* Days across 15 weeks - reversed (most recent on right) */}
                              <div className="flex flex-wrap justify-end flex-1" style={{ gap: '3px' }}>
                                {reversedCells.map((day, weekIndex) => {
                                  if (!day.date) {
                                    // Empty cell
                                    return (
                                      <div
                                        key={`${dayOfWeek}-${weekIndex}`}
                                        className="w-3 h-3 flex-shrink-0"
                                      />
                                    )
                                  }
                                  
                                  // Improved color intensity mapping with larger dots
                                  let opacity = 0.1 // Very faint for 0 msgs
                                  let size = 10 // Base size (increased)
                                  
                                  if (day.count === 0) {
                                    opacity = 0.08 // Barely visible
                                    size = 10
                                  } else if (day.count >= 1 && day.count <= 2) {
                                    opacity = 0.5 // Medium opacity
                                    size = 11
                                  } else if (day.count >= 3 && day.count <= 5) {
                                    opacity = 0.85 // Bright accent
                                    size = 12
                                  } else if (day.count > 5) {
                                    opacity = 1.0 // Full accent
                                    size = 12 // Larger dot
                                  }
                                  
                                  // Format date for tooltip
                                  const date = new Date(day.date)
                                  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                  
                                  return (
                                    <div
                                      key={`${dayOfWeek}-${weekIndex}`}
                                      className="rounded-full cursor-pointer transition-all hover:scale-125 flex-shrink-0"
                                      style={{
                                        width: `${size}px`,
                                        height: `${size}px`,
                                        backgroundColor: 'var(--accent-primary)',
                                        opacity: opacity,
                                        minWidth: '10px',
                                        minHeight: '10px',
                                      }}
                                      title={`${dateStr}: ${day.count} message${day.count !== 1 ? 's' : ''}`}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-gray-50 dark:bg-[#1F1F1F] rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Busiest Day</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {interaction90Days.busiestDay}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-[#1F1F1F] rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Daily</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {interaction90Days.avgDaily.toFixed(1)} msgs/day
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-center py-4 text-gray-500 dark:text-gray-400">
                    No interaction data available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Logger Modal */}
      {showActivityModal && pendingStageChange && (
        <ActivityLoggerModal
          isOpen={showActivityModal}
          onClose={() => {
            setShowActivityModal(false)
            setPendingStageChange(null)
          }}
          onSave={handleActivitySave}
          leadName={currentLead.name || 'Lead'}
          stageChange={{
            oldStage: pendingStageChange.oldStage,
            newStage: pendingStageChange.newStage
          }}
        />
      )}
    </>
  )
}
