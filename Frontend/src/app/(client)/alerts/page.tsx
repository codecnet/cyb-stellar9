'use client'

import { useState, useEffect, useRef } from 'react'
import { LiveAlertsTable } from '@/components/alerts/live-alerts-table'
import { ArrowPathIcon, ExclamationTriangleIcon, ShieldExclamationIcon, InformationCircleIcon, TicketIcon, CheckCircleIcon, ChevronUpIcon, ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { useClient } from '@/contexts/ClientContext'
import Cookies from 'js-cookie';
import { ticketsApi } from '@/lib/api'
const BASE_URL = process.env.NEXT_PUBLIC_RBAC_BASE_IP

interface Alert {
  id: string
  severity: 'critical' | 'major' | 'minor'
  description: string
  timestamp: string
  host: string
  agent: string
  rule: string
  status: 'open' | 'investigating' | 'resolved'
}

interface IncomingAlert {
  agent_name: string
  alert_description: string
  host_name: string | null
  rule_groups: string
  severity: number
  time: string
  alert_id: string
  srcip?: string
  location?: any
  // Complete alert JSON fields
  [key: string]: any  // Allow any additional fields from full alert JSON
}

interface StatsData {
  alerts?: IncomingAlert[];
  ticketMap?: Record<string, string>;
}

const mapSeverity = (level: number): Alert['severity'] => {
  if (level >= 13) return 'critical'
  if (level >= 10) return 'major'
  return 'minor'
}


export default function AlertsPage() {
  const [isClient, setIsClient] = useState(false)
  // const [statsData, setStatsData] = useState<any>(null)
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false)
  const { selectedClient, isClientMode } = useClient()
  const [mappedAlerts, setMappedAlerts] = useState<Alert[]>([])
  const [distributionCardsCollapsed, setDistributionCardsCollapsed] = useState(false)
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 })
  const [isFetchingBatches, setIsFetchingBatches] = useState(false)
  const isFetchingRef = useRef(false)  // Prevent concurrent fetches
  const fetchAbortRef = useRef<AbortController | null>(null)  // Cancel in-progress batch fetch
  const [cacheStatus, setCacheStatus] = useState<{ cached: boolean; timestamp: string | null }>({
    cached: false,
    timestamp: null
  })

  // Time range filters
  const [timeRangeType, setTimeRangeType] = useState<'relative' | 'absolute'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('alerts_timeRangeType') as any) || 'relative'
    }
    return 'relative'
  })
  const [relativeHours, setRelativeHours] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('alerts_relativeHours') || '24')
    }
    return 24
  })
  const [fromDate, setFromDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alerts_fromDate')
      return saved || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    }
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  })
  const [toDate, setToDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alerts_toDate')
      return saved || new Date().toISOString().slice(0, 16)
    }
    return new Date().toISOString().slice(0, 16)
  })

  // Save time range settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('alerts_timeRangeType', timeRangeType)
      localStorage.setItem('alerts_relativeHours', relativeHours.toString())
      localStorage.setItem('alerts_fromDate', fromDate)
      localStorage.setItem('alerts_toDate', toDate)
    }
  }, [timeRangeType, relativeHours, fromDate, toDate])

  // Fetch alerts with batch loading and progressive display
  const fetchAlerts = async () => {
    // Cancel any in-progress fetch, then start fresh
    fetchAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    fetchAbortRef.current = abortCtrl;
    isFetchingRef.current = false; // reset so new fetch proceeds

    try {
      isFetchingRef.current = true;
      setIsFetchingBatches(true);

      // Get the Bearer token from the cookie using js-cookie
      const token = Cookies.get('auth_token');
      if (!token) throw new Error('No auth token found in cookies');

      // Build base params with orgId and time parameters
      const baseParams = new URLSearchParams();
      if (isClientMode && selectedClient?.id) {
        baseParams.append('orgId', selectedClient.id);
      }

      // Add time filter parameters (skip if All Time is selected)
      if (timeRangeType === 'relative' && relativeHours > 0) {
        baseParams.append('hours', relativeHours.toString());
      } else if (timeRangeType === 'absolute') {
        baseParams.append('from', new Date(fromDate).toISOString());
        baseParams.append('to', new Date(toDate).toISOString());
      }

      // Step 1: Fetch total count first
      const countUrl = `${BASE_URL}/wazuh/alerts/count?${baseParams.toString()}`;
      const countRes = await fetch(countUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: abortCtrl.signal,
      });

      if (!countRes.ok) {
        throw new Error(`HTTP error! status: ${countRes.status}`);
      }

      // Check cache status from response header
      const xCacheHeader = countRes.headers.get('X-Cache');
      setCacheStatus({
        cached: xCacheHeader === 'HIT',
        timestamp: xCacheHeader === 'HIT' ? new Date().toLocaleTimeString() : null
      });

      const countResponse = await countRes.json();
      const totalAlerts = countResponse.data?.count || 0;

      console.log(`[i] Total alerts to fetch: ${totalAlerts} (Cache: ${xCacheHeader || 'N/A'})`);

      if (totalAlerts === 0) {
        setStatsData(prev => ({ ...prev, alerts: [] }));
        setMappedAlerts([]);
        setFetchProgress({ current: 0, total: 0 });
        setIsFetchingBatches(false);
        return;
      }

      // Step 2: Calculate number of batches needed
      const batchSize = 1000;
      const totalBatches = Math.ceil(totalAlerts / batchSize);
      setFetchProgress({ current: 0, total: totalBatches });

      console.log(`[i] Fetching ${totalBatches} batches of ${batchSize} alerts each`);

      // Step 3: Fetch alerts in batches with progressive loading using search_after
      let allAlerts: IncomingAlert[] = [];
      let searchAfter: any = null;  // Track search_after cursor for deep pagination

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Stop immediately if a newer fetch was triggered
        if (abortCtrl.signal.aborted) {
          console.log('[!] Fetch aborted — filter changed, stopping old batches');
          return;
        }

        const batchParams = new URLSearchParams(baseParams);
        batchParams.append('limit', batchSize.toString());

        // Add search_after parameter if we have a cursor (not for first batch)
        if (searchAfter) {
          batchParams.append('search_after', JSON.stringify(searchAfter));
        }

        const batchUrl = `${BASE_URL}/wazuh/alerts?${batchParams.toString()}`;

        console.log(`[i] Fetching batch ${batchIndex + 1}/${totalBatches} (search_after: ${searchAfter ? 'cursor set' : 'first batch'})`);

        const batchRes = await fetch(batchUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortCtrl.signal,
        });

        if (!batchRes.ok) {
          throw new Error(`HTTP error! status: ${batchRes.status}`);
        }

        const batchResponse = await batchRes.json();
        const batchData = batchResponse.data || batchResponse;
        const batchAlerts = batchData.alerts || [];

        // Update search_after cursor for next batch
        searchAfter = batchData.search_after;

        // If no alerts returned or no search_after, we've reached the end
        if (batchAlerts.length === 0) {
          console.log(`[i] No more alerts to fetch at batch ${batchIndex + 1}`);
          break;
        }

        // Append batch to all alerts
        allAlerts = [...allAlerts, ...batchAlerts];

        // Update progress
        setFetchProgress({ current: batchIndex + 1, total: totalBatches });

        // Progressive loading: update UI with current alerts
        setStatsData(prev => ({ ...prev, alerts: allAlerts }));

        // Map alerts for visualizations
        const formatted = allAlerts.map((a: IncomingAlert) => ({
          id: a.alert_id,
          severity: mapSeverity(a.severity),
          description: a.alert_description,
          timestamp: new Date(a.time).toLocaleString(),
          host: a.host_name ?? a.agent_name ?? 'N/A',
          agent: a.agent_name,
          rule: a.rule_groups,
          status: 'open' as 'open'
        }));
        setMappedAlerts(formatted);

        console.log(`[✓] Batch ${batchIndex + 1}/${totalBatches} loaded (${allAlerts.length}/${totalAlerts} alerts)`);

        // If we got fewer alerts than requested, we've reached the end
        if (batchAlerts.length < batchSize) {
          console.log(`[i] Reached last batch with ${batchAlerts.length} alerts`);
          break;
        }
      }

      console.log(`[✓] All batches loaded: ${allAlerts.length} alerts`);

    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('[✗] Error fetching alerts:', err);
    } finally {
      // Only reset state if this is still the active fetch (not superseded by a newer one)
      if (!abortCtrl.signal.aborted) {
        isFetchingRef.current = false;
        setIsFetchingBatches(false);
        setFetchProgress({ current: 0, total: 0 });
      }
    }
  }

  // Fetch tickets in the background
  const fetchTickets = async () => {
    try {
      // Add organization filter if client is selected (same as alerts)
      const params: any = {}
      if (isClientMode && selectedClient?.id) {
        params.organisation_id = selectedClient.id
      }

      // Scope the alert->ticket lookup to the same window the alerts query uses.
      // A ticket is always created after the alert it came from, so any ticket
      // belonging to a visible alert necessarily falls inside this window - no
      // match is lost. Without this bound the request pulls the entire ticket
      // history (tens of MB), which times out and leaves the map empty, making
      // every alert render as "New Alerts".
      // NOTE: deliberately no end_date - a ticket for an alert at the end of the
      // window can be created after the window closes, and capping the upper
      // bound would wrongly mark that alert as un-ticketed.
      if (timeRangeType === 'relative' && relativeHours > 0) {
        params.start_date = new Date(Date.now() - relativeHours * 3600 * 1000).toISOString()
      } else if (timeRangeType === 'absolute') {
        params.start_date = new Date(fromDate).toISOString()
      }

      const ticketsData = await ticketsApi.getTickets(params)
      const tickets = ticketsData.data || []

      console.log('Fetched tickets for mapping:', tickets)

      const lookup: Record<string, string> = {}
      tickets.forEach((ticket: any) => {
        // Check multiple possible alert ID fields from both new and legacy formats
        const alertId = ticket.alertId || ticket.custom_fields?.ruleId || ticket.ruleId || ticket.alert_id
        if (alertId) {
          lookup[alertId] = ticket._id
          console.log(`Mapping alert ${alertId} to ticket ${ticket._id} (ticket:`, ticket.ticket_number, ')')
        }
      })

      console.log('Final ticket lookup map:', lookup)
      setStatsData(prev => ({ ...prev, ticketMap: lookup }))
    } catch (err) {
      console.error('[✗] Error fetching tickets:', err)
    }
  }

  // Initial load: alerts first, tickets after
  useEffect(() => {
    setIsClient(true)
    setLoading(true)
    fetchAlerts().finally(() => setLoading(false))
    fetchTickets()
  }, [selectedClient?.id, isClientMode, timeRangeType, relativeHours, fromDate, toDate]) // Re-fetch when selected client or time range changes

  // Refresh data on browser refresh
  useEffect(() => {
    const handleRefresh = () => {
      fetchAlerts()
      fetchTickets()
    }
    window.addEventListener('beforeunload', handleRefresh)
    return () => window.removeEventListener('beforeunload', handleRefresh)
  }, [])

  // Manual refresh with button
  const handleManualRefresh = () => {
    setLoading(true)
    fetchAlerts().finally(() => setLoading(false))
    fetchTickets()
  }

  // Handle ticket creation callback
  const handleTicketCreated = (alertId: string, ticketId: string) => {
    console.log(`Ticket created: alert ${alertId} -> ticket ${ticketId}`)
    setStatsData(prev => ({
      ...prev,
      ticketMap: {
        ...prev?.ticketMap,
        [alertId]: ticketId
      }
    }))
  }

  // Calculate severity distribution
  const severityStats = {
    critical: mappedAlerts.filter(alert => alert.severity === 'critical').length,
    major: mappedAlerts.filter(alert => alert.severity === 'major').length,
    minor: mappedAlerts.filter(alert => alert.severity === 'minor').length
  }

  // Calculate ticket status distribution
  const ticketStats = {
    newAlerts: mappedAlerts.filter(alert => !statsData?.ticketMap?.[alert.id]).length,
    oldAlerts: mappedAlerts.filter(alert => statsData?.ticketMap?.[alert.id]).length
  }

  const totalAlerts = mappedAlerts.length;
  const severityTotal = severityStats.critical + severityStats.major + severityStats.minor;
  const ticketTotal = ticketStats.newAlerts + ticketStats.oldAlerts;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Live Alerts
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Monitor and manage security alerts in real-time
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Progress Indicator */}
          {isFetchingBatches && fetchProgress.total > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#4f6ddf]/10 rounded-lg border border-[#4f6ddf]/30">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-[#4f6ddf] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-semibold text-[#4f6ddf]">
                  Batch {fetchProgress.current}/{fetchProgress.total}
                </span>
              </div>
              <div className="w-24 h-1.5 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4f6ddf] transition-all duration-300"
                  style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Cache Status Indicator */}
          {cacheStatus.cached && cacheStatus.timestamp && !loading && !isFetchingBatches && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-700 font-medium">
                Cached • {cacheStatus.timestamp}
              </span>
            </div>
          )}

          <button
            onClick={handleManualRefresh}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
              'bg-[#4f6ddf] hover:bg-[#4360d2] text-white',
              'shadow-[0_4px_12px_-2px_rgba(79,109,223,0.4)] hover:shadow-[0_6px_16px_-2px_rgba(79,109,223,0.5)] hover:-translate-y-0.5',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
            )}
            disabled={loading || isFetchingBatches}
            title={cacheStatus.cached ? "Refresh (bypass cache)" : "Refresh alerts"}
          >
            <ArrowPathIcon className={clsx('w-4 h-4', (loading || isFetchingBatches) && 'animate-spin')} />
            {loading || isFetchingBatches ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] border border-slate-200/70">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ClockIcon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Time Range</span>
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

      {/* Visualization Cards */}
      {isClient && totalAlerts > 0 && (
        <div>
          {/* Cards Header with Central Collapse Control */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              Alert Distribution Overview
            </h2>
            <button
              onClick={() => setDistributionCardsCollapsed(!distributionCardsCollapsed)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#4f6ddf] hover:bg-[#4f6ddf]/8 transition-colors duration-150 text-xs font-semibold"
              title={distributionCardsCollapsed ? 'Expand Charts' : 'Collapse Charts'}
            >
              {distributionCardsCollapsed ? (
                <>
                  <ChevronDownIcon className="w-4 h-4" />
                  Expand
                </>
              ) : (
                <>
                  <ChevronUpIcon className="w-4 h-4" />
                  Collapse
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Severity Distribution Chart */}
            <div className="bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] border border-slate-200/70 p-5">
              <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-2 text-orange-500" />
                  Severity Distribution
                </h3>
              </div>

              {!distributionCardsCollapsed && (
              <div className="transition-all duration-300 ease-in-out">
                {/* Donut Chart */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-48 h-48">
                    <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-100"
                      />
                      {(() => {
                        let offset = 0;
                        const severityData = [
                          { label: 'Critical', value: severityStats.critical, color: '#dc2626' },
                          { label: 'Major', value: severityStats.major, color: '#ea580c' },
                          { label: 'Minor', value: severityStats.minor, color: '#d97706' }
                        ];

                        return severityData.map((d, i) => {
                          if (d.value === 0) return null;
                          const percent = (d.value / severityTotal) * 100;
                          const dash = (percent / 100) * 251.2;
                          const circle = (
                            <circle
                              key={d.label}
                              cx="50"
                              cy="50"
                              r="40"
                              stroke={d.color}
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={`${dash} ${251.2 - dash}`}
                              strokeDashoffset={-offset}
                              className="transition-all duration-500"
                            />
                          );
                          offset += dash;
                          return circle;
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{totalAlerts}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">Total</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-red-600"></div>
                      <span className="text-sm text-slate-700 flex items-center">
                        <ShieldExclamationIcon className="w-4 h-4 mr-1" />
                        Critical
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {severityStats.critical} ({severityTotal > 0 ? ((severityStats.critical / severityTotal) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                      <span className="text-sm text-slate-700 flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                        Major
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {severityStats.major} ({severityTotal > 0 ? ((severityStats.major / severityTotal) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                      <span className="text-sm text-slate-700 flex items-center">
                        <InformationCircleIcon className="w-4 h-4 mr-1" />
                        Minor
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {severityStats.minor} ({severityTotal > 0 ? ((severityStats.minor / severityTotal) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ticket Status Distribution Chart */}
          <div className="bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] border border-slate-200/70 p-5">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <TicketIcon className="w-4 h-4 mr-2 text-[#4f6ddf]" />
                Ticket Status Distribution
              </h3>
            </div>

            {!distributionCardsCollapsed && (
              <div className="transition-all duration-300 ease-in-out">
                {/* Donut Chart */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-48 h-48">
                    <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-100"
                      />
                      {(() => {
                        let offset = 0;
                        const ticketData = [
                          { label: 'New Alerts', value: ticketStats.newAlerts, color: '#dc2626' },
                          { label: 'Ticket Created', value: ticketStats.oldAlerts, color: '#16a34a' }
                        ];

                        return ticketData.map((d, i) => {
                          if (d.value === 0) return null;
                          const percent = (d.value / ticketTotal) * 100;
                          const dash = (percent / 100) * 251.2;
                          const circle = (
                            <circle
                              key={d.label}
                              cx="50"
                              cy="50"
                              r="40"
                              stroke={d.color}
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={`${dash} ${251.2 - dash}`}
                              strokeDashoffset={-offset}
                              className="transition-all duration-500"
                            />
                          );
                          offset += dash;
                          return circle;
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{totalAlerts}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">Total</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-red-600"></div>
                      <span className="text-sm text-slate-700 flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                        New Alerts
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {ticketStats.newAlerts} ({ticketTotal > 0 ? ((ticketStats.newAlerts / ticketTotal) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-600"></div>
                      <span className="text-sm text-slate-700 flex items-center">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        Ticket Created
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {ticketStats.oldAlerts} ({ticketTotal > 0 ? ((ticketStats.oldAlerts / ticketTotal) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>

                {/* Action Summary */}
                <div className="mt-5 p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <div className="text-sm text-slate-700">
                    <strong className="text-slate-900">{ticketStats.newAlerts}</strong> alerts need attention
                    {ticketStats.newAlerts > 0 && (
                      <span className="ml-2 text-red-600 font-medium">
                        • Create tickets for unhandled alerts
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Main Alerts Table */}
      <div className="bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] border border-slate-200/70 p-5">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Alert Activity
        </h2>
        {isClient && statsData?.alerts &&
          <LiveAlertsTable
            alerts={statsData.alerts}
            ticketMap={statsData.ticketMap}
            fetchData={fetchTickets}
            selectedClient={selectedClient}
            onTicketCreated={handleTicketCreated}
          />
        }
      </div>
    </div>
  )
}
