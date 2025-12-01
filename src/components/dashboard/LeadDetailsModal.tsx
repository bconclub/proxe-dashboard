'use client'

import { useState, useEffect } from 'react'
import { formatDateTime, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { MdLanguage, MdChat, MdPhone, MdShare, MdAutoAwesome, MdOpenInNew } from 'react-icons/md'
import { useRouter } from 'next/navigation'

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

const STATUS_OPTIONS = [
  'New Lead',
  'Follow Up',
  'RNR (No Response)',
  'Interested',
  'Wrong Enquiry',
  'Call Booked',
  'Closed'
]

const getStatusColor = (status: string | null) => {
  const statusColors: Record<string, { bg: string; text: string }> = {
    'New Lead': { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200' },
    'Follow Up': { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' },
    'RNR (No Response)': { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200' },
    'Interested': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
    'Wrong Enquiry': { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
    'Call Booked': { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200' },
    'Closed': { bg: 'bg-slate-100 dark:bg-slate-900', text: 'text-slate-800 dark:text-slate-200' },
  }
  return statusColors[status || 'New Lead'] || statusColors['New Lead']
}

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
}

interface ChannelSummary {
  channel: 'web' | 'whatsapp' | 'voice' | 'social'
  summary: string
  timestamp: string
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
  const [selectedStatus, setSelectedStatus] = useState<string>(lead?.status || 'New Lead')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [channelSummaries, setChannelSummaries] = useState<ChannelSummary[]>([])
  const [unifiedSummary, setUnifiedSummary] = useState<string>('')
  const [loadingSummaries, setLoadingSummaries] = useState(false)

  // Update selected status when lead changes
  useEffect(() => {
    if (lead) {
      setSelectedStatus(lead.status || 'New Lead')
    }
  }, [lead])

  // Load conversation summaries when lead changes
  useEffect(() => {
    if (lead) {
      loadConversationSummaries()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead])

  const loadConversationSummaries = async () => {
    if (!lead) return

    setLoadingSummaries(true)
    try {
      const summaries: ChannelSummary[] = []
      const supabase = createClient()

      // First, try to get from unified_context
      const unifiedContext = lead.unified_context || lead.metadata?.unified_context

      if (unifiedContext) {
        // Extract summaries from unified_context
        const channels: Array<'web' | 'whatsapp' | 'voice' | 'social'> = ['web', 'whatsapp', 'voice', 'social']
        
        channels.forEach((channel) => {
          const channelData = unifiedContext[channel]
          if (channelData?.conversation_summary) {
            summaries.push({
              channel,
              summary: channelData.conversation_summary,
              timestamp: channelData.last_interaction || channelData.timestamp || ''
            })
          }
        })

        // Get unified summary
        if (unifiedContext.unified_summary) {
          setUnifiedSummary(unifiedContext.unified_summary)
        }
      }

      // If no summaries from unified_context, fetch from channel tables
      if (summaries.length === 0) {
        // Fetch from web_sessions
        const { data: webSessions } = await supabase
          .from('web_sessions')
          .select('conversation_summary, last_message_at, created_at')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (webSessions && webSessions[0]?.conversation_summary) {
          summaries.push({
            channel: 'web',
            summary: webSessions[0].conversation_summary,
            timestamp: webSessions[0].last_message_at || webSessions[0].created_at || ''
          })
        }

        // Fetch from whatsapp_sessions
        const { data: whatsappSessions } = await supabase
          .from('whatsapp_sessions')
          .select('conversation_summary, last_message_at, created_at')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (whatsappSessions && whatsappSessions[0]?.conversation_summary) {
          summaries.push({
            channel: 'whatsapp',
            summary: whatsappSessions[0].conversation_summary,
            timestamp: whatsappSessions[0].last_message_at || whatsappSessions[0].created_at || ''
          })
        }

        // Fetch from voice_sessions (uses call_summary field)
        const { data: voiceSessions } = await supabase
          .from('voice_sessions')
          .select('call_summary, created_at, updated_at')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (voiceSessions && voiceSessions[0]?.call_summary) {
          summaries.push({
            channel: 'voice',
            summary: voiceSessions[0].call_summary,
            timestamp: voiceSessions[0].updated_at || voiceSessions[0].created_at || ''
          })
        }

        // Fetch from social_sessions
        const { data: socialSessions } = await supabase
          .from('social_sessions')
          .select('conversation_summary, last_engagement_at, created_at, updated_at')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (socialSessions && socialSessions[0]?.conversation_summary) {
          summaries.push({
            channel: 'social',
            summary: socialSessions[0].conversation_summary,
            timestamp: socialSessions[0].last_engagement_at || socialSessions[0].updated_at || socialSessions[0].created_at || ''
          })
        }
      }

      // Fallback: try metadata.web_data
      if (summaries.length === 0 && lead.metadata?.web_data?.conversation_summary) {
        summaries.push({
          channel: 'web',
          summary: lead.metadata.web_data.conversation_summary,
          timestamp: lead.metadata.web_data.last_message_at || lead.timestamp
        })
      }

      setChannelSummaries(summaries)

      // Set unified summary fallback (most recent summary)
      if (!unifiedSummary && summaries.length > 0) {
        const mostRecent = summaries.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
        setUnifiedSummary(mostRecent.summary)
      }
    } catch (error) {
      console.error('Error loading conversation summaries:', error)
    } finally {
      setLoadingSummaries(false)
    }
  }

  if (!isOpen || !lead) return null

  const handleStatusUpdate = async () => {
    if (selectedStatus === lead.status) return
    
    setUpdatingStatus(true)
    try {
      await onStatusUpdate(lead.id, selectedStatus)
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setUpdatingStatus(false)
    }
  }


  const formatDateString = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return format(date, 'MMM d, yyyy')
    } catch {
      return dateString
    }
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

            {/* SECTION 3: Unified Summary */}
            {(lead.unified_context?.unified_summary || lead.unified_context?.web?.conversation_summary || lead.unified_context?.whatsapp?.conversation_summary) && (
              <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--accent-primary)' }}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <MdAutoAwesome size={16} style={{ color: 'var(--accent-primary)' }} />
                  Unified Summary
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {lead.unified_context?.unified_summary || 
                   lead.unified_context?.web?.conversation_summary ||
                   lead.unified_context?.whatsapp?.conversation_summary ||
                   'No summary available'}
                </p>
              </div>
            )}

            {/* SECTION 4: Status */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Status</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#262626] bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white rounded-md"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus || selectedStatus === lead.status}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#5B1A8C' }}
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  getStatusColor(lead.status || 'New Lead').bg
                } ${getStatusColor(lead.status || 'New Lead').text}`}>
                  Current: {lead.status || 'New Lead'}
                </div>
              </div>
            </div>

            {/* SECTION 5: Actions */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Actions</h3>
              <div className="flex gap-3">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}
                  >
                    <MdPhone size={18} />
                    Call
                  </a>
                )}
                {lead.phone && (
                  <a
                    href={`https://wa.me/91${lead.phone.replace(/\D/g, '').slice(-10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                    style={{ background: '#22C55E', color: 'white' }}
                  >
                    <img src="/whatsapp-business-stroke-rounded.svg" alt="WhatsApp" width={18} height={18} style={{ filter: 'invert(1)' }} />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
