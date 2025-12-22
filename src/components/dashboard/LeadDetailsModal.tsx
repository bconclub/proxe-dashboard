'use client'

import { useState, useEffect } from 'react'
import { formatDateTime, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { MdLanguage, MdChat, MdPhone, MdShare, MdAutoAwesome, MdOpenInNew, MdHistory, MdCall, MdEvent, MdMessage, MdNote } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import LeadStageSelector from './LeadStageSelector'
import { LeadStage } from '@/types'

// Helper functions for IST date/time formatting
function formatDateIST(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  // Format: DD-MM-YYYY
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
  // Format: 11:28 PM (no seconds)
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
  
  // Handle time string formats like "18:00:00" or "18:00"
  const timeParts = timeString.toString().split(':');
  if (timeParts.length < 2) return timeString.toString();
  
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return timeString.toString();
  
  // Convert to 12-hour format
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
    color: '#8B5CF6',
    emoji: '📞'
  },
  social: {
    name: 'Social',
    icon: MdShare,
    color: '#EC4899',
    emoji: '📱'
  }
}

export default function LeadDetailsModal({ lead, isOpen, onClose, onStatusUpdate }: LeadDetailsModalProps) {
  const router = useRouter()
  const [unifiedSummary, setUnifiedSummary] = useState<string>('')
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [leadMetrics, setLeadMetrics] = useState<{
    daysInactive: number
    responseRate: number
  } | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [lastActivity, setLastActivity] = useState<any | null>(null)

  // Load AI-generated unified summary and activities when lead changes
  useEffect(() => {
    if (lead && isOpen) {
      loadUnifiedSummary()
      loadActivities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead, isOpen])

  const loadUnifiedSummary = async () => {
    if (!lead) return

    setLoadingSummary(true)
    try {
      console.log('Loading summary for lead:', lead.id)
      const response = await fetch(`/api/dashboard/leads/${lead.id}/summary`)
      console.log('Summary API response status:', response.status)
      
      const data = await response.json()
      console.log('Summary API response data:', data)
      
      // Always set summary if it exists, even if there was an error
      if (data.summary) {
        setUnifiedSummary(data.summary)
      } else {
        setUnifiedSummary(data.error ? `Error: ${data.error}` : 'Unable to generate summary. Please try again.')
      }
      
      // Set metrics if available
      if (data.data) {
        setLeadMetrics({
          daysInactive: data.data.daysInactive || 0,
          responseRate: data.data.responseRate || 0,
        })
      }
    } catch (error) {
      console.error('Error loading unified summary:', error)
      setUnifiedSummary(`Error: ${error instanceof Error ? error.message : 'Failed to load summary'}`)
    } finally {
      setLoadingSummary(false)
    }
  }

  const loadActivities = async () => {
    if (!lead) return

    setLoadingActivities(true)
    try {
      const response = await fetch(`/api/dashboard/leads/${lead.id}/activities`)
      if (!response.ok) {
        throw new Error('Failed to load activities')
      }
      
      const data = await response.json()
      if (data.success && data.activities) {
        setActivities(data.activities)
        // Set last activity for summary attribution
        if (data.activities.length > 0) {
          setLastActivity(data.activities[0])
        }
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }

  // Calculate days inactive from last_interaction_at or created_at
  const calculateDaysInactive = () => {
    if (!lead) return 0
    // Try to get last_interaction_at from various sources
    const lastInteraction = 
      lead.unified_context?.last_interaction_at || 
      lead.metadata?.last_interaction_at ||
      lead.unified_context?.web?.last_interaction ||
      lead.unified_context?.whatsapp?.last_interaction
    
    if (lastInteraction) {
      const days = Math.floor((new Date().getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(0, days)
    }
    // Fallback: calculate from timestamp
    const days = Math.floor((new Date().getTime() - new Date(lead.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  const daysInactive = leadMetrics?.daysInactive ?? calculateDaysInactive()

  if (!isOpen || !lead) return null

  // Get lead score color
  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return '#6B7280'
    if (score >= 86) return '#22C55E'
    if (score >= 61) return '#F97316'
    if (score >= 31) return '#EAB308'
    return '#3B82F6'
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
      'In Sequence': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Cold': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    return stageColors[stage] || stageColors['New']
  }

  return (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="relative w-full max-w-2xl bg-white dark:bg-[#1A1A1A] rounded-lg shadow-xl z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#262626]">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* SECTION 1: Contact Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Name</p>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{lead.name}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Email</p>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{lead.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Phone</p>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{lead.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Date</p>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatDateTimeIST(lead.timestamp)}
                </p>
              </div>
            </div>

            {/* SECTION 2: Touchpoints + Channels Row */}
            <div className="mb-6">
              {/* First/Last Touchpoint and Booking */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>First Touchpoint</p>
                  <p className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                    {lead.first_touchpoint || lead.source || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Last Touchpoint</p>
                  <p className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                    {lead.last_touchpoint || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Booking</p>
                  {lead.booking_date ? (
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {formatDateIST(lead.booking_date)}, {formatBookingTime(lead.booking_time)}
                      </p>
                      <button
                        onClick={() => {
                          router.push(`/dashboard/bookings?date=${lead.booking_date}`);
                          onClose();
                        }}
                        className="flex items-center gap-1 text-xs mt-1 hover:underline"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        View Booking
                        <MdOpenInNew size={12} />
                      </button>
                    </div>
                  ) : (
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>None</p>
                  )}
                </div>
              </div>
              
              {/* Channels Row with View Conversations */}
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Channels:</span>
                  {ALL_CHANNELS.map((ch) => {
                    const hasChannel = 
                      lead.first_touchpoint === ch || 
                      lead.last_touchpoint === ch ||
                      lead.unified_context?.[ch] ||
                      (lead.metadata?.channels && lead.metadata.channels.includes(ch));
                    
                    return (
                      <ChannelIcon key={ch} channel={ch} size={20} active={hasChannel} />
                    );
                  })}
                </div>
                
                {/* View Conversations Link */}
                <button
                  onClick={() => {
                    router.push(`/dashboard/inbox?lead=${lead.id}`);
                    onClose();
                  }}
                  className="flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  View Conversations
                  <MdOpenInNew size={12} />
                </button>
              </div>
            </div>

            {/* SECTION 3: Unified Summary (AI-generated real-time) */}
            <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--accent-primary)' }}>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <MdAutoAwesome size={16} style={{ color: 'var(--accent-primary)' }} />
                Unified Summary
                {loadingSummary && (
                  <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>Generating...</span>
                )}
              </h3>
              {loadingSummary ? (
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="animate-pulse">Loading summary...</div>
                </div>
              ) : (
                <div>
                  <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {unifiedSummary || 'No summary available. Summary will be generated on next page load.'}
                  </p>
                  {lastActivity && (
                    <p className="text-xs mt-2 pt-2 border-t" style={{ borderColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Last action:</span>{' '}
                      {lastActivity.creator_name || 'Unknown'} • {lastActivity.activity_type} • {formatDateTimeIST(lastActivity.created_at)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 3.5: Activity Log */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <MdHistory size={16} style={{ color: 'var(--accent-primary)' }} />
                Activity Log
              </h3>
              
              {loadingActivities ? (
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="animate-pulse">Loading activities...</div>
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No activities logged yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity, index) => {
                    const getActivityIcon = () => {
                      switch (activity.activity_type) {
                        case 'call':
                          return <MdCall size={16} />
                        case 'meeting':
                          return <MdEvent size={16} />
                        case 'message':
                          return <MdMessage size={16} />
                        case 'note':
                          return <MdNote size={16} />
                        default:
                          return <MdHistory size={16} />
                      }
                    }

                    const getActivityColor = () => {
                      // All activities are team activities, so use blue
                      return '#3B82F6' // Blue
                    }

                    const getActivityTypeLabel = () => {
                      switch (activity.activity_type) {
                        case 'call':
                          return 'Call'
                        case 'meeting':
                          return 'Meeting'
                        case 'message':
                          return 'Message'
                        case 'note':
                          return 'Note'
                        default:
                          return 'Activity'
                      }
                    }

                    const color = getActivityColor()
                    const Icon = getActivityIcon()

                    return (
                      <div key={activity.id} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: color }}
                          >
                            {Icon}
                          </div>
                          {index < activities.length - 1 && (
                            <div
                              className="w-0.5 flex-1 mt-2"
                              style={{ backgroundColor: color, opacity: 0.3 }}
                            />
                          )}
                        </div>

                        {/* Activity content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {getActivityTypeLabel()}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: color }}>
                                {activity.creator_name || 'Unknown User'}
                              </p>
                            </div>
                            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                              {formatDateTimeIST(activity.created_at)}
                            </span>
                          </div>
                          {activity.note && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {activity.note}
                            </p>
                          )}
                          {(activity.duration_minutes || activity.next_followup_date) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {activity.duration_minutes && (
                                <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                  Duration: {activity.duration_minutes} min
                                </span>
                              )}
                              {activity.next_followup_date && (
                                <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                  Follow-up: {formatDateTimeIST(activity.next_followup_date)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SECTION 4: Lead Scoring Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Lead Scoring</h3>
              
              {/* Lead Score with Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Lead Score</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold" style={{ color: getScoreColor(lead.lead_score) }}>
                      {lead.lead_score !== null && lead.lead_score !== undefined ? lead.lead_score : 0}
                    </p>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>/ 100</span>
                    {lead.stage_override && (
                      <span className="text-xs text-gray-400" title="Manual override">🔒</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${lead.lead_score !== null && lead.lead_score !== undefined ? lead.lead_score : 0}%`,
                      backgroundColor: getScoreColor(lead.lead_score),
                    }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Current Stage */}
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Current Stage</p>
                  {lead.lead_stage ? (
                    <div className={`px-3 py-2 rounded-md text-sm font-semibold inline-block ${getStageBadgeClass(lead.lead_stage)}`}>
                      {lead.lead_stage}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>-</p>
                  )}
                </div>

                {/* Days Inactive */}
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Days Inactive</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg font-semibold ${daysInactive > 3 ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {daysInactive}
                    </p>
                    {daysInactive > 3 && (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Alert
                      </span>
                    )}
                  </div>
                </div>

                {/* Response Rate */}
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Response Rate</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {leadMetrics?.responseRate ?? 0}%
                  </p>
                </div>

                {/* Sub-stage (only if High Intent) */}
                {lead.lead_stage === 'High Intent' && lead.sub_stage && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Sub-stage</p>
                    <div className="px-3 py-2 rounded-md text-sm font-semibold inline-block bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100">
                      {lead.sub_stage}
                    </div>
                  </div>
                )}
              </div>

              {/* Stage Selector */}
              <div className="mt-4">
                <LeadStageSelector
                  leadId={lead.id}
                  currentStage={lead.lead_stage as LeadStage | null}
                  currentSubStage={lead.sub_stage || null}
                  onStageChange={async (newStage, newSubStage) => {
                    // Refresh lead data after stage change
                    const supabase = createClient()
                    const { data } = await supabase
                      .from('all_leads')
                      .select('lead_stage, sub_stage, lead_score, stage_override')
                      .eq('id', lead.id)
                      .single()
                    
                    if (data) {
                      // Update local lead state if needed
                      Object.assign(lead, {
                        lead_stage: data.lead_stage,
                        sub_stage: data.sub_stage,
                        lead_score: data.lead_score,
                        stage_override: data.stage_override
                      })
                    }
                    // Reload summary and activities after stage change
                    loadUnifiedSummary()
                    loadActivities()
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
