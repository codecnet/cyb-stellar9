'use client';

import { useEffect, useState, useCallback } from 'react';
import { wazuhApi } from '@/lib/api';
import { useClient } from '@/contexts/ClientContext';

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RiskScorePage() {
  const { selectedClient, isClientMode } = useClient();
  const orgId = isClientMode && selectedClient?.id ? selectedClient.id : undefined;

  const [metrics, setMetrics]         = useState<Metrics | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const raw = await wazuhApi.getDashboardMetrics(orgId);
      // Backend wraps response in ApiResponse: { statusCode, data: {...}, message }
      const data = raw?.data ?? raw;
      setMetrics({
        critical_alerts:  data.critical_alerts  ?? 0,
        major_alerts:     data.major_alerts     ?? 0,
        minor_alerts:     data.minor_alerts     ?? 0,
        compliance_score: data.compliance_score ?? '0%',
        active_agents:    data.active_agents    ?? 0,
        alerts_last_24hr: data.alerts_last_24hr ?? 0,
      });
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const { score, factors } = metrics
    ? computeRiskScore(metrics)
    : { score: 0, factors: [] as Factor[] };

  const level = getLevel(score);

  // ── Skeleton ──
  if (loading && !metrics) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-pulse space-y-5">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-2 h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="col-span-3 h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organization Risk Score</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time security posture — alerts &amp; compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={() => { setLoading(true); load(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Business-impact-style top cards ── */}
      {metrics && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-sm px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Security Metrics
          </p>
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
            {[
              { value: String(metrics.alerts_last_24hr ?? 0), label: 'Alerts (24 h)' },
              { value: String(metrics.active_agents),         label: 'Active Agents'  },
              { value: metrics.compliance_score,              label: 'Compliance'      },
            ].map(item => (
              <div key={item.label} className="px-6 first:pl-0 last:pr-0">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Gauge + breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Gauge card */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-5 flex flex-col items-center gap-3">
          <div className="self-start flex items-center justify-between w-full">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Organization risk score
            </span>
            <span className="text-gray-300 dark:text-gray-600 text-base cursor-help" title="Score out of 10">ⓘ</span>
          </div>

          <Gauge score={score} />

          {/* Risk level badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide ${level.bgCls} ${level.textCls}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {level.label} Risk
          </div>
        </div>

        {/* Breakdown card */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Score Breakdown</h2>

          <div className="space-y-5 flex-1">
            {factors.map(f => {
              const pct = f.maxValue > 0 ? (f.value / f.maxValue) * 100 : 0;
              return (
                <div key={f.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${SEV_BADGE[f.severity]}`}>
                        {f.severity}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums">
                        {f.value}<span className="text-gray-300 dark:text-gray-600">/{f.maxValue} pts</span>
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${SEV_BAR[f.severity]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{f.description}</p>
                </div>
              );
            })}
          </div>

          {/* Risk level legend — active level highlighted */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-4 gap-2">
              {LEVELS.map(lv => (
                <div
                  key={lv.label}
                  className={`rounded-lg px-2 py-2 text-center transition-all ${lv.bgCls} ${lv.textCls} ${
                    level.label === lv.label
                      ? 'ring-2 ring-current ring-offset-1 shadow scale-105'
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
  );
}
