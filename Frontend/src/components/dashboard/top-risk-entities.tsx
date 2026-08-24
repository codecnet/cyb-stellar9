'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { wazuhApi } from '@/lib/api';
import { useClient } from '@/contexts/ClientContext';
import { ClockIcon } from '@heroicons/react/24/outline';
import { subscribeToDataChanges } from '@/lib/alertsStream';

interface RiskHost {
  name: string;
  agent_id: string;
  agent_ip: string;
  critical_count: number;
  latest_alert: string;
  latest_timestamp: string | null;
}

interface RiskUser {
  name: string;
  critical_count: number;
  host_count: number;
  latest_alert: string;
  latest_host: string;
  latest_timestamp: string | null;
}

interface RiskProcess {
  name: string;
  critical_count: number;
  host_count: number;
  latest_alert: string;
  latest_host: string;
  latest_timestamp: string | null;
}

interface TopRiskEntitiesData {
  hosts: RiskHost[];
  users: RiskUser[];
  processes: RiskProcess[];
  total_critical_alerts: number;
}

interface TopRiskEntitiesProps {
  className?: string;
}

// Time range options
const TIME_RANGE_OPTIONS = [
  { value: 0, label: 'All Time' },
  { value: 1, label: 'Last Hour' },
  { value: 6, label: 'Last 6 Hours' },
  { value: 24, label: 'Last 24 Hours' },
  { value: 168, label: 'Last 7 Days' },
  { value: 720, label: 'Last 30 Days' },
  { value: 2160, label: 'Last 90 Days' },
];

export function TopRiskEntities({ className = '' }: TopRiskEntitiesProps) {
  const [data, setData] = useState<TopRiskEntitiesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number>(0); // Default to All Time
  const { selectedClient, isClientMode } = useClient();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const orgId = isClientMode && selectedClient?.id ? selectedClient.id : undefined;
      const hoursParam = selectedHours > 0 ? selectedHours : undefined;
      const response = await wazuhApi.getTopRiskEntities(orgId, hoursParam);

      const riskData = response.data || response;
      setData(riskData);
    } catch (err: any) {
      console.error('Error fetching top risk entities:', err);
      setError(err.message || 'Failed to fetch risk entities');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient?.id, isClientMode, selectedHours]);

  // Initial fetch + re-fetch when client/hours change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SSE: re-fetch when backend detects data changed (replaces 60s polling)
  useEffect(() => {
    const orgId = isClientMode && selectedClient?.id ? selectedClient.id : null;
    return subscribeToDataChanges(orgId, fetchData);
  }, [selectedClient?.id, isClientMode]);

  // Format timestamp to relative time
  const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Truncate text for display
  const truncate = (text: string, maxLen: number = 30): string => {
    if (!text || text === 'N/A') return 'N/A';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  if (isLoading && !data) {
    return (
      <div className={`bg-white rounded-lg p-6 border border-slate-200/80 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-slate-600 mt-2">Loading risk entities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-blue-50 rounded-lg p-6 border border-red-300 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasData = data && (data.hosts.length > 0 || data.users.length > 0 || data.processes.length > 0);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl border border-slate-200/70 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Top 5 Risk Entities
                </h3>
                <p className="text-sm text-slate-500 mt-1">Based on high severity alerts (Level 12+)</p>
              </div>

              {/* Total High Severity Alerts Badge */}
              {data && data.total_critical_alerts > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-red-700">
                    {data.total_critical_alerts} High Severity
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Filter */}
              <div className="flex items-center gap-2 bg-blue-100/80 rounded-lg px-3 py-2 border border-blue-200">
                <ClockIcon className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedHours}
                  onChange={(e) => setSelectedHours(parseInt(e.target.value))}
                  className="bg-transparent text-sm text-slate-700 border-none outline-none cursor-pointer focus:ring-0"
                >
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-white text-slate-700">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {isLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
              )}
            </div>
          </div>

          {!hasData ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-500 text-lg">No high severity alerts detected</p>
                <p className="text-slate-400 text-sm mt-1">No alerts with level 12+ in selected time range</p>
              </div>
            </div>
          ) : (
            /* 3-Column Table Layout */
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Hosts Column */}
              <div className="bg-blue-100/80 rounded-xl border border-blue-200 overflow-hidden">
                <div className="bg-red-50 px-4 py-3 border-b border-blue-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    <h4 className="text-lg font-semibold text-slate-900">Hosts</h4>
                    <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {data?.hosts.length || 0} found
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-blue-200">
                  {data?.hosts.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No risky hosts</div>
                  ) : (
                    data?.hosts.slice(0, 5).map((host, idx) => (
                      <div key={host.agent_id} className="p-4 hover:bg-white transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-red-600">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate">{host.name}</span>
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                                {host.critical_count}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 truncate" title={host.agent_ip}>
                              IP: {host.agent_ip}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 truncate" title={host.latest_alert}>
                              {truncate(host.latest_alert, 40)}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatTime(host.latest_timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Users Column */}
              <div className="bg-blue-100/80 rounded-xl border border-blue-200 overflow-hidden">
                <div className="bg-orange-50 px-4 py-3 border-b border-blue-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-slate-900">Users</h4>
                    <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {data?.users.length || 0} found
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-blue-200">
                  {data?.users.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No risky users</div>
                  ) : (
                    data?.users.slice(0, 5).map((user, idx) => (
                      <div key={user.name} className="p-4 hover:bg-white transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-orange-600">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate">{truncate(user.name, 20)}</span>
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full">
                                {user.critical_count}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Across {user.host_count} host{user.host_count !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 truncate" title={user.latest_alert}>
                              {truncate(user.latest_alert, 40)}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatTime(user.latest_timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Processes Column */}
              <div className="bg-blue-100/80 rounded-xl border border-blue-200 overflow-hidden">
                <div className="bg-yellow-50 px-4 py-3 border-b border-blue-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-slate-900">Processes</h4>
                    <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {data?.processes.length || 0} found
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-blue-200">
                  {data?.processes.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No risky processes</div>
                  ) : (
                    data?.processes.slice(0, 5).map((process, idx) => (
                      <div key={process.name} className="p-4 hover:bg-white transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-yellow-700">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate" title={process.name}>
                                {truncate(process.name, 25)}
                              </span>
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-yellow-700 bg-yellow-100 rounded-full">
                                {process.critical_count}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Across {process.host_count} host{process.host_count !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 truncate" title={process.latest_alert}>
                              {truncate(process.latest_alert, 40)}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatTime(process.latest_timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
