'use client'

import { useEffect, useCallback, useState } from 'react'
import { StatsOverview } from './stats-overview'
import { SeverityDonut } from './severity-donut'
import { AttackMap } from './attack-map'
import { AlertsGraph } from './alerts-graph'
import { GlobalThreatsDisplay } from './global-threats-display'
import { TopRiskEntities } from './top-risk-entities'
import { RiskScore } from './risk-score'
import { CyberNews } from './cyber-news'
import { useThreatData } from '../../contexts/ThreatDataContext'
import { useClient } from '@/contexts/ClientContext'
import Cookies from 'js-cookie';
import { wazuhApi } from '@/lib/api'
import { subscribeToDataChanges } from '@/lib/alertsStream'
const BASE_URL = process.env.NEXT_PUBLIC_RBAC_BASE_IP

export function Dashboard() {
  const [isClient, setIsClient] = useState(false)
  const [statsData, setStatsData] = useState(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const { refreshData } = useThreatData()
  const { selectedClient, isClientMode } = useClient()

  useEffect(() => {
    setIsClient(true);
  }, [])

  const fetchStats = useCallback(async (isRetry = false) => {
    try {
      setIsLoading(true);
      if (!isRetry) {
        setError(null);
        setRetryAttempt(0);
      }

      const orgId = isClientMode && selectedClient?.id ? selectedClient.id : undefined;

      const [metricsResponse, totalEventsResponse, totalLogsResponse] = await Promise.all([
        wazuhApi.getDashboardMetrics(orgId),
        wazuhApi.getTotalEventsCount(orgId).catch(() => ({ data: { count: 0 } })),
        wazuhApi.getTotalLogsCount(orgId).catch(() => ({ data: { count: 0 } }))
      ]);

      const metricsData = metricsResponse.data || metricsResponse;
      const totalEvents = totalEventsResponse?.data?.count ?? 0;
      const totalLogs = totalLogsResponse?.data?.count ?? 0;

      const secondsIn24Hours = 24 * 60 * 60;
      setStatsData({
        ...metricsData,
        total_events: totalEvents,
        total_logs: totalLogs,
        events_per_sec: totalEvents / secondsIn24Hours,
        logs_per_sec: totalLogs / secondsIn24Hours
      });
      setLastUpdated(new Date().toLocaleString());
      setError(null);
      setRetryAttempt(0);
    } catch (err: any) {
      console.error('[✗] Error fetching dashboard metrics:', err);
      const userMessage = err.response?.data?.userMessage ||
                         err.response?.data?.error ||
                         'Unable to fetch dashboard data. Please try again later.';
      setError(userMessage);

      const isTransientError = err.response?.status >= 500 ||
                              err.code === 'ECONNREFUSED' ||
                              err.code === 'ETIMEDOUT' ||
                              err.message.includes('timeout');
      if (isTransientError && retryAttempt < 2) {
        setRetryAttempt(prev => prev + 1);
        setTimeout(() => fetchStats(true), 2000);
      }
      if (err.response?.status === 400 || err.response?.status === 404) {
        console.error('Organization credentials issue:', err.response?.data?.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient?.id, isClientMode, retryAttempt]);

  // Initial fetch + re-fetch when client/retry changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // SSE: re-fetch immediately when backend detects data changed (replaces 5s polling)
  useEffect(() => {
    const orgId = isClientMode && selectedClient?.id ? selectedClient.id : null;
    return subscribeToDataChanges(orgId, () => fetchStats());
  }, [selectedClient?.id, isClientMode]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Dashboard</h1>
          {isClientMode && selectedClient && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedClient.name} - {selectedClient.description}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-900 dark:text-gray-400">Loading...</span>
            </div>
          )}
          {!isLoading && (
            <>
              <span className="text-sm text-gray-900 dark:text-gray-400">Last updated: </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-400">{lastUpdated || '...'}</span>
            </>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Dashboard Data Unavailable
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
                {retryAttempt > 0 && (
                  <p className="mt-1 text-xs opacity-75">
                    Auto-retry attempt {retryAttempt}/3 in progress...
                  </p>
                )}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-md px-3 py-2 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isClient && <StatsOverview data={statsData} />}

      {/* Top Risk Score - Full Width */}
      <RiskScore className="w-full" />

      {/* Global Threats Intelligence Display */}
      <GlobalThreatsDisplay className="w-full" />

      {/* Top 5 Risk Entities */}
      <TopRiskEntities className="w-full" />

      {/* Cybersecurity News Feed */}
      <CyberNews className="w-full" />

      {/* Global Threat Map - Full Width */}
      <div className="card-gradient p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Global Threat Map</h2>
          <button
            onClick={() => {
              // Open window immediately to avoid popup blocking
              const newWindow = window.open('/threat-map', '_blank');
              // Refresh data in background
              refreshData();
            }}
            className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
        <AttackMap />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-1 lg:grid-cols-2">
        <div className="card-gradient p-0 rounded-xl overflow-hidden">
          <SeverityDonut data={prepareSeverityData(statsData)} />
        </div>
        <div className="card-gradient p-0 rounded-xl">
          {isClient && statsData && (<AlertsGraph data={statsData} />)}
        </div>
      </div>
    </div>

  )
}

function prepareSeverityData(metrics: any) {
  if (!metrics) return []

  const total = metrics.alerts_last_24hr || 1
  return [
    {
      name: 'Critical',
      value: metrics.critical_alerts,
      color: '#dc2626',
      percentage: parseFloat(((metrics.critical_alerts / total) * 100).toFixed(1)),
    },
    {
      name: 'Major',
      value: metrics.major_alerts,
      color: '#ea580c',
      percentage: parseFloat(((metrics.major_alerts / total) * 100).toFixed(1)),
    },
    {
      name: 'Minor',
      value: metrics.minor_alerts,
      color: '#ca8a04',
      percentage: parseFloat(((metrics.minor_alerts / total) * 100).toFixed(1)),
    }
  ]
}
