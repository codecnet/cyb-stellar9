/**
 * HTML Report Template Generator for SOC Report
 *
 * Layout strategy:
 *  - Simple page layout with proper margins
 *  - No fixed headers/footers to avoid content overlap
 *  - break-inside: avoid on all cards to prevent splitting across pages
 *  - page-break-before/after for explicit page breaks
 */

function generateSeverityBadge(severity) {
    const map = { critical: 'severity-critical', major: 'severity-major', minor: 'severity-minor' };
    const cls = map[severity] || 'severity-minor';
    return `<span class="severity-badge ${cls}">${severity.charAt(0).toUpperCase() + severity.slice(1)}</span>`;
}

function generateTopAlertsTable(topAlerts) {
    if (!topAlerts || topAlerts.length === 0) {
        return '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b;">No alerts found</td></tr>';
    }
    return topAlerts.slice(0, 10).map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${generateSeverityBadge(a.severity)}</td>
      <td>${a.description}</td>
      <td>${a.host}</td>
      <td>${a.count}</td>
      <td>${a.last_seen}</td>
    </tr>`).join('');
}

function generateStatCard(label, value) {
    return `
    <div class="stat-card">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
    </div>`;
}

function generateCisItem(label, percentage, passed = 0, failed = 0) {
    const details = (passed || failed) ? ` (${passed} passed, ${failed} failed)` : '';
    return `
    <div class="cis-item">
      <span class="stat-label">${label}${details}</span>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="stat-value" style="font-size:16px;">${percentage}%</span>
        <div class="progress-bar" style="width:120px;">
          <div class="progress-fill" style="width:${percentage}%;"></div>
        </div>
      </div>
    </div>`;
}

function generateAgentCard(agent) {
    const statusCls = agent.status === 'active' ? 'status-online' : 'status-offline';
    const statusText = agent.status === 'active' ? 'Active'
        : agent.status === 'disconnected' ? 'Disconnected' : 'Never Connected';
    return `
    <div class="agent-card">
      <div class="agent-header">
        <span class="agent-title">${agent.name || 'Unknown'}</span>
        <span class="status-indicator ${statusCls}">${statusText}</span>
      </div>
      <div class="agent-detail">OS: ${agent.os || 'Unknown'}</div>
      <div class="agent-detail">IP: ${agent.ip || 'N/A'}</div>
      <div class="agent-detail">Version: ${agent.version || 'Unknown'}</div>
      ${agent.lastKeepAlive ? `<div class="agent-detail">Last Seen: ${new Date(agent.lastKeepAlive).toLocaleString()}</div>` : ''}
    </div>`;
}

export function generateHtmlReport(clientName, organisationName, statistics, reportName = '', frequency = 'weekly', template = 'executive') {
    const reportPeriod = statistics.report_period || {};
    const severityCounts = statistics.severity_counts || {};
    const severityPct = statistics.severity_percentages || {};
    const topAlerts = statistics.top_alerts || [];
    const dailyTrend = statistics.daily_trend || {};
    const alertTypes = statistics.alert_types || [];
    const agentSummary = statistics.agent_summary || {};
    const agentsList = statistics.agents_list || [];
    const cisData = statistics.cis_compliance || {};

    const periodStr = reportPeriod.end_date
        ? `${reportPeriod.start_date || 'N/A'} — ${reportPeriod.end_date}`
        : (reportPeriod.start_date || 'N/A');
    const now = new Date();
    const generationDate = now.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: true
    });

    // ── Top alerts HTML ───────────────────────────────────────────────────────
    const topAlertsHtml = generateTopAlertsTable(topAlerts);

    // ── Alert type stat cards ─────────────────────────────────────────────────
    const alertTypeCards = alertTypes.slice(0, 10)
        .map(at => generateStatCard(at.type, at.count)).join('');

    // ── Agent detail cards (limit 12) ─────────────────────────────────────────
    const agentsCardsHtml = agentsList.slice(0, 100)
        .map(a => generateAgentCard(a)).join('');

    // ── CIS policy rows ───────────────────────────────────────────────────────
    let cisItemsHtml = '';
    if (cisData.policies && cisData.policies.length > 0) {
        cisItemsHtml = cisData.policies
            .map(p => generateCisItem(p.name, p.score, p.passed || 0, p.failed || 0))
            .join('');
    } else {
        cisItemsHtml = generateStatCard('No CIS compliance data available', '—');
    }

    // ── Per-agent CIS scores with proper card class for page break handling ──
    let agentsCisHtml = '';
    if (cisData.agents_sca && cisData.agents_sca.length > 0) {
        agentsCisHtml = cisData.agents_sca.map((a, i) => {
            const col = a.score >= 80 ? '#22c55e' : a.score >= 60 ? '#f97316' : '#ef4444';
            return `
        <div class="stat-card agent-compliance-card">
          <div style="flex:1;">
            <span class="stat-label">${i + 1}. ${a.agent_name}</span>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">
              ${a.total_passed} passed, ${a.total_failed} failed (${a.policies_count} policies)
            </div>
          </div>
          <div style="text-align:right;">
            <div class="stat-value" style="font-size:22px;color:${col};">${a.score}%</div>
            <div class="progress-bar" style="width:90px;margin-top:6px;">
              <div class="progress-fill" style="width:${a.score}%;background:${col};"></div>
            </div>
          </div>
        </div>`;
        }).join('');
    } else {
        agentsCisHtml = generateStatCard('No per-agent CIS data available', '—');
    }

    // ── Text bar-chart helpers ────────────────────────────────────────────────
    const textBar = (val, max) => {
        if (!max) return '░'.repeat(20);
        const fill = Math.round((val / max) * 20);
        return '█'.repeat(fill) + '░'.repeat(20 - fill);
    };

    const maxSev = Math.max(severityCounts.critical || 0, severityCounts.major || 0, severityCounts.minor || 0, 1);
    const severityChartHtml = `
    <div style="font-family:monospace;font-size:12px;line-height:2;">
      <div style="display:flex;align-items:center;margin-bottom:6px;">
        <span style="width:80px;color:#ef4444;">Critical:</span>
        <span style="color:#ef4444;">${textBar(severityCounts.critical || 0, maxSev)}</span>
        <span style="margin-left:10px;color:#e4e7eb;">${severityCounts.critical || 0}</span>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:6px;">
        <span style="width:80px;color:#f97316;">Major:</span>
        <span style="color:#f97316;">${textBar(severityCounts.major || 0, maxSev)}</span>
        <span style="margin-left:10px;color:#e4e7eb;">${severityCounts.major || 0}</span>
      </div>
      <div style="display:flex;align-items:center;">
        <span style="width:80px;color:#eab308;">Minor:</span>
        <span style="color:#eab308;">${textBar(severityCounts.minor || 0, maxSev)}</span>
        <span style="margin-left:10px;color:#e4e7eb;">${severityCounts.minor || 0}</span>
      </div>
    </div>`;

    const sortedDates = Object.keys(dailyTrend).sort();
    const last7Days = sortedDates.slice(-7);
    const maxDaily = Math.max(...last7Days.map(d => dailyTrend[d] || 0), 1);
    const dailyTrendChartHtml = last7Days.length > 0 ? `
    <div style="font-family:monospace;font-size:11px;line-height:2.2;padding:8px 0;">
      ${last7Days.map(date => {
        const count = dailyTrend[date] || 0;
        const label = new Date(date + 'T00:00:00Z')
            .toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        const fill = Math.round((count / maxDaily) * 40);
        return `
          <div style="display:flex;align-items:center;margin-bottom:4px;">
            <span style="width:70px;color:#94a3b8;">${label}:</span>
            <span style="color:#3b82f6;">${'█'.repeat(fill)}${'░'.repeat(40 - fill)}</span>
            <span style="margin-left:10px;color:#e4e7eb;font-weight:bold;">${count}</span>
          </div>`;
    }).join('')}
    </div>`
        : '<div style="color:#64748b;padding:16px;">No data for the last 7 days</div>';

    const total = agentSummary.total_agents || 0;
    const active = agentSummary.active_agents || 0;
    const disc = agentSummary.disconnected_agents || 0;
    const neverC = agentSummary.never_connected || 0;
    const healthPct = total > 0 ? Math.round((active / total) * 100) : 0;

    const agentHealthChartHtml = total > 0 ? `
    <div style="font-family:monospace;font-size:12px;line-height:2.5;padding:0px;">
      <div style="display:flex;align-items:center;margin-bottom:6px;">
        <span style="width:140px;color:#22c55e;">Active:</span>
        <span style="color:#22c55e;">${textBar(active, total)}</span>
        <span style="margin-left:10px;color:#e4e7eb;font-weight:bold;">${active}</span>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:6px;">
        <span style="width:140px;color:#ef4444;">Disconnected:</span>
        <span style="color:#ef4444;">${textBar(disc, total)}</span>
        <span style="margin-left:10px;color:#e4e7eb;font-weight:bold;">${disc}</span>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:10px;">
        <span style="width:140px;color:#f97316;">Never Connected:</span>
        <span style="color:#f97316;">${textBar(neverC, total)}</span>
        <span style="margin-left:10px;color:#e4e7eb;font-weight:bold;">${neverC}</span>
      </div>
      <div style="border-top:1px solid #334155;padding-top:10px;">
        <div style="color:#94a3b8;font-size:11px;margin-bottom:6px;">OVERALL HEALTH</div>
        <div style="display:flex;align-items:center;">
          <div style="flex:1;height:18px;background:rgba(15,23,42,0.8);border-radius:9px;overflow:hidden;">
            <div style="height:100%;width:${healthPct}%;background:linear-gradient(90deg,#22c55e,#3b82f6);"></div>
          </div>
          <span style="margin-left:12px;color:#22c55e;font-weight:bold;font-size:15px;">${healthPct}%</span>
        </div>
      </div>
    </div>`
        : '<div style="color:#64748b;padding:20px;text-align:center;">No agent data available</div>';

    // ─────────────────────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SOC Report — ${organisationName} (${clientName})</title>
  <style>
    /* ── Reset and Base Styles ─────────────────────────────────────────── */
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #0f172a;
      color: #e4e7eb;
      line-height: 1.5;
    }

    /* ── Print Settings ────────────────────────────────────────────────── */
    @page {
      size: A4;
      margin: 5mm 5mm 5mm 5mm; /* top right bottom left */
    }

    @media print {
      body {
        background: #0f172a;
        padding: 0;
      }
      
      /* Remove any automatic page breaks that might be causing blank pages */
      .page {
        page-break-after: always !important;
        break-after: page !important;
      }
      
      .page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }

    /* ── Page Container ────────────────────────────────────────────────── */
    .page {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 0;
      page-break-after: always;
      break-after: page;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Remove page break from last page */
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .page-content {
      padding: 5mm 10mm 10mm 10mm;
    }

    /* ── Cover Page ────────────────────────────────────────────────────── */
    .cover-page .page-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 237mm; /* A4 height minus margins */
      padding: 10mm;
    }

    /* ── Section Headers ───────────────────────────────────────────────── */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 5mm 0 8mm 0;
      padding-bottom: 3mm;
      border-bottom: 2px solid #3b82f6;
      page-break-after: avoid;
    }

    .section-title {
      font-size: 24px;
      font-weight: 600;
      color: #e4e7eb;
    }

    .section-meta {
      font-size: 12px;
      color: #64748b;
    }

    /* ── CRITICAL: Prevent splitting of elements across pages ──────────── */
    .stat-card,
    .agent-card,
    .chart-box,
    .chart-row,
    .cis-section,
    .summary-section,
    .cis-item,
    .recommendation-item,
    .alert-table tr,
    .agent-grid > *,
    .agent-compliance-card {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /* ── Chart Layout ──────────────────────────────────────────────────── */
    .chart-row {
      display: flex;
      gap: 8mm;
      margin-bottom: 8mm;
      flex-wrap: wrap;
    }

    .chart-row > .chart-box {
      flex: 1 1 calc(50% - 4mm);
      min-width: 80mm;
    }

    .chart-row.full > .chart-box {
      flex: 1 1 100%;
    }

    .chart-box {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 6mm;
    }

    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 5mm;
    }

    /* ── Stat Cards ────────────────────────────────────────────────────── */
    .stat-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.8);
      padding: 4mm 6mm;
      border-radius: 6px;
      margin-bottom: 3mm;
    }

    .stat-label {
      color: #94a3b8;
      font-size: 13px;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: #3b82f6;
    }

    /* ── Alert Table ───────────────────────────────────────────────────── */
    .alert-table {
      width: 100%;
      border-collapse: collapse;
      margin: 5mm 0;
    }

    .alert-table th {
      background: #1e293b;
      color: #3b82f6;
      padding: 4mm 5mm;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      border-bottom: 2px solid #3b82f6;
    }

    .alert-table td {
      padding: 4mm 5mm;
      border-bottom: 1px solid #334155;
      font-size: 11px;
    }

    /* ── Severity Badges ───────────────────────────────────────────────── */
    .severity-badge {
      padding: 2mm 4mm;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      display: inline-block;
    }

    .severity-critical {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid #ef4444;
    }

    .severity-major {
      background: rgba(249, 115, 22, 0.2);
      color: #f97316;
      border: 1px solid #f97316;
    }

    .severity-minor {
      background: rgba(234, 179, 8, 0.2);
      color: #eab308;
      border: 1px solid #eab308;
    }

    /* ── Agent Grid ────────────────────────────────────────────────────── */
    .agent-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 5mm;
      margin: 5mm 0;
    }

    .agent-card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 5mm;
    }

    .agent-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4mm;
    }

    .agent-title {
      font-size: 14px;
      font-weight: 600;
      color: #cbd5e1;
    }

    .agent-detail {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2mm;
    }

    .status-indicator {
      padding: 1mm 3mm;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
    }

    .status-online {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .status-offline {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    /* ── CIS sections ────────────────────────────────────────────────────── */
    .cis-section {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 6mm;
      margin-bottom: 5mm;
      break-inside: avoid;
      page-break-inside: avoid;
      page-break-before: auto;
      page-break-after: auto;
    }

    .cis-section:last-child {
      margin-bottom: 0;
    }

    .cis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4mm;
    }

    .cis-title {
      font-size: 15px;
      font-weight: 600;
      color: #3b82f6;
    }

    .compliance-score {
      font-size: 24px;
      font-weight: 700;
      color: #22c55e;
    }

    .cis-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3mm 0;
      border-bottom: 1px solid #334155;
    }

    .cis-item:last-child {
      border-bottom: none;
    }

    /* ── Agent Compliance Scores Cards ──────────────────────────── */
    .agent-compliance-card {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-top: 3mm;
      margin-bottom: 3mm;
      page-break-before: auto;
    }

    .agent-compliance-card:first-of-type {
      margin-top: 0;
    }

    /* Container for agent compliance cards */
    .agent-compliance-container {
      margin-top: 3mm;
      padding-top: 1mm;
    }

    /* Ensure proper spacing when cards break to new page */
    @media print {
      .agent-compliance-card {
        page-break-inside: avoid;
        break-inside: avoid;
        margin-top: 3mm;
      }
      
      /* Add space after section header when content flows to new page */
      .cis-section {
        page-break-inside: avoid;
      }
      
      /* Ensure the first card after a page break has proper margin */
      .agent-compliance-card {
        margin-top: 3mm;
      }
    }

    /* Progress bar inside agent compliance cards */
    .agent-compliance-card .progress-bar {
      width: 90px;
      height: 6px;
      background: rgba(15, 23, 42, 0.8);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 6px;
    }

    .agent-compliance-card .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    /* ── Progress Bar ──────────────────────────────────────────────────── */
    .progress-bar {
      width: 100%;
      height: 4mm;
      background: rgba(15, 23, 42, 0.8);
      border-radius: 2mm;
      overflow: hidden;
      margin: 3mm 0;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #22c55e 100%);
    }

    /* ── Summary Sections ──────────────────────────────────────────────── */
    .summary-section {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 6mm;
      margin-bottom: 5mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .summary-section-title {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 4mm;
    }

    .summary-text {
      color: #cbd5e1;
      line-height: 1.6;
      font-size: 12px;
      margin-bottom: 3mm;
    }

    .recommendation-item {
      padding: 2mm 0 2mm 6mm;
      position: relative;
      color: #cbd5e1;
      font-size: 12px;
      line-height: 1.5;
      border-bottom: 1px solid #1e293b;
    }

    .recommendation-item:last-child {
      border-bottom: none;
    }

    .recommendation-item::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #3b82f6;
      font-weight: bold;
    }

    /* ── Cover Elements ─────────────────────────────────────────────────── */
    .logo {
      font-size: 48px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 15mm;
    }

    .logo span {
      color: #60a5fa;
    }

    .report-title {
      font-size: 36px;
      font-weight: 700;
      color: #e4e7eb;
      margin-bottom: 5mm;
    }

    .report-subtitle {
      font-size: 20px;
      color: #94a3b8;
      margin-bottom: 15mm;
    }

    .client-info {
      background: rgba(30, 41, 59, 0.6);
      padding: 10mm 15mm;
      border-radius: 12px;
      border: 1px solid #334155;
      margin-bottom: 15mm;
    }

    .client-name {
      font-size: 28px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 3mm;
    }

    .report-period {
      font-size: 14px;
      color: #94a3b8;
      margin-top: 10mm;
    }

    /* ── Utility Classes ────────────────────────────────────────────────── */
    .text-center { text-align: center; }
    .mt-4 { margin-top: 4mm; }
    .mb-4 { margin-bottom: 4mm; }
  </style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PAGE 1 — Cover                                             -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page cover-page">
  <div class="page-content">
    <div class="logo">CODEC <span>NET</span></div>
    <h1 class="report-title">Security Operations Center</h1>
    <!-- <h2 class="report-subtitle">${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Report</h2> -->

    <div class="client-info">
      <div class="client-name">${organisationName}</div>
      <div style="margin-top:3mm; font-size:14px; color:#94a3b8;">${template.charAt(0).toUpperCase() + template.slice(1)}</div>
    </div>

    <div class="report-period">Report Period: ${periodStr}</div>
    <div style="margin-top:4mm; font-size:11px; color:#475569;">Generated: ${generationDate}</div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PAGE 2 — Top 10 Security Alerts                            -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-content">
    <div class="section-header">
      <h2 class="section-title">Top 10 Security Alerts</h2>
      <span class="section-meta">${periodStr}</span>
    </div>

    <table class="alert-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Severity</th>
          <th>Alert Description</th>
          <th>Host / Agent</th>
          <th>Count</th>
          <th>Last Seen</th>
        </tr>
      </thead>
      <tbody>${topAlertsHtml}</tbody>
    </table>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PAGE 3 — Alert Statistics & Trends                         -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-content">
    <div class="section-header">
      <h2 class="section-title">Alert Statistics & Trends</h2>
      <span class="section-meta">${periodStr}</span>
    </div>

    <div class="chart-row">
      <div class="chart-box">
        <h3 class="chart-title">Alert Distribution</h3>
        ${generateStatCard('Critical', severityCounts.critical || 0)}
        ${generateStatCard('Major', severityCounts.major || 0)}
        ${generateStatCard('Minor', severityCounts.minor || 0)}
        ${generateStatCard('Total Alerts', severityCounts.total || 0)}
      </div>
      <div class="chart-box">
        <h3 class="chart-title">Alert Severity Breakdown</h3>
        <div style="padding:3mm 0;">
          ${severityChartHtml}
          <div style="margin-top:4mm; font-size:11px; color:#94a3b8;">
            Critical: ${severityPct.critical || 0}% &nbsp;|&nbsp;
            Major: ${severityPct.major || 0}% &nbsp;|&nbsp;
            Minor: ${severityPct.minor || 0}%
          </div>
        </div>
      </div>
    </div>

    <div class="chart-row full">
      <div class="chart-box">
        <h3 class="chart-title">Daily Alert Trend (Last 7 Days)</h3>
        ${dailyTrendChartHtml}
      </div>
    </div>

    <div class="chart-row full">
      <div class="chart-box">
        <h3 class="chart-title">Top 10 Alert Types</h3>
        ${alertTypeCards || generateStatCard('No alert type data available', '—')}
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PAGE 4 — Agent Status Overview                             -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-content">
    <div class="section-header">
      <h2 class="section-title">Agent Status Overview</h2>
      <span class="section-meta">${total} agents total</span>
    </div>

    <div class="chart-row">
      <div class="chart-box">
        <h3 class="chart-title">Agent Summary</h3>
        ${generateStatCard('Total Agents', agentSummary.total_agents || 0)}
        ${generateStatCard('Active', agentSummary.active_agents || 0)}
        ${generateStatCard('Disconnected', agentSummary.disconnected_agents || 0)}
        ${generateStatCard('Never Connected', agentSummary.never_connected || 0)}
      </div>
      <div class="chart-box">
        <h3 class="chart-title">Agent Health Status</h3>
        ${agentHealthChartHtml}
      </div>
    </div>

    ${agentsCardsHtml ? `
    <h3 class="chart-title" style="margin:6mm 0 4mm;">Agent Details</h3>
    <div class="agent-grid">${agentsCardsHtml}</div>` : `
    <div class="chart-box" style="margin-top:5mm;">
      <span class="stat-label">No agent details available</span>
    </div>`}
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PAGE 5 — CIS Compliance Status                             -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-content">
    <div class="section-header">
      <h2 class="section-title">CIS Compliance Status</h2>
      <span class="section-meta">SCA Score: ${cisData.overall_score || 0}%</span>
    </div>

    <div class="cis-section">
      <div class="cis-header">
        <span class="cis-title">Overall Compliance Score</span>
        <span class="compliance-score">${cisData.overall_score || 0}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${cisData.overall_score || 0}%;"></div>
      </div>
    </div>

    <div class="cis-section">
      <h3 class="cis-title" style="margin-bottom:4mm;">Configuration Findings Summary</h3>
      ${generateStatCard('Total Checks', cisData.total_checks || 0)}
      <div class="stat-card">
        <span class="stat-label">Passed</span>
        <span class="stat-value" style="font-size:18px; color:#22c55e;">${cisData.total_passed || 0}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Failed</span>
        <span class="stat-value" style="font-size:18px; color:#ef4444;">${cisData.total_failed || 0}</span>
      </div>
    </div>

    <div class="cis-section">
      <h3 class="cis-title" style="margin-bottom:4mm;">Security Configuration Assessment — Per Policy</h3>
      ${cisItemsHtml}
    </div>

    <div class="cis-section">
      <h3 class="cis-title" style="margin-bottom:4mm;">Agent Compliance Scores</h3>
      <div class="agent-compliance-container">
        ${agentsCisHtml}
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PAGE 6 — Executive Summary                                 -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
        <div class="page-content">
            <div class="page-header">
                <h2 class="page-title">Executive Summary</h2>
            </div>

            <div class="summary-section">
                <h3 class="section-title">Overview</h3>
                <p class="summary-text">
                    During the reporting period of ${periodStr}, our Security Operations Center monitored
                    and analyzed ${severityCounts.total || 0} security alerts across your infrastructure.
                    The alert distribution shows ${severityCounts.critical || 0} critical alerts,
                    ${severityCounts.major || 0} major alerts, and ${severityCounts.minor || 0} minor alerts.
                </p>
                <p class="summary-text">
                    Our team has been actively monitoring, triaging, and responding to security events in real-time.
                    ${agentSummary.total_agents || 0} agents are deployed across your infrastructure, with
                    ${agentSummary.active_agents || 0} currently active.
                </p>
                ${cisData.overall_score ? `
                <p class="summary-text">
                    Security configuration assessment shows an overall compliance score of ${cisData.overall_score}%
                    with ${cisData.total_failed || 0} failed checks requiring attention.
                </p>
                ` : ''}
            </div>
        </div>
</div>

</body>
</html>`;
<<<<<<< HEAD
}

/**
 * Generate SOC Efficacy Report HTML
 * Based on SEBI CSCRF Tables 28-34
 */
export function generateSocEfficacyReport(organisationName, reportPeriod, scoreData, rawData) {
  const { final_score, domains } = scoreData;
  const startDate = reportPeriod.start || 'N/A';
  const endDate = reportPeriod.end || 'N/A';
  const generationDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  // Helper to get score color
  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 60) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  // Helper to generate progress bar
  const generateProgressBar = (score, label = '') => {
    const color = getScoreColor(score);
    return `
      <div style="margin: 10px 0;">
        ${label ? `<div style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">${label}</div>` : ''}
        <div style="width: 100%; height: 20px; background: rgba(15, 23, 42, 0.8); border-radius: 10px; overflow: hidden;">
          <div style="height: 100%; width: ${score}%; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">
            ${score.toFixed(2)}%
          </div>
        </div>
      </div>
    `;
  };

  // Generate Table 29: Assets
  const table29 = rawData.table29_assets || {};
  const assetsRows = [
    { label: 'Network Devices', value: table29.network_devices || 0 },
    { label: 'Security Solutions', value: table29.security_solutions || 0 },
    { label: 'End-Points', value: table29.endpoints || 0 },
    { label: 'Applications', value: table29.applications || 0 },
    { label: 'Databases', value: table29.databases || 0 },
    { label: 'Servers', value: table29.servers || 0 }
  ].map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${item.label}</td>
      <td style="text-align: center; font-weight: 600;">${item.value}</td>
    </tr>
  `).join('');

  // Get Domain 1 breakdown (Asset Integration)
  const domain1 = domains.find(d => d.name.includes('Coverage of Assets'));
  const domain1HasNA = domain1?.breakdown?.some(tech => tech.is_na) || false;
  const integrationRows = (domain1?.breakdown || []).map((tech, idx) => {
    const isNA = tech.is_na || false;
    const naStyle = isNA ? 'color: #94a3b8; font-style: italic;' : '';
    const adjustedWeightDisplay = tech.adjusted_weight ? ` (${tech.adjusted_weight.toFixed(2)}%)` : '';

    return `
    <tr style="${isNA ? 'background: rgba(148, 163, 184, 0.1);' : ''}">
      <td>${idx + 1}</td>
      <td style="${naStyle}">${tech.technology}${isNA ? ' <span style="color: #ef4444; font-weight: 600;">[N/A]</span>' : ''}</td>
      <td style="text-align: center; ${naStyle}">${tech.to_be_integrated}</td>
      <td style="text-align: center; ${naStyle}">${tech.actually_integrated}</td>
      <td style="text-align: center; ${naStyle}">${typeof tech.coverage_score === 'number' ? tech.coverage_score.toFixed(2) + '%' : 'N/A'}</td>
      <td style="text-align: center; font-weight: 600; ${isNA ? naStyle : `color: ${getScoreColor(tech.weighted_score || 0)};`}">
        ${tech.weighted_score?.toFixed(2) || 0}${!isNA && adjustedWeightDisplay ? adjustedWeightDisplay : ''}
      </td>
    </tr>
  `}).join('');

  // Get Domain 2 breakdown (SOC Operations)
  const domain2 = domains.find(d => d.name.includes('SOC Operations'));
  const domain2HasNA = domain2?.breakdown?.some(m => m.is_na) || false;
  const operationsRows = (domain2?.breakdown || []).map((metric, idx) => {
    const isNA = metric.is_na || false;
    const naStyle = isNA ? 'color: #94a3b8; font-style: italic;' : '';
    const adjustedWeightDisplay = metric.adjusted_weight ? ` → ${metric.adjusted_weight.toFixed(2)}%` : '';

    return `
    <tr style="${isNA ? 'background: rgba(148, 163, 184, 0.1);' : ''}">
      <td>${idx + 1}</td>
      <td style="${naStyle}">${metric.metric}${isNA ? ' <span style="color: #ef4444; font-weight: 600;">[N/A]</span>' : ''}</td>
      <td style="text-align: center; ${naStyle}">${metric.value}</td>
      <td style="text-align: center; ${naStyle}">${metric.weight}%${!isNA && adjustedWeightDisplay ? adjustedWeightDisplay : ''}</td>
      <td style="text-align: center; font-weight: 600; ${isNA ? naStyle : `color: ${getScoreColor(metric.weighted_score || 0)};`}">
        ${metric.weighted_score?.toFixed(2) || 0}
      </td>
    </tr>
  `}).join('');

  // Get Domain 3 breakdown (Personnel)
  const domain3 = domains.find(d => d.name.includes('Personnel'));
  const domain3HasNA = domain3?.breakdown?.some(c => c.is_na) || false;
  const personnelRows = (domain3?.breakdown || []).map((cat, idx) => {
    const isNA = cat.is_na || false;
    const naStyle = isNA ? 'color: #94a3b8; font-style: italic;' : '';
    const adjustedWeightDisplay = cat.adjusted_weight ? ` → ${cat.adjusted_weight.toFixed(2)}%` : '';

    const tiersHtml = !isNA && cat.tiers ? cat.tiers.map(tier => `
      <div style="font-size: 11px; color: #94a3b8; margin-left: 20px;">
        ${tier.years} years: ${tier.count} engineers (weight: ${tier.weight})
      </div>
    `).join('') : '';

    return `
      <tr style="${isNA ? 'background: rgba(148, 163, 184, 0.1);' : ''}">
        <td>${idx + 1}</td>
        <td>
          <div style="font-weight: 600; ${naStyle}">${cat.category}${isNA ? ' <span style="color: #ef4444; font-weight: 600;">[N/A]</span>' : ''}</div>
          ${tiersHtml}
        </td>
        <td style="text-align: center; ${naStyle}">${cat.weight}%${!isNA && adjustedWeightDisplay ? adjustedWeightDisplay : ''}</td>
        <td style="text-align: center; ${naStyle}">${isNA ? 'N/A' : (cat.category_score?.toFixed(4) || 0)}</td>
        <td style="text-align: center; font-weight: 600; ${isNA ? naStyle : `color: ${getScoreColor(cat.weighted_score || 0)};`}">
          ${cat.weighted_score?.toFixed(2) || 0}
        </td>
      </tr>
    `;
  }).join('');

  // Get Domain 4 breakdown (Governance)
  const domain4 = domains.find(d => d.name.includes('Governance'));
  const domain4HasNA = domain4?.breakdown?.some(m => m.is_na) || false;
  const governanceRows = (domain4?.breakdown || []).map((metric, idx) => {
    const isNA = metric.is_na || false;
    const naStyle = isNA ? 'color: #94a3b8; font-style: italic;' : '';
    const adjustedWeightDisplay = metric.adjusted_weight ? ` → ${metric.adjusted_weight.toFixed(2)}%` : '';

    return `
    <tr style="${isNA ? 'background: rgba(148, 163, 184, 0.1);' : ''}">
      <td>${idx + 1}</td>
      <td style="${naStyle}">${metric.metric}${isNA ? ' <span style="color: #ef4444; font-weight: 600;">[N/A]</span>' : ''}</td>
      <td style="text-align: center; ${naStyle}">${metric.value}</td>
      <td style="text-align: center; ${naStyle}">${metric.weight}%${!isNA && adjustedWeightDisplay ? adjustedWeightDisplay : ''}</td>
      <td style="text-align: center; font-weight: 600; ${isNA ? naStyle : `color: ${getScoreColor(metric.weighted_score || 0)};`}">
        ${metric.weighted_score?.toFixed(2) || 0}
      </td>
    </tr>
  `}).join('');

  // Get Domain 5 breakdown (Enhancements)
  const domain5 = domains.find(d => d.name.includes('Enhancements'));
  const domain5HasNA = domain5?.breakdown?.some(m => m.is_na) || false;
  const enhancementsRows = (domain5?.breakdown || []).map((metric, idx) => {
    const isNA = metric.is_na || false;
    const naStyle = isNA ? 'color: #94a3b8; font-style: italic;' : '';
    const adjustedWeightDisplay = metric.adjusted_weight ? ` → ${metric.adjusted_weight.toFixed(2)}%` : '';

    return `
    <tr style="${isNA ? 'background: rgba(148, 163, 184, 0.1);' : ''}">
      <td>${idx + 1}</td>
      <td style="${naStyle}">${metric.metric}${isNA ? ' <span style="color: #ef4444; font-weight: 600;">[N/A]</span>' : ''}</td>
      <td style="text-align: center; ${naStyle}">${metric.value}</td>
      <td style="text-align: center; ${naStyle}">${metric.weight}%${!isNA && adjustedWeightDisplay ? adjustedWeightDisplay : ''}</td>
      <td style="text-align: center; font-weight: 600; ${isNA ? naStyle : `color: ${getScoreColor(metric.weighted_score || 0)};`}">
        ${metric.weighted_score?.toFixed(2) || 0}
      </td>
    </tr>
  `}).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOC Efficacy Report - ${organisationName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
            color: #e4e7eb;
            margin: 0;
            padding: 0;
        }

        html {
            background: #0f172a !important;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
            page-break-after: always !important;
            page-break-before: auto;
            break-after: page !important;
            position: relative;
            box-sizing: border-box;
        }

        .page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
        }

        .page-content {
            width: 100%;
            padding: 20mm 20mm 30mm 20mm;
            background: transparent;
        }

        .running-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 20mm;
            text-align: center;
            color: #64748b;
            font-size: 12px;
            padding-top: 8mm;
            border-top: 1px solid #334155;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            box-sizing: border-box;
            z-index: 1000;
        }

        .cover-page {
            display: flex;
            flex-direction: column;
        }

        .cover-page .page-content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            min-height: calc(297mm - 50mm);
        }

        .logo {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 60px;
            color: #3b82f6;
        }

        .logo span {
            color: #60a5fa;
        }

        .report-title {
            font-size: 42px;
            font-weight: 700;
            margin-bottom: 20px;
            color: #e4e7eb;
        }

        .report-subtitle {
            font-size: 24px;
            color: #94a3b8;
            margin-bottom: 80px;
        }

        .client-info {
            background: rgba(30, 41, 59, 0.6);
            padding: 40px 60px;
            border-radius: 12px;
            border: 1px solid #334155;
            margin-bottom: 60px;
        }

        .client-name {
            font-size: 32px;
            font-weight: 600;
            color: #3b82f6;
            margin-bottom: 15px;
        }

        .report-period {
            font-size: 18px;
            color: #94a3b8;
            margin-top: 60px;
        }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #3b82f6;
        }

        .page-title {
            font-size: 28px;
            font-weight: 600;
            color: #e4e7eb;
        }

        .page-number {
            font-size: 14px;
            color: #64748b;
        }

        .score-summary {
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
        }

        .final-score-display {
            text-align: center;
            margin: 20px 0;
        }

        .final-score-number {
            font-size: 72px;
            font-weight: 700;
            color: ${getScoreColor(final_score)};
            text-shadow: 0 0 20px ${getScoreColor(final_score)}40;
        }

        .final-score-label {
            font-size: 18px;
            color: #94a3b8;
            margin-top: 10px;
        }

        .domains-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 30px;
        }

        .domain-card {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 20px;
        }

        .domain-name {
            font-size: 14px;
            color: #94a3b8;
            margin-bottom: 10px;
        }

        .domain-score {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .domain-weight {
            font-size: 12px;
            color: #64748b;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .data-table th {
            background: #1e293b;
            color: #3b82f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            border-bottom: 2px solid #3b82f6;
        }

        .data-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #334155;
            font-size: 12px;
        }

        .data-table tr:hover {
            background: rgba(59, 130, 246, 0.1);
        }

        .section-box {
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #3b82f6;
            margin-bottom: 15px;
        }

        @page {
            size: A4;
            margin: 0;
        }

        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            html, body {
                background: #0f172a !important;
                margin: 0;
                height: 100%;
            }
            .page {
                margin: 0;
                box-shadow: none;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
                page-break-after: always !important;
                break-after: page !important;
            }
            .page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
            }
        }
    </style>
</head>
<body>
    <!-- Page 1: Cover Page -->
    <div class="page cover-page">
        <div class="page-content">
            <div class="logo">CODEC <span>NET</span></div>
            <h1 class="report-title">SOC Efficacy Report</h1>
            <h2 class="report-subtitle">SEBI Cybersecurity and Cyber Resilience Framework</h2>

            <div class="client-info">
                <div class="client-name">${organisationName}</div>
                <div style="margin-top: 15px; font-size: 18px; color: #94a3b8;">Assessment Report</div>
            </div>

            <div class="report-period">
                Report Period: ${startDate} - ${endDate}
            </div>
        </div>
    </div>

    <!-- Page 2: Executive Summary (Table 28) -->
    <div class="page">
        <div class="page-content">
            <div class="page-header">
                <h2 class="page-title">Executive Summary</h2>
                <span class="page-number">Page 2 of 8</span>
            </div>

            <div class="score-summary">
                <div class="final-score-display">
                    <div class="final-score-number">${final_score.toFixed(2)}</div>
                    <div class="final-score-label">Overall SOC Efficacy Score</div>
                </div>

                <div class="domains-grid">
                    ${domains.map(domain => `
                        <div class="domain-card">
                            <div class="domain-name">${domain.name}</div>
                            <div class="domain-score" style="color: ${getScoreColor(domain.score)};">
                                ${domain.score.toFixed(2)}
                            </div>
                            <div class="domain-weight">Weight: ${domain.weight}% | Normalized: ${domain.normalized_score.toFixed(2)}</div>
                            ${generateProgressBar(domain.score, '')}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="section-box">
                <div class="section-title">Score Breakdown</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Domain</th>
                            <th style="text-align: center;">Weightage</th>
                            <th style="text-align: center;">Score</th>
                            <th style="text-align: center;">Normalized Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${domains.map(domain => `
                            <tr>
                                <td>${domain.name}</td>
                                <td style="text-align: center;">${domain.weight}%</td>
                                <td style="text-align: center; font-weight: 600; color: ${getScoreColor(domain.score)};">
                                    ${domain.score.toFixed(2)}
                                </td>
                                <td style="text-align: center; font-weight: 600; color: ${getScoreColor(domain.normalized_score)};">
                                    ${domain.normalized_score.toFixed(2)}
                                </td>
                            </tr>
                        `).join('')}
                        <tr style="background: rgba(59, 130, 246, 0.1); font-weight: 700;">
                            <td>FINAL SCORE</td>
                            <td style="text-align: center;">100%</td>
                            <td style="text-align: center;">-</td>
                            <td style="text-align: center; color: ${getScoreColor(final_score)}; font-size: 18px;">
                                ${final_score.toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Page 3: Table 29 - IT Asset Distribution -->
    <div class="page">
        <div class="page-content">
            <div class="page-header">
                <h2 class="page-title">IT Asset Distribution</h2>
                <span class="page-number">Page 3 of 8</span>
            </div>

            <div class="section-box">
                <div class="section-title">CSCRF Annexure N - Table 29 - IT Asset Inventory</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>System Type</th>
                            <th style="text-align: center;">Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assetsRows}
                        <tr style="background: rgba(59, 130, 246, 0.1); font-weight: 700;">
                            <td colspan="2">TOTAL ASSETS</td>
                            <td style="text-align: center; font-size: 16px;">
                                ${Object.values(table29).reduce((sum, val) => sum + (val || 0), 0)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Page 4: Table 30 - Asset Integration -->
    <div class="page">
        <div class="page-content">
            <div class="page-header">
                <h2 class="page-title">Asset Integration with SOC Technologies</h2>
                <span class="page-number">Page 4 of 8</span>
            </div>

            <div class="section-box">
                <div class="section-title">CSCRF Annexure N - Table 30 - Technology Coverage Assessment</div>
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Domain 1 Score:</div>
                    <div style="font-size: 36px; font-weight: 700; color: ${getScoreColor(domain1?.score || 0)};">
                        ${(domain1?.score || 0).toFixed(2)}
                    </div>
                    ${generateProgressBar(domain1?.score || 0)}
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>SOC Technology</th>
                            <th style="text-align: center;">To Be Integrated</th>
                            <th style="text-align: center;">Actually Integrated</th>
                            <th style="text-align: center;">Coverage %</th>
                            <th style="text-align: center;">Weighted Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${integrationRows}
                        <tr style="background: rgba(59, 130, 246, 0.1); font-weight: 700;">
                            <td colspan="5">DOMAIN 1 TOTAL SCORE (C)</td>
                            <td style="text-align: center; color: ${getScoreColor(domain1?.score || 0)}; font-size: 16px;">
                                ${(domain1?.score || 0).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                ${domain1HasNA ? `
                <div style="margin-top: 15px; padding: 12px; background: rgba(249, 115, 22, 0.1); border-left: 3px solid #f97316; border-radius: 4px;">
                    <div style="font-size: 12px; color: #f97316; font-weight: 600; margin-bottom: 5px;">⚠ Note on Adjusted Weightage</div>
                    <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5;">
                        Some technologies are marked as N/A. Weightage has been proportionally redistributed among active technologies.
                        Adjusted weights are shown in parentheses in the Weighted Score column.
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>

    <!-- Page 5: Table 31 - SOC Operations -->
    <div class="page">
        <div class="page-content">
            <div class="page-header">
                <h2 class="page-title">SOC Operations Performance</h2>
                <span class="page-number">Page 5 of 8</span>
            </div>

            <div class="section-box">
                <div class="section-title">CSCRF Annexure N - Table 31 - Operational Metrics</div>
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Domain 2 Score:</div>
                    <div style="font-size: 36px; font-weight: 700; color: ${getScoreColor(domain2?.score || 0)};">
                        ${(domain2?.score || 0).toFixed(2)}
                    </div>
                    ${generateProgressBar(domain2?.score || 0)}
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Metric</th>
                            <th style="text-align: center;">Value</th>
                            <th style="text-align: center;">Weightage</th>
                            <th style="text-align: center;">Weighted Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${operationsRows}
                        <tr style="background: rgba(59, 130, 246, 0.1); font-weight: 700;">
                            <td colspan="4">DOMAIN 2 TOTAL SCORE (Y)</td>
                            <td style="text-align: center; color: ${getScoreColor(domain2?.score || 0)}; font-size: 16px;">
                                ${(domain2?.score || 0).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                ${domain2HasNA ? `
                <div style="margin-top: 15px; padding: 12px; background: rgba(249, 115, 22, 0.1); border-left: 3px solid #f97316; border-radius: 4px;">
                    <div style="font-size: 12px; color: #f97316; font-weight: 600; margin-bottom: 5px;">⚠ Note on Adjusted Weightage</div>
                    <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5;">
                        Some metrics are marked as N/A. Original weightage → Adjusted weightage is shown in the Weightage column for active metrics.
                        Total weightage has been redistributed proportionally.
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>

    <!-- Page 6: Table 32 - Personnel Competency -->
    <div class="page">
        <div class="page-content">
            <div class="page-header">
                <h2 class="page-title">SOC Personnel Competency</h2>
                <span class="page-number">Page 6 of 8</span>
            </div>

            <div class="section-box">
                <div class="section-title">CSCRF Annexure N - Table 32 - Personnel Skills Assessment</div>
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Domain 3 Score:</div>
                    <div style="font-size: 36px; font-weight: 700; color: ${getScoreColor(domain3?.score || 0)};">
                        ${(domain3?.score || 0).toFixed(2)}
                    </div>
                    ${generateProgressBar(domain3?.score || 0)}
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Category</th>
                            <th style="text-align: center;">Weightage</th>
                            <th style="text-align: center;">Category Score</th>
                            <th style="text-align: center;">Weighted Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${personnelRows}
                        <tr style="background: rgba(59, 130, 246, 0.1); font-weight: 700;">
                            <td colspan="4">DOMAIN 3 TOTAL SCORE (P)</td>
                            <td style="text-align: center; color: ${getScoreColor(domain3?.score || 0)}; font-size: 16px;">
                                ${(domain3?.score || 0).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                ${domain3HasNA ? `
                <div style="margin-top: 15px; padding: 12px; background: rgba(249, 115, 22, 0.1); border-left: 3px solid #f97316; border-radius: 4px;">
                    <div style="font-size: 12px; color: #f97316; font-weight: 600; margin-bottom: 5px;">⚠ Note on Adjusted Weightage</div>
                    <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5;">
                        Some personnel categories are marked as N/A. Original weightage → Adjusted weightage is shown in the Weightage column for active categories.
                        Total weightage has been redistributed proportionally.
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>

    <!-- Page 7: Table 33 - Governance -->
    <div class="page">
        <div class="page-content">
            <div class="page-header">
                <h2 class="page-title">SOC Governance</h2>
                <span class="page-number">Page 7 of 8</span>
            </div>

            <div class="section-box">
                <div class="section-title">CSCRF Annexure N - Table 33 - Governance Metrics</div>
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Domain 4 Score:</div>
                    <div style="font-size: 36px; font-weight: 700; color: ${getScoreColor(domain4?.score || 0)};">
                        ${(domain4?.score || 0).toFixed(2)}
                    </div>
                    ${generateProgressBar(domain4?.score || 0)}
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Metric</th>
                            <th style="text-align: center;">Value</th>
                            <th style="text-align: center;">Weightage</th>
                            <th style="text-align: center;">Weighted Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${governanceRows}
                        <tr style="background: rgba(59, 130, 246, 0.1); font-weight: 700;">
                            <td colspan="4">DOMAIN 4 TOTAL SCORE (H)</td>
                            <td style="text-align: center; color: ${getScoreColor(domain4?.score || 0)}; font-size: 16px;">
                                ${(domain4?.score || 0).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                ${domain4HasNA ? `
                <div style="margin-top: 15px; padding: 12px; background: rgba(249, 115, 22, 0.1); border-left: 3px solid #f97316; border-radius: 4px;">
                    <div style="font-size: 12px; color: #f97316; font-weight: 600; margin-bottom: 5px;">⚠ Note on Adjusted Weightage</div>
                    <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5;">
                        Some governance metrics are marked as N/A. Original weightage → Adjusted weightage is shown in the Weightage column for active metrics.
                        Total weightage has been redistributed proportionally.
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>

    <!-- Page 8: Table 34 - Enhancements -->
    <div class="page">
        <div class="page-content">
            <div class="page-header">
                <h2 class="page-title">SOC Enrichments and Enhancements</h2>
                <span class="page-number">Page 8 of 8</span>
            </div>

            <div class="section-box">
                <div class="section-title">CSCRF Annexure N - Table 34 - Proactiveness Assessment</div>
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Domain 5 Score:</div>
                    <div style="font-size: 36px; font-weight: 700; color: ${getScoreColor(domain5?.score || 0)};">
                        ${(domain5?.score || 0).toFixed(2)}
                    </div>
                    ${generateProgressBar(domain5?.score || 0)}
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Metric</th>
                            <th style="text-align: center;">Value</th>
                            <th style="text-align: center;">Weightage</th>
                            <th style="text-align: center;">Weighted Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${enhancementsRows}
                        <tr style="background: rgba(59, 130, 246, 0.1); font-weight: 700;">
                            <td colspan="4">DOMAIN 5 TOTAL SCORE (E)</td>
                            <td style="text-align: center; color: ${getScoreColor(domain5?.score || 0)}; font-size: 16px;">
                                ${(domain5?.score || 0).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                ${domain5HasNA ? `
                <div style="margin-top: 15px; padding: 12px; background: rgba(249, 115, 22, 0.1); border-left: 3px solid #f97316; border-radius: 4px;">
                    <div style="font-size: 12px; color: #f97316; font-weight: 600; margin-bottom: 5px;">⚠ Note on Adjusted Weightage</div>
                    <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5;">
                        Some enhancement metrics are marked as N/A. Original weightage → Adjusted weightage is shown in the Weightage column for active metrics.
                        Total weightage has been redistributed proportionally.
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>

    <div class="running-footer">
        Codec Networks SOC | SOC Efficacy Report | SEBI CSCRF | Confidential
    </div>
</body>
</html>`;
}
=======

return html.replace(/wazuh/gi, 'codecnet');
}
>>>>>>> 9ab3c55f3a98d26b16549d6c64bc5b52950cd2da
