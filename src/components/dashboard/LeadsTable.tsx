'use client'

import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { useRealtimeLeads } from '@/hooks/useRealtimeLeads'

interface Lead {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  source: string | null
  timestamp: string
  status: string | null
  booking_date: string | null
  booking_time: string | null
}

interface LeadsTableProps {
  limit?: number
  sourceFilter?: string
}

export default function LeadsTable({ limit, sourceFilter: initialSourceFilter }: LeadsTableProps) {
  const { leads, loading, error } = useRealtimeLeads()
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>(initialSourceFilter || 'all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    let filtered = [...leads]

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0)
        filtered = filtered.filter(
          (lead) => new Date(lead.timestamp) >= filterDate
        )
      } else if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7)
        filtered = filtered.filter(
          (lead) => new Date(lead.timestamp) >= filterDate
        )
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1)
        filtered = filtered.filter(
          (lead) => new Date(lead.timestamp) >= filterDate
        )
      }
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.source === sourceFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.status === statusFilter)
    }

    // Apply limit
    if (limit) {
      filtered = filtered.slice(0, limit)
    }

    setFilteredLeads(filtered)
  }, [leads, dateFilter, sourceFilter, statusFilter, limit])

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Source', 'Timestamp', 'Status']
    const rows = filteredLeads.map((lead) => [
      lead.name || '',
      lead.email || '',
      lead.phone || '',
      lead.source || '',
      lead.timestamp,
      lead.status || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString()}.csv`
    a.click()
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-900 dark:text-gray-100">Loading leads...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-600 dark:text-red-400">Error: {error}</div>
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-[#262626] bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white rounded-md text-sm"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>

        {!initialSourceFilter && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#262626] bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white rounded-md text-sm"
          >
            <option value="all">All Sources</option>
            <option value="web">Web</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="voice">Voice</option>
            <option value="social">Social</option>
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-[#262626] bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white rounded-md text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="booked">Booked</option>
        </select>

        <button
          onClick={exportToCSV}
          className="ml-auto px-4 py-2 text-white rounded-md text-sm transition-colors"
          style={{ backgroundColor: '#5B1A8C' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a1573'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5B1A8C'}
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-[#262626]">
          <thead className="bg-gray-50 dark:bg-[#0D0D0D]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#1A1A1A] divide-y divide-gray-200 dark:divide-[#262626]">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No leads found
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-[#262626]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {lead.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {lead.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {lead.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                      {lead.source || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(lead.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      {lead.status || 'new'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

