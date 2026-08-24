'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useClient } from '@/contexts/ClientContext'
import { wazuhApi } from '@/lib/api'
import { subscribeToDataChanges } from '@/lib/alertsStream'
import {
  ComputerDesktopIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChartBarSquareIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface TrendPoint {
  timestamp: string
  count: number
}

interface AgentEventData {
  agent_id: string
  agent_name: string
  agent_ip: string
  event_count: number
  critical_count?: number
  major_count?: number
  trend?: TrendPoint[]
}

interface EventsByAgentResponse {
  agents: AgentEventData[]
  total_agents: number
  total_events: number
  trend_interval?: string
}

// Sparkline Chart Component
function SparklineChart({ data, width = 120, height = 32 }: { data: TrendPoint[], width?: number, height?: number }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-xs" style={{ width, height }}>
        No data
      </div>
    )
  }

  const counts = data.map(d => d.count)
  const maxVal = Math.max(...counts, 1)
  const minVal = Math.min(...counts)
  const range = maxVal - minVal || 1

  // Generate SVG path for the line
  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((point, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartWidth
    const y = padding + chartHeight - ((point.count - minVal) / range) * chartHeight
    return `${x},${y}`
  }).join(' ')

  // Create area path (for gradient fill)
  const areaPath = `M ${padding},${padding + chartHeight} ` +
    data.map((point, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth
      const y = padding + chartHeight - ((point.count - minVal) / range) * chartHeight
      return `L ${x},${y}`
    }).join(' ') +
    ` L ${padding + chartWidth},${padding + chartHeight} Z`

  // Determine trend color based on overall trend
  const firstHalf = counts.slice(0, Math.floor(counts.length / 2))
  const secondHalf = counts.slice(Math.floor(counts.length / 2))
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1)
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1)

  const isIncreasing = secondAvg > firstAvg * 1.1
  const isDecreasing = secondAvg < firstAvg * 0.9

  const strokeColor = isIncreasing ? '#ef4444' : isDecreasing ? '#22c55e' : '#3b82f6'
  const fillColor = isIncreasing ? '#ef444420' : isDecreasing ? '#22c55e20' : '#3b82f620'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${strokeColor}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={fillColor}
        strokeWidth="0"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {data.length > 0 && (
        <circle
          cx={padding + chartWidth}
          cy={padding + chartHeight - ((counts[counts.length - 1] - minVal) / range) * chartHeight}
          r="2.5"
          fill={strokeColor}
        />
      )}
    </svg>
  )
}

// Detailed Chart Component for Modal
function DetailedChart({ data, agent }: { data: TrendPoint[], agent: AgentEventData }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No trend data available
      </div>
    )
  }

  const width = 600
  const height = 280
  const padding = { top: 20, right: 20, bottom: 50, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const counts = data.map(d => d.count)
  const maxVal = Math.max(...counts, 1)
  const minVal = 0 // Start from 0 for better visualization

  // Generate points for the line
  const points = data.map((point, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth
    const y = padding.top + chartHeight - ((point.count - minVal) / (maxVal - minVal || 1)) * chartHeight
    return { x, y, ...point }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')

  // Area path
  const areaPath = `M ${padding.left},${padding.top + chartHeight} ` +
    points.map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${padding.left + chartWidth},${padding.top + chartHeight} Z`

  // Determine trend color
  const firstHalf = counts.slice(0, Math.floor(counts.length / 2))
  const secondHalf = counts.slice(Math.floor(counts.length / 2))
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1)
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1)
  const isIncreasing = secondAvg > firstAvg * 1.1
  const isDecreasing = secondAvg < firstAvg * 0.9
  const strokeColor = isIncreasing ? '#ef4444' : isDecreasing ? '#22c55e' : '#3b82f6'

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(ratio => ({
    value: Math.round(minVal + ratio * (maxVal - minVal)),
    y: padding.top + chartHeight - ratio * chartHeight
  }))

  // X-axis labels (show every nth label based on data length)
  const labelInterval = Math.max(1, Math.floor(data.length / 6))
  const xLabels = data.filter((_, i) => i % labelInterval === 0 || i === data.length - 1).map((point, idx) => {
    const originalIndex = data.findIndex(d => d.timestamp === point.timestamp)
    const x = padding.left + (originalIndex / (data.length - 1 || 1)) * chartWidth
    const date = new Date(point.timestamp)
    return {
      x,
      label: date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  })

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={label.y}
              x2={padding.left + chartWidth}
              y2={label.y}
              stroke="#e5e7eb"
              strokeDasharray="4,4"
              className="dark:stroke-gray-700"
            />
            <text
              x={padding.left - 10}
              y={label.y + 4}
              textAnchor="end"
              className="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {formatNumber(label.value)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={height - 10}
            textAnchor="middle"
            className="text-xs fill-gray-500 dark:fill-gray-400"
            style={{ fontSize: '10px' }}
          >
            {label.label}
          </text>
        ))}

        {/* Area fill */}
        <path
          d={areaPath}
          fill={`${strokeColor}20`}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill={strokeColor}
              className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            />
            {/* Tooltip area */}
            <title>{`${new Date(point.timestamp).toLocaleString()}: ${formatNumber(point.count)} events`}</title>
          </g>
        ))}

        {/* Y-axis label */}
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${height / 2})`}
          className="text-xs fill-gray-500 dark:fill-gray-400 font-medium"
        >
          Event Count
        </text>
      </svg>
    </div>
  )
}

// Modal Component
function AgentTrendModal({
  agent,
  isOpen,
  onClose
}: {
  agent: AgentEventData | null,
  isOpen: boolean,
  onClose: () => void
}) {
  if (!isOpen || !agent) return null

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num)

  const trendData = agent.trend || []
  const counts = trendData.map(d => d.count)
  const avgCount = counts.length > 0 ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0
  const minCount = counts.length > 0 ? Math.min(...counts) : 0

  const firstHalf = counts.slice(0, Math.floor(counts.length / 2))
  const secondHalf = counts.slice(Math.floor(counts.length / 2))
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1)
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1)
  const trendPercent = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ComputerDesktopIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {agent.agent_name || 'Unknown Agent'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {agent.agent_id} • IP: {agent.agent_ip}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(agent.event_count)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Events</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(avgCount)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg per Period</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(maxCount)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Peak</p>
            </div>
            <div className="text-center">
              <p className={clsx(
                'text-2xl font-bold',
                trendPercent > 10 ? 'text-red-600' : trendPercent < -10 ? 'text-green-600' : 'text-blue-600'
              )}>
                {trendPercent > 0 ? '+' : ''}{trendPercent}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Trend</p>
            </div>
          </div>

          {/* Chart */}
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Event Volume Over Time</h4>
            <DetailedChart data={agent.trend || []} agent={agent} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

type SortField = 'agent_id' | 'agent_name' | 'agent_ip' | 'event_count'
type SortOrder = 'asc' | 'desc'

export default function EventsByAgentPage() {
  const { selectedClient } = useClient()
  const [data, setData] = useState<EventsByAgentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('event_count')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedAgent, setSelectedAgent] = useState<AgentEventData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const TABLE_PAGE_SIZE = 10

  // Time range filters
  const [timeRangeType, setTimeRangeType] = useState<'relative' | 'absolute'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('events_by_agent_timeRangeType') as any) || 'relative'
    }
    return 'relative'
  })
  const [relativeHours, setRelativeHours] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('events_by_agent_relativeHours') || '24')
    }
    return 24
  })
  const [fromDate, setFromDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('events_by_agent_fromDate')
      return saved || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    }
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  })
  const [toDate, setToDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('events_by_agent_toDate')
      return saved || new Date().toISOString().slice(0, 16)
    }
    return new Date().toISOString().slice(0, 16)
  })

  // Save time range settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('events_by_agent_timeRangeType', timeRangeType)
      localStorage.setItem('events_by_agent_relativeHours', relativeHours.toString())
      localStorage.setItem('events_by_agent_fromDate', fromDate)
      localStorage.setItem('events_by_agent_toDate', toDate)
    }
  }, [timeRangeType, relativeHours, fromDate, toDate])

  // Calculate timeFilter for display (events per second calculation)
  const timeFilter = timeRangeType === 'relative' ? (relativeHours > 0 ? relativeHours : undefined) : undefined

  const openAgentModal = (agent: AgentEventData) => {
    setSelectedAgent(agent)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedAgent(null)
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = selectedClient?.id

      // Build API call based on time range type
      let url = `/api/wazuh/alerts/count-by-agent`
      const params = new URLSearchParams()
      if (orgId) params.append('orgId', orgId)
      params.append('limit', '100')

      if (timeRangeType === 'relative' && relativeHours > 0) {
        params.append('hours', relativeHours.toString())
      } else if (timeRangeType === 'absolute') {
        params.append('from', new Date(fromDate).toISOString())
        params.append('to', new Date(toDate).toISOString())
      }

      const response = await wazuhApi.getEventsCountByAgent(
        orgId,
        timeRangeType === 'relative' ? (relativeHours > 0 ? relativeHours : undefined) : undefined,
        100
      )

      // For absolute time, we need a custom fetch
      if (timeRangeType === 'absolute') {
        const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
        const BASE_URL = process.env.NEXT_PUBLIC_RBAC_BASE_IP
        const absoluteUrl = `${BASE_URL}/wazuh/alerts/count-by-agent?${params.toString()}`
        const res = await fetch(absoluteUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const absoluteData = await res.json()
        setData(absoluteData.data || absoluteData)
      } else {
        setData(response.data || response)
      }
    } catch (err: any) {
      console.error('Error fetching events by agent:', err)
      setError(err.message || 'Failed to fetch events by agent')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedClient, timeRangeType, relativeHours, fromDate, toDate])

  // SSE: re-fetch immediately when backend detects alert data changed
  useEffect(() => {
    return subscribeToDataChanges(selectedClient?.id ?? null, fetchData)
  }, [selectedClient?.id])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filteredAndSortedAgents = React.useMemo(() => {
    if (!data?.agents) return []

    let filtered = data.agents.filter(agent =>
      agent.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agent_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agent_ip?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'event_count') {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      } else {
        aVal = String(aVal || '').toLowerCase()
        bVal = String(bVal || '').toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [data, searchTerm, sortField, sortOrder])

  // Reset to page 1 whenever filter/sort changes
  React.useEffect(() => { setTablePage(1) }, [searchTerm, sortField, sortOrder])

  const totalTablePages = Math.ceil(filteredAndSortedAgents.length / TABLE_PAGE_SIZE)
  const pagedAgents = filteredAndSortedAgents.slice(
    (tablePage - 1) * TABLE_PAGE_SIZE,
    tablePage * TABLE_PAGE_SIZE
  )

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ArrowUpIcon className="h-4 w-4 inline ml-1" />
    ) : (
      <ArrowDownIcon className="h-4 w-4 inline ml-1" />
    )
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const getEventCountColor = (count: number, maxCount: number) => {
    const ratio = count / maxCount
    if (ratio > 0.7) return 'text-red-600 dark:text-red-400'
    if (ratio > 0.4) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const maxEventCount = React.useMemo(() => {
    if (!data?.agents?.length) return 1
    return Math.max(...data.agents.map(a => a.event_count || 0))
  }, [data])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ChartBarSquareIcon className="h-7 w-7 text-[#4f6ddf]" />
            Event Ingested
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            View events (alerts) distribution across all agents/machines
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
            'bg-[#4f6ddf] hover:bg-[#4360d2] text-white',
            'shadow-[0_4px_12px_-2px_rgba(79,109,223,0.4)] hover:shadow-[0_6px_16px_-2px_rgba(79,109,223,0.5)] hover:-translate-y-0.5',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
          )}
        >
          <ArrowPathIcon className={clsx('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Agents', value: data.total_agents, Icon: ComputerDesktopIcon },
            { label: 'Total Events', value: data.total_events, Icon: ExclamationTriangleIcon },
          ].map(({ label, value, Icon }) => (
            <div
              key={label}
              className="group flex flex-col gap-2 rounded-xl bg-gradient-to-br from-[#4f6ddf]/8 via-white to-[#4f6ddf]/12 border border-slate-200/60 p-3 shadow-[0_4px_16px_-6px_rgba(79,109,223,0.15)] transition-all duration-200 hover:border-[#4f6ddf]/40 hover:shadow-[0_10px_30px_-8px_rgba(79,109,223,0.28)] hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#4f6ddf] shadow-[0_2px_8px_-2px_rgba(79,109,223,0.5)]">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 truncate">{label}</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums leading-tight mt-0.5">
                  {formatNumber(value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] border border-slate-200/70">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by agent name, ID, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4f6ddf]/40 focus:border-[#4f6ddf] text-slate-900 placeholder-slate-400 transition-shadow"
            />
          </div>

          {/* Time Range Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-500">
              <ClockIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Time</span>
            </div>

            {/* Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setTimeRangeType('relative')}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                  timeRangeType === 'relative'
                    ? 'bg-[#4f6ddf] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Relative
              </button>
              <button
                onClick={() => setTimeRangeType('absolute')}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                  timeRangeType === 'absolute'
                    ? 'bg-[#4f6ddf] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Absolute
              </button>
            </div>

            {timeRangeType === 'relative' && (
              <select
                value={relativeHours}
                onChange={(e) => setRelativeHours(parseInt(e.target.value))}
                className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4f6ddf]/40 focus:border-[#4f6ddf] text-slate-700"
              >
                <option value={0}>All Time</option>
                <option value={1}>Last Hour</option>
                <option value={6}>Last 6 Hours</option>
                <option value={24}>Last 24 Hours</option>
                <option value={168}>Last 7 Days</option>
                <option value={720}>Last 30 Days</option>
                <option value={2160}>Last 90 Days</option>
              </select>
            )}

            {timeRangeType === 'absolute' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600">From</label>
                  <input
                    type="datetime-local"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4f6ddf]/40 focus:border-[#4f6ddf] text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600">To</label>
                  <input
                    type="datetime-local"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4f6ddf]/40 focus:border-[#4f6ddf] text-slate-700"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200/70">
          <ArrowPathIcon className="h-6 w-6 text-[#4f6ddf] animate-spin" />
          <span className="ml-2 text-sm text-slate-600">Loading events data...</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && data && (
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-[#4f6ddf] to-[#5b78e6]">
                <tr>
                  <th
                    onClick={() => handleSort('agent_id')}
                    className="px-5 py-3 text-left text-[11px] font-semibold text-white uppercase tracking-[0.08em] cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    Agent ID <SortIcon field="agent_id" />
                  </th>
                  <th
                    onClick={() => handleSort('agent_name')}
                    className="px-5 py-3 text-left text-[11px] font-semibold text-white uppercase tracking-[0.08em] cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    Agent Name <SortIcon field="agent_name" />
                  </th>
                  <th
                    onClick={() => handleSort('agent_ip')}
                    className="px-5 py-3 text-left text-[11px] font-semibold text-white uppercase tracking-[0.08em] cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    IP Address <SortIcon field="agent_ip" />
                  </th>
                  <th
                    onClick={() => handleSort('event_count')}
                    className="px-5 py-3 text-left text-[11px] font-semibold text-white uppercase tracking-[0.08em] cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    Event Count <SortIcon field="event_count" />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-white uppercase tracking-[0.08em]">
                    Trend
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-white uppercase tracking-[0.08em]">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedAgents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                      {searchTerm ? 'No agents match your search' : 'No agents found'}
                    </td>
                  </tr>
                ) : (
                  pagedAgents.map((agent) => (
                    <tr key={agent.agent_id} className="hover:bg-[#4f6ddf]/[0.04] transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#4f6ddf]/10 text-[#4f6ddf]">
                          {agent.agent_id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ComputerDesktopIcon className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-900">
                            {agent.agent_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-sm text-slate-700 font-mono">
                          {agent.agent_ip || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={clsx(
                          'text-sm font-bold tabular-nums',
                          getEventCountColor(agent.event_count, maxEventCount)
                        )}>
                          {formatNumber(agent.event_count)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => openAgentModal(agent)}
                          className="p-1 rounded hover:bg-[#4f6ddf]/10 transition-colors cursor-pointer"
                          title="Click to view detailed chart"
                        >
                          <SparklineChart data={agent.trend || []} />
                        </button>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={clsx(
                              'h-2 rounded-full transition-all duration-300',
                              agent.event_count / maxEventCount > 0.7 ? 'bg-red-500' :
                              agent.event_count / maxEventCount > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'
                            )}
                            style={{ width: `${(agent.event_count / maxEventCount) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Footer / Pagination */}
          {totalTablePages > 1 && (() => {
            // Build page number list with ellipsis: always show first, last, current ±2
            const pages: (number | '...')[] = []
            for (let i = 1; i <= totalTablePages; i++) {
              if (i === 1 || i === totalTablePages || (i >= tablePage - 2 && i <= tablePage + 2)) {
                pages.push(i)
              } else if (pages[pages.length - 1] !== '...') {
                pages.push('...')
              }
            }
            const btnBase = 'min-w-[34px] h-8 px-2 text-xs font-semibold rounded-lg border transition-all duration-150'
            const btnActive = 'bg-[#4f6ddf] border-[#4f6ddf] text-white shadow-[0_2px_6px_-1px_rgba(79,109,223,0.4)]'
            const btnIdle = 'border-slate-200 text-slate-600 bg-white hover:border-[#4f6ddf]/40 hover:text-[#4f6ddf]'
            const btnDisabled = 'opacity-40 cursor-not-allowed'
            return (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/80 bg-slate-50/60">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{filteredAndSortedAgents.length === 0 ? 0 : (tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filteredAndSortedAgents.length)}</span> of <span className="font-semibold text-slate-700">{filteredAndSortedAgents.length}</span> agents
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    className={`${btnBase} px-3 ${tablePage === 1 ? btnDisabled + ' ' + btnIdle : btnIdle}`}
                  >
                    Previous
                  </button>
                  {pages.map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="min-w-[34px] h-8 flex items-center justify-center text-xs text-slate-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setTablePage(p)}
                        className={`${btnBase} ${p === tablePage ? btnActive : btnIdle}`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                    disabled={tablePage === totalTablePages}
                    className={`${btnBase} px-3 ${tablePage === totalTablePages ? btnDisabled + ' ' + btnIdle : btnIdle}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Agent Trend Modal */}
      <AgentTrendModal
        agent={selectedAgent}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  )
}
