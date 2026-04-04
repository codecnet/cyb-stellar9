'use client';

import { useEffect, useState, useCallback } from 'react';
import { wazuhApi } from '@/lib/api';
import { useClient } from '@/contexts/ClientContext';
import { ClockIcon } from '@heroicons/react/24/outline';
import { subscribeToDataChanges } from '@/lib/alertsStream';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Metrics {
  critical_alerts: number;
  major_alerts: number;
  minor_alerts: number;
  compliance_score: string;
  active_agents: number;
  alerts_last_24hr?: number;
}

interface Factor {
  label: string;
  value: number;
  maxValue: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface RiskScoreProps {
  className?: string;
}

// Time range options - keeping consistent with TopRiskEntities
const TIME_RANGE_OPTIONS = [
  { value: 0, label: 'All Time' },
  { value: 1, label: 'Last Hour' },
  { value: 6, label: 'Last 6 Hours' },
  { value: 24, label: 'Last 24 Hours' },
  { value: 168, label: 'Last 7 Days' },
  { value: 720, label: 'Last 30 Days' },
  { value: 2160, label: 'Last 90 Days' },
];

// ── Risk score calculation ────────────────────────────────────────────────────

function computeRiskScore(m: Metrics): { score: number; factors: Factor[] } {
  const compliance = parseFloat(m.compliance_score) || 0;

  const critPts = Math.min((m.critical_alerts / 5) * 35, 35);
  const majPts  = Math.min((m.major_alerts / 20) * 25, 25);
  const minPts  = Math.min((m.minor_alerts / 100) * 10, 10);
  const compPts = ((100 - compliance) / 100) * 30;

  const total = Math.min(Math.round(critPts + majPts + minPts + compPts), 100);

  const sev = (v: number, max: number): Factor['severity'] => {
    const p = v / max;
    if (p >= 0.75) return 'critical';
    if (p >= 0.5)  return 'high';
    if (p >= 0.25) return 'medium';
    return 'low';
  };

  return {
    score: total,
    factors: [
      { label: 'Critical Alerts', value: Math.round(critPts), maxValue: 35,
        description: `${m.critical_alerts} critical alert${m.critical_alerts !== 1 ? 's' : ''} in last 24 h`,
        severity: sev(critPts, 35) },
      { label: 'Major Alerts',    value: Math.round(majPts),  maxValue: 25,
        description: `${m.major_alerts} major alert${m.major_alerts !== 1 ? 's' : ''} in last 24 h`,
        severity: sev(majPts, 25) },
      { label: 'Minor Alerts',    value: Math.round(minPts),  maxValue: 10,
        description: `${m.minor_alerts} minor alert${m.minor_alerts !== 1 ? 's' : ''} in last 24 h`,
        severity: sev(minPts, 10) },
      { label: 'Compliance Gap',  value: Math.round(compPts), maxValue: 30,
        description: `Compliance score: ${compliance}%`,
        severity: sev(compPts, 30) },
    ],
  };
}

const LEVELS = [
  { label: 'Low',      min: 0,   max: 25,  color: '#22c55e', textCls: 'text-green-600 dark:text-green-400',   bgCls: 'bg-green-50 dark:bg-green-900/20'    },
  { label: 'Medium',   min: 25,  max: 50,  color: '#eab308', textCls: 'text-yellow-600 dark:text-yellow-400', bgCls: 'bg-yellow-50 dark:bg-yellow-900/20'  },
  { label: 'High',     min: 50,  max: 75,  color: '#f97316', textCls: 'text-orange-600 dark:text-orange-400', bgCls: 'bg-orange-50 dark:bg-orange-900/20'  },
  { label: 'Critical', min: 75,  max: 101, color: '#ef4444', textCls: 'text-red-600 dark:text-red-400',       bgCls: 'bg-red-50 dark:bg-red-900/20'        },
] as const;

function getLevel(score: number) {
  return LEVELS.find(l => score >= l.min && score < l.max) ?? LEVELS[3];
}

// ── SVG speedometer gauge (0-10 scale, bike-meter style) ──────────────────────
//
// Geometry:
//   centre  (200, 165)   radius 130
//   arc start  150 °  (SVG CW from +x)  = 8 o'clock  → value 0
//   arc end    390 °  (= 30 °)           = 4 o'clock  → value 10
//   total sweep  240 °

const CX = 200;
const CY = 165;
const R  = 130;
const START = 150;   // degrees, SVG clockwise from +x axis
const SWEEP = 240;   // degrees for full 0-10 range

const toRad = (d: number) => (d * Math.PI) / 180;

function polar(deg: number, r: number = R) {
  return { x: CX + r * Math.cos(toRad(deg)), y: CY + r * Math.sin(toRad(deg)) };
}

function valToAngle(v: number, max = 10) {
  return START + (v / max) * SWEEP;
}

function arcD(a1: number, a2: number, r: number = R): string {
  const s = polar(a1, r);
  const e = polar(a2, r);
  const delta = ((a2 - a1) + 360) % 360;
  const large = delta > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// Five color segments across the arc (green → red)
const SEGS = [
  { from: 0,  to: 2,  color: '#22c55e' },   // green
  { from: 2,  to: 4,  color: '#84cc16' },   // lime
  { from: 4,  to: 6,  color: '#eab308' },   // yellow
  { from: 6,  to: 8,  color: '#f97316' },   // orange
  { from: 8,  to: 10, color: '#ef4444' },   // red
];

function Gauge({ score }: { score: number }) {
  // Convert internal 0-100 score → display 0.0-10.0
  const dv = score / 10;
  const needleAngle = valToAngle(dv);
  const level = getLevel(score);

  // Needle polygon (tip → base-right → tail → base-left)
  const tip  = polar(needleAngle, R * 0.70);
  const b1   = polar(needleAngle + 90, 7);
  const b2   = polar(needleAngle - 90, 7);
  const tail = polar(needleAngle + 180, 16);

  const pts = [tip, b1, tail, b2].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox="0 0 400 275" className="w-full max-w-md mx-auto select-none" aria-label={`Risk score: ${dv.toFixed(1)} out of 10`}>
      <defs>
        <filter id="needle-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="hub-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* ── Track (background arc) ── */}
      <path
        d={arcD(START, START + SWEEP)}
        fill="none" strokeWidth={18} strokeLinecap="round"
        className="stroke-gray-200 dark:stroke-gray-700"
      />

      {/* ── Colored arc segments ── */}
      {SEGS.map((seg, i) => (
        <path
          key={i}
          d={arcD(valToAngle(seg.from), valToAngle(seg.to))}
          fill="none"
          stroke={seg.color}
          strokeWidth={18}
          strokeLinecap={i === 0 ? 'round' : i === SEGS.length - 1 ? 'round' : 'butt'}
        />
      ))}

      {/* ── Major ticks + labels (0..10) ── */}
      {Array.from({ length: 11 }, (_, v) => {
        const angle = valToAngle(v);
        const inner = polar(angle, R - 16);
        const outer = polar(angle, R + 12);
        const label = polar(angle, R - 34);
        return (
          <g key={v}>
            <line x1={inner.x.toFixed(1)} y1={inner.y.toFixed(1)}
                  x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
                  strokeWidth={2} className="stroke-gray-400 dark:stroke-gray-500" />
            <text x={label.x.toFixed(1)} y={label.y.toFixed(1)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={11} fontWeight="500"
                  className="fill-gray-500 dark:fill-gray-400">
              {v}
            </text>
          </g>
        );
      })}

      {/* ── Minor ticks (0.5 steps) ── */}
      {Array.from({ length: 20 }, (_, i) => {
        const angle = valToAngle(i * 0.5 + 0.5);
        const inner = polar(angle, R - 7);
        const outer = polar(angle, R + 7);
        return (
          <line key={i}
            x1={inner.x.toFixed(1)} y1={inner.y.toFixed(1)}
            x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
            strokeWidth={1} className="stroke-gray-300 dark:stroke-gray-600" />
        );
      })}

      {/* ── Needle ── */}
      <polygon points={pts} fill="#38bdf8" filter="url(#needle-glow)" />

      {/* ── Hub ── */}
      <circle cx={CX} cy={CY} r={13} fill="#1e293b" filter="url(#hub-shadow)"
        className="dark:fill-gray-300" />
      <circle cx={CX} cy={CY} r={6}  fill="#475569"
        className="dark:fill-gray-500" />

      {/* ── Score number ── */}
      <text x={CX} y={CY + 58} textAnchor="middle"
            fontSize={46} fontWeight="800" fill={level.color}>
        {dv.toFixed(1)}
      </text>
      <text x={CX} y={CY + 80} textAnchor="middle"
            fontSize={12} className="fill-gray-400 dark:fill-gray-500">
        out of 10
      </text>
    </svg>
  );
}

// ── Severity helpers ───────────────────────────────────────────────────────────

const SEV_BADGE: Record<Factor['severity'], string> = {
  low:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const SEV_BAR: Record<Factor['severity'], string> = {
  low: 'bg-green-500', medium: 'bg-yellow-400', high: 'bg-orange-500', critical: 'bg-red-500',
};

// ── Component ──────────────────────────────────────────────────────────────────────

export function RiskScore({ className = '' }: RiskScoreProps) {
  const { selectedClient, isClientMode } = useClient();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number>(24); // Default to Last 24 Hours
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const orgId = isClientMode && selectedClient?.id ? selectedClient.id : undefined;
      
      // Note: You may need to update your API to support hours parameter
      const raw = await wazuhApi.getDashboardMetrics(orgId);
      // Backend wraps response in ApiResponse: { statusCode, data: {...}, message }
      const data = raw?.data ?? raw;

      setMetrics({
        critical_alerts: data.critical_alerts ?? 0,
        major_alerts: data.major_alerts ?? 0,
        minor_alerts: data.minor_alerts ?? 0,
        compliance_score: data.compliance_score ?? '0%',
        active_agents: data.active_agents ?? 0,
        alerts_last_24hr: data.alerts_last_24hr ?? 0,
      });
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching risk score:', err);
      setError(err.message || 'Failed to fetch risk score');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient?.id, isClientMode]);

  // Initial fetch + re-fetch when fetchData reference changes (client/org switch)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SSE: re-fetch when backend detects data changed (replaces 60s polling)
  useEffect(() => {
    const orgId = isClientMode && selectedClient?.id ? selectedClient.id : null;
    return subscribeToDataChanges(orgId, fetchData);
  }, [selectedClient?.id, isClientMode]);

  const { score, factors } = metrics
    ? computeRiskScore(metrics)
    : { score: 0, factors: [] as Factor[] };

  const level = getLevel(score);

  if (isLoading && !metrics) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-gray-300 mt-2">Loading risk score...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-red-700 ${className}`}>
        <div className="flex items-center justify-center h-96">
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

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Modern glass-morphism container */}
      <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border border-gray-600/30 shadow-2xl">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl"></div>

        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-red-500/30">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>

              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Organization Risk Score
                </h3>
                <p className="text-sm text-gray-400 mt-1">Real-time security posture — alerts & compliance</p>
              </div>

              {/* Risk Level Badge */}
              {metrics && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${level.bgCls} border ${level.textCls.replace('text-', 'border-').replace('dark:text-', 'dark:border-')}/30`}>
                  <div className={`w-2 h-2 rounded-full ${level.textCls.replace('text-', 'bg-')} animate-pulse`}></div>
                  <span className={`text-sm font-medium ${level.textCls}`}>
                    {level.label} Risk
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Filter */}
              <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/50">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedHours}
                  onChange={(e) => setSelectedHours(parseInt(e.target.value))}
                  className="bg-transparent text-sm text-gray-300 border-none outline-none cursor-pointer focus:ring-0"
                >
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800 text-gray-300">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {lastUpdated && (
                <span className="text-xs text-gray-400">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}

              {isLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
              )}
            </div>
          </div>

          {/* Business-impact-style top cards */}
          {metrics && (
            <div className="mb-6 bg-gray-800/50 rounded-xl border border-gray-700/50 px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Security Metrics
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-700">
                {[
                  { value: String(metrics.alerts_last_24hr ?? 0), label: 'Alerts (24 h)' },
                  { value: String(metrics.active_agents), label: 'Active Agents' },
                  { value: metrics.compliance_score, label: 'Compliance' },
                ].map(item => (
                  <div key={item.label} className="px-6 first:pl-0 last:pr-0">
                    <div className="text-2xl font-bold text-white">{item.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gauge + breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Gauge card */}
            <div className="lg:col-span-2 bg-gray-800/50 rounded-xl border border-gray-700/50 p-5 flex flex-col items-center gap-3">
              <div className="self-start flex items-center justify-between w-full">
                <span className="text-sm font-semibold text-gray-300">
                  Organization risk score
                </span>
                <span className="text-gray-500 text-base cursor-help" title="Score out of 10">ⓘ</span>
              </div>

              <Gauge score={score} />
            </div>

            {/* Breakdown card */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl border border-gray-700/50 p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-gray-300">Score Breakdown</h2>

              <div className="space-y-5 flex-1">
                {factors.map(f => {
                  const pct = f.maxValue > 0 ? (f.value / f.maxValue) * 100 : 0;
                  return (
                    <div key={f.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">{f.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${SEV_BADGE[f.severity]}`}>
                            {f.severity}
                          </span>
                          <span className="text-xs text-gray-400 tabular-nums">
                            {f.value}<span className="text-gray-500">/{f.maxValue} pts</span>
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${SEV_BAR[f.severity]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{f.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Risk level legend — active level highlighted */}
              <div className="pt-3 border-t border-gray-700">
                <div className="grid grid-cols-4 gap-2">
                  {LEVELS.map(lv => (
                    <div
                      key={lv.label}
                      className={`rounded-lg px-2 py-2 text-center transition-all ${lv.bgCls} ${lv.textCls} ${
                        level.label === lv.label
                          ? 'ring-2 ring-current ring-offset-1 ring-offset-gray-800 shadow scale-105'
                          : 'opacity-40'
                      }`}
                    >
                      <div className="font-bold text-xs">{lv.label}</div>
                      <div className="text-xs opacity-70">{lv.min}–{lv.max === 101 ? 100 : lv.max}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}