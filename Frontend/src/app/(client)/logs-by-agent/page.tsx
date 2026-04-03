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
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface TrendPoint {
  timestamp: string
  count: number
}

interface AgentLogData {
  agent_id: string
  agent_name: string
  agent_ip: string
  log_count: number
  trend?: TrendPoint[]
}

interface LogsByAgentResponse {
  agents: AgentLogData[]
  total_agents: number
  total_logs: number
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
function DetailedChart({ data, agent }: { data: TrendPoint[], agent: AgentLogData }) {
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
            <title>{`${new Date(point.timestamp).toLocaleString()}: ${formatNumber(point.count)} logs`}</title>
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
          Log Count
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
  agent: AgentLogData | null,
  isOpen: boolean,
  onClose: () => void
}) {
  if (!isOpen || !agent) return null

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num)

  // Calculate stats
  const trendData = agent.trend || []
  const counts = trendData.map(d => d.count)
  const avgCount = counts.length > 0 ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0
  const minCount = counts.length > 0 ? Math.min(...counts) : 0

  // Trend direction
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(agent.log_count)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Logs</p>
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
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Log Volume Over Time</h4>
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

type SortField = 'agent_id' | 'agent_name' | 'agent_ip' | 'log_count'
type SortOrder = 'asc' | 'desc'

export default function LogsByAgentPage() {
  const { selectedClient } = useClient()
  const [data, setData] = useState<LogsByAgentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('log_count')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedAgent, setSelectedAgent] = useState<AgentLogData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const TABLE_PAGE_SIZE = 10

  // Time range filters
  const [timeRangeType, setTimeRangeType] = useState<'relative' | 'absolute'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('logs_by_agent_timeRangeType') as any) || 'relative'
    }
    return 'relative'
  })
  const [relativeHours, setRelativeHours] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('logs_by_agent_relativeHours') || '24')
    }
    return 24
  })
  const [fromDate, setFromDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('logs_by_agent_fromDate')
      return saved || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    }
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  })
  const [toDate, setToDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('logs_by_agent_toDate')
      return saved || new Date().toISOString().slice(0, 16)
    }
    return new Date().toISOString().slice(0, 16)
  })

  // Save time range settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('logs_by_agent_timeRangeType', timeRangeType)
      localStorage.setItem('logs_by_agent_relativeHours', relativeHours.toString())
      localStorage.setItem('logs_by_agent_fromDate', fromDate)
      localStorage.setItem('logs_by_agent_toDate', toDate)
    }
  }, [timeRangeType, relativeHours, fromDate, toDate])

  const openAgentModal = (agent: AgentLogData) => {
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
      const params = new URLSearchParams()
      if (orgId) params.append('orgId', orgId)
      params.append('limit', '100')

      if (timeRangeType === 'relative' && relativeHours > 0) {
        params.append('hours', relativeHours.toString())
      } else if (timeRangeType === 'absolute') {
        params.append('from', new Date(fromDate).toISOString())
        params.append('to', new Date(toDate).toISOString())
      }

      const response = await wazuhApi.getLogsCountByAgent(
        orgId,
        timeRangeType === 'relative' ? (relativeHours > 0 ? relativeHours : undefined) : undefined,
        100
      )

      // For absolute time, we need a custom fetch
      if (timeRangeType === 'absolute') {
        const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
        const BASE_URL = process.env.NEXT_PUBLIC_RBAC_BASE_IP
        const absoluteUrl = `${BASE_URL}/wazuh/logs/count-by-agent?${params.toString()}`
        const res = await fetch(absoluteUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const absoluteData = await res.json()
        setData(absoluteData.data || absoluteData)
      } else {
        setData(response.data || response)
      }
    } catch (err: any) {
      console.error('Error fetching logs by agent:', err)
      setError(err.message || 'Failed to fetch logs by agent')
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

      if (sortField === 'log_count') {
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

  const getLogCountColor = (count: number, maxCount: number) => {
    const ratio = count / maxCount
    if (ratio > 0.7) return 'text-red-600 dark:text-red-400'
    if (ratio > 0.4) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const maxLogCount = React.useMemo(() => {
    if (!data?.agents?.length) return 1
    return Math.max(...data.agents.map(a => a.log_count || 0))
  }, [data])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DocumentTextIcon className="h-7 w-7 text-blue-500" />
            Log Source Coverage
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View logs distribution across all agents/machines
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon className={clsx('h-5 w-5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ComputerDesktopIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(data.total_agents)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(data.total_logs)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by agent name, ID, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 ml-2 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Time Range Filter */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <ClockIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Time Range</span>
          </div>

          {/* Toggle between Relative and Absolute */}
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1">
            <button
              onClick={() => setTimeRangeType('relative')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeRangeType === 'relative'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Relative
            </button>
            <button
              onClick={() => setTimeRangeType('absolute')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeRangeType === 'absolute'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Absolute
            </button>
          </div>

          {/* Relative Time Selector */}
          {timeRangeType === 'relative' && (
            <select
              value={relativeHours}
              onChange={(e) => setRelativeHours(parseInt(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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

          {/* Absolute Time Range Selector */}
          {timeRangeType === 'absolute' && (
            <>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
                <input
                  type="datetime-local"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
                <input
                  type="datetime-local"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading logs data...</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && data && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th
                    onClick={() => handleSort('agent_id')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Agent ID <SortIcon field="agent_id" />
                  </th>
                  <th
                    onClick={() => handleSort('agent_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Agent Name <SortIcon field="agent_name" />
                  </th>
                  <th
                    onClick={() => handleSort('agent_ip')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    IP Address <SortIcon field="agent_ip" />
                  </th>
                  <th
                    onClick={() => handleSort('log_count')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Log Count <SortIcon field="log_count" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pagedAgents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No agents match your search' : 'No agents found'}
                    </td>
                  </tr>
                ) : (
                  pagedAgents.map((agent) => (
                    <tr key={agent.agent_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {agent.agent_id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ComputerDesktopIcon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {agent.agent_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {agent.agent_ip || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          'text-sm font-semibold',
                          getLogCountColor(agent.log_count, maxLogCount)
                        )}>
                          {formatNumber(agent.log_count)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openAgentModal(agent)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          title="Click to view detailed chart"
                        >
                          <SparklineChart data={agent.trend || []} />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className={clsx(
                              'h-2.5 rounded-full transition-all duration-300',
                              agent.log_count / maxLogCount > 0.7 ? 'bg-red-500' :
                              agent.log_count / maxLogCount > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                            style={{ width: `${(agent.log_count / maxLogCount) * 100}%` }}
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
            const pages: (number | '...')[] = []
            for (let i = 1; i <= totalTablePages; i++) {
              if (i === 1 || i === totalTablePages || (i >= tablePage - 2 && i <= tablePage + 2)) {
                pages.push(i)
              } else if (pages[pages.length - 1] !== '...') {
                pages.push('...')
              }
            }
            const btnBase = 'min-w-[36px] h-9 px-2 text-sm font-medium rounded-lg border transition-colors'
            const btnActive = 'bg-blue-600 border-blue-600 text-white'
            const btnIdle = 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            const btnDisabled = 'opacity-40 cursor-not-allowed'
            return (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredAndSortedAgents.length === 0 ? 0 : (tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filteredAndSortedAgents.length)} of {filteredAndSortedAgents.length} agents
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
                      <span key={`ellipsis-${i}`} className="min-w-[36px] h-9 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">…</span>
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
