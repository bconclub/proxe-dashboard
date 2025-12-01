'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface StatusData {
  systemHealth: {
    version: string
    status: 'ok' | 'error'
    timestamp: string
  }
  environmentKeys: {
    key: string
    isSet: boolean
  }[]
  database: {
    status: 'connected' | 'disconnected' | 'error'
    message: string
  }
  apiStatus: {
    claude: {
      status: 'valid' | 'invalid' | 'error'
      message?: string
    }
    supabase: {
      status: 'valid' | 'invalid' | 'error'
      message?: string
    }
  }
  performance: {
    averageGap: number
    fastest: number
    slowest: number
    sample: string
  }
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      setStatus(data)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    const isGood = status === 'ok' || status === 'connected' || status === 'valid'
    return (
      <span
        className="px-3 py-1 rounded text-sm font-medium text-white"
        style={{
          backgroundColor: isGood ? '#22C55E' : '#EF4444',
        }}
      >
        {status.toUpperCase()}
      </span>
    )
  }

  if (loading && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="text-lg" style={{ color: 'var(--text-secondary)' }}>Loading status...</div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="text-lg text-red-600">Failed to load status</div>
          <button
            onClick={fetchStatus}
            className="mt-4 px-4 py-2 rounded"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Refresh Button */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            System Status
          </h1>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="px-4 py-2 rounded font-medium transition-opacity disabled:opacity-50"
            style={{
              background: '#000000',
              color: '#FFFFFF',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Status Panels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              SYSTEM HEALTH
            </h2>
            <div className="mb-3">{getStatusBadge(status.systemHealth.status)}</div>
            <div className="space-y-2 text-sm">
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Version: </span>
                <span style={{ color: 'var(--text-primary)' }}>v{status.systemHealth.version}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Status: </span>
                <span style={{ color: 'var(--text-primary)' }}>{status.systemHealth.status}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Timestamp: </span>
                <span style={{ color: 'var(--text-primary)' }}>{status.systemHealth.timestamp}</span>
              </div>
            </div>
          </div>

          {/* Environment Keys */}
          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              ENVIRONMENT KEYS
            </h2>
            <div className="space-y-2">
              {status.environmentKeys.map((env) => (
                <div key={env.key} className="flex items-center justify-between">
                  <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                    {env.key}
                  </span>
                  <button
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{
                      background: env.isSet ? '#22C55E' : '#EF4444',
                      color: '#FFFFFF',
                    }}
                    disabled
                  >
                    {env.isSet ? 'SET' : 'NOT SET'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Database */}
          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              DATABASE
            </h2>
            <div className="mb-3">{getStatusBadge(status.database.status)}</div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {status.database.message}
            </p>
          </div>

          {/* API Status */}
          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              API STATUS
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Claude
                  </span>
                  {getStatusBadge(status.apiStatus.claude.status)}
                </div>
                {status.apiStatus.claude.message && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {status.apiStatus.claude.message}
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Supabase
                  </span>
                  {getStatusBadge(status.apiStatus.supabase.status)}
                </div>
                {status.apiStatus.supabase.message && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {status.apiStatus.supabase.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Input to Output Gap */}
          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              INPUT TO OUTPUT GAP
            </h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Average Gap: </span>
                <span
                  className="px-2 py-1 rounded text-sm font-medium"
                  style={{
                    background: '#22C55E',
                    color: '#FFFFFF',
                  }}
                >
                  {status.performance.averageGap}s
                </span>
              </div>
              <div className="text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Fastest: </span>
                <span style={{ color: 'var(--text-primary)' }}>{status.performance.fastest}s</span>
              </div>
              <div className="text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Slowest: </span>
                <span style={{ color: 'var(--text-primary)' }}>{status.performance.slowest}s</span>
              </div>
              <div className="text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Sample: </span>
                <span style={{ color: 'var(--text-primary)' }}>{status.performance.sample}</span>
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                Time from input received to output sent
              </p>
            </div>
          </div>
        </div>

        {/* Last Refresh Time */}
        <div className="mt-6 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          Last refreshed: {format(lastRefresh, 'MMM d, yyyy h:mm:ss a')}
        </div>
      </div>
    </div>
  )
}



