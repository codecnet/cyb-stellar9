'use client'

import { FC } from 'react'
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ServerIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

// 1. Add your type definition at the top
export type DashboardMetrics = {
  active_agents: number
  alerts_last_24hr: number
  avg_response_time: string
  compliance_score: number
  critical_alerts: number
  open_tickets: number
  resolved_today: number
  total_alerts: number
  total_events?: number
  total_logs?: number
  events_per_sec?: number
  logs_per_sec?: number
}

// 2. Accept `data` as props and use it in your cards
type StatsOverviewProps = {
  data: DashboardMetrics | null
}

export const StatsOverview: FC<StatsOverviewProps> = ({ data }) => {

  if (!data) {
    return <div className="text-sm text-gray-500">Loading stats...</div>
  }

  // Format rate values for display
  const formatRate = (rate?: number): string => {
    if (rate === undefined || rate === null) return '0'
    if (rate >= 1000) return `${(rate / 1000).toFixed(1)}K`
    if (rate >= 1) return rate.toFixed(1)
    if (rate >= 0.01) return rate.toFixed(2)
    return rate.toFixed(3)
  }

  const stats = [
    {
      name: 'Total Alerts (All-time)',
      value: data.total_alerts,
      change: '+12%',
      changeType: 'increase',
      icon: ExclamationTriangleIcon,
      viewDetailsLink: '/alerts'
    },
    {
      name: 'Alerts Last 24h',
      value: data.alerts_last_24hr,
      change: '-8%',
      changeType: 'decrease',
      icon: ClockIcon,
      viewDetailsLink: '/alerts'
    },
    {
      name: 'Active Agents',
      value: data.active_agents,
      change: '+3',
      changeType: 'increase',
      icon: ServerIcon,
      viewDetailsLink: '/agents'
    },
    {
      name: 'Total Events',
      value: data.total_events ?? 0,
      change: '',
      changeType: 'increase',
      icon: ChartBarIcon,
      viewDetailsLink: '/events-by-agent'
    },
    {
      name: 'Events / sec',
      value: formatRate(data.events_per_sec),
      change: '',
      changeType: 'increase',
      icon: BoltIcon,
      viewDetailsLink: '/events-by-agent'
    },
    {
      name: 'Logs / sec',
      value: formatRate(data.logs_per_sec),
      change: '',
      changeType: 'increase',
      icon: BoltIcon,
      viewDetailsLink: '/logs-by-agent'
    },
    {
      name: 'Total Logs',
      value: data.total_logs ?? 0,
      change: '',
      changeType: 'increase',
      icon: DocumentTextIcon,
      viewDetailsLink: '/logs-by-agent'
    },
  ]

  const renderCard = (item: typeof stats[0]) => {
    const isIncrease = item.changeType === 'increase'
    return (
      <a
        key={item.name}
        href={item.viewDetailsLink}
        className="group relative flex flex-col gap-2 rounded-xl bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/70 border border-slate-200/60 p-3 shadow-[0_4px_16px_-6px_rgba(37,99,235,0.12)] transition-all duration-200 hover:border-blue-400/40 hover:shadow-[0_10px_30px_-8px_rgba(37,99,235,0.25)] hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_2px_8px_-2px_rgba(79,70,229,0.5)]">
            <item.icon className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          {item.change && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isIncrease
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {item.change}
            </span>
          )}
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 truncate">
            {item.name}
          </p>
          <p className="text-xl font-bold text-slate-900 tabular-nums leading-tight mt-0.5">
            {item.value}
          </p>
        </div>
      </a>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
      {stats.map(renderCard)}
    </div>
  )
} 