/**
 * SOC Efficacy Scoring Utility
 * Implements scoring formulas from SEBI CSCRF Tables 28-34
 */

/**
 * Helper: Safe division (returns 0 if denominator is 0)
 */
const safeDivide = (numerator, denominator) => {
  if (denominator === 0 || denominator === null || denominator === undefined) {
    return 0;
  }
  return numerator / denominator;
};

/**
 * Helper: Calculate percentage
 */
const calculatePercentage = (numerator, denominator) => {
  return safeDivide(numerator, denominator) * 100;
};

/**
 * Auto-calculate Table 30 "to_be_integrated" counts based on Table 29 assets
 * @param {Object} assets - table29_assets object
 * @returns {Object} - Integration counts for each technology
 */
export function calculateIntegrationCounts(assets) {
  const {
    network_devices = 0,
    security_solutions = 0,
    endpoints = 0,
    applications = 0,
    databases = 0,
    servers = 0
  } = assets;

  return {
    pam: network_devices + security_solutions + applications + databases + servers,           // S1, S2, S4, S5, S6
    antivirus_epp: endpoints + servers,                                                        // S3, S6
    edr: endpoints + servers,                                                                  // S3, S6
    dlp: 0,                                                                                    // No specific systems
    dam: databases,                                                                            // S5
    waf: applications,                                                                         // S4
    email_gateway: 0,                                                                          // No specific systems
    web_gateway_proxy: 0,                                                                      // No specific systems
    ddos: 0,                                                                                   // No specific systems
    siem: network_devices + security_solutions + endpoints + applications + databases + servers           // S1, S2, S3, S4, S5, S6
  };
}

/**
 * Calculate Table 30 - Domain 1: Coverage of Assets (Score C)
 * @param {Object} integration - table30_integration object
 * @returns {Object} - Score breakdown and total
 */
export function calculateDomain1Score(integration) {
  const technologies = [
    { name: 'PAM', key: 'pam', weight: 10 },
    { name: 'Anti-virus/EPP', key: 'antivirus_epp', weight: 10 },
    { name: 'EDR', key: 'edr', weight: 10 },
    { name: 'DLP', key: 'dlp', weight: 10 },
    { name: 'DAM', key: 'dam', weight: 10 },
    { name: 'WAF', key: 'waf', weight: 10 },
    { name: 'Email Gateway', key: 'email_gateway', weight: 10 },
    { name: 'Web Gateway/Proxy', key: 'web_gateway_proxy', weight: 10 },
    { name: 'DDoS', key: 'ddos', weight: 10 },
    { name: 'SIEM', key: 'siem', weight: 10 }
  ];

  // Filter out N/A technologies and calculate total remaining weight
  const activeTechs = technologies.filter(tech => {
    const techData = integration[tech.key] || {};
    return !techData.na;
  });

  // Validate: at least 1 technology must be active
  if (activeTechs.length === 0) {
    throw new Error('At least one technology in Table 30 must be active (not N/A)');
  }

  const totalRemainingWeight = activeTechs.reduce((sum, tech) => sum + tech.weight, 0);

  const breakdown = technologies.map(tech => {
    const techData = integration[tech.key] || {};
    const toBeIntegrated = techData.to_be_integrated || 0;
    const actuallyIntegrated = techData.actually_integrated || 0;
    const isNA = techData.na || false;

    if (isNA) {
      return {
        technology: tech.name,
        to_be_integrated: 'N/A',
        actually_integrated: 'N/A',
        coverage_score: 0,
        weighted_score: 0,
        is_na: true,
        adjusted_weight: 0
      };
    }

    // Calculate adjusted weight (proportional redistribution)
    const adjustedWeight = (tech.weight / totalRemainingWeight) * 100;

    const coverageScore = calculatePercentage(actuallyIntegrated, toBeIntegrated);
    const weightedScore = (coverageScore / 100) * adjustedWeight;

    return {
      technology: tech.name,
      to_be_integrated: toBeIntegrated,
      actually_integrated: actuallyIntegrated,
      coverage_score: Math.round(coverageScore * 100) / 100,
      weighted_score: Math.round(weightedScore * 100) / 100,
      is_na: false,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100
    };
  });

  const totalScore = breakdown.reduce((sum, item) => sum + item.weighted_score, 0);

  return {
    breakdown,
    total_score: Math.round(totalScore * 100) / 100,
    has_na_items: activeTechs.length < technologies.length
  };
}

/**
 * Calculate Table 31 - Domain 2: SOC Operations (Score Y)
 * @param {Object} operations - table31_operations object
 * @returns {Object} - Score breakdown and total
 */
export function calculateDomain2Score(operations) {
  // Define all metrics with their NA flags and original weights
  const metricDefinitions = [
    { key: 'metric1_log_ingestion_na', weight: 5 },
    { key: 'metric2_log_latency_na', weight: 5 },
    { key: 'metric3_version_control_na', weight: 5 },
    { key: 'metric4_vulnerability_closure_na', weight: 5 },
    { key: 'metric5_siem_use_cases_na', weight: 5 },
    { key: 'metric6_use_cases_triggered_na', weight: 5 },
    { key: 'metric7_playbooks_na', weight: 10 },
    { key: 'metric8_false_positives_na', weight: 10 },
    { key: 'metric9_false_negatives_na', weight: 10 },
    { key: 'metric10_threat_intel_na', weight: 5 },
    { key: 'metric11_log_verification_na', weight: 2 },
    { key: 'metric12_integration_check_na', weight: 2 },
    { key: 'metric13_siem_rules_na', weight: 2 },
    { key: 'metric14_privilege_check_na', weight: 2 },
    { key: 'metric15_backups_na', weight: 2 }
  ];

  // Filter out N/A metrics
  const activeMetrics = metricDefinitions.filter(m => !operations[m.key]);

  // Validate: at least 1 metric must be active
  if (activeMetrics.length === 0) {
    throw new Error('At least one metric in Table 31 must be active (not N/A)');
  }

  const totalRemainingWeight = activeMetrics.reduce((sum, m) => sum + m.weight, 0);
  const allMetrics = [];

  // Metric 1: Log Ingestion (5%)
  if (!operations.metric1_log_ingestion_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const logIngestionScore = (safeDivide(operations.log_sources_in_siem, operations.total_log_sources)) * adjustedWeight;
    allMetrics.push({
      metric: 'Log Ingestion into SIEM',
      value: `${operations.log_sources_in_siem || 0}/${operations.total_log_sources || 0}`,
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(logIngestionScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Log Ingestion into SIEM',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 2: Log Latency (5%)
  if (!operations.metric2_log_latency_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const latency = operations.max_log_latency_minutes || 0;
    let latencyScore = 0;
    if (latency < 5) {
      latencyScore = ((5 - latency) / 5) * adjustedWeight;
    }
    allMetrics.push({
      metric: 'Log Processing Latency',
      value: `${latency} minutes`,
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(latencyScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Log Processing Latency',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 3: Version Control (5%)
  if (!operations.metric3_version_control_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const versionScore = (safeDivide(operations.technologies_on_latest_versions, operations.total_technologies_deployed)) * adjustedWeight;
    allMetrics.push({
      metric: 'Technology Version Control',
      value: `${operations.technologies_on_latest_versions || 0}/${operations.total_technologies_deployed || 0}`,
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(versionScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Technology Version Control',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 4: Vulnerability Closure (5%)
  if (!operations.metric4_vulnerability_closure_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const vulnScore = (safeDivide(operations.open_advisories, operations.total_advisories)) * adjustedWeight;
    allMetrics.push({
      metric: 'Vulnerability Closure',
      value: `${operations.open_advisories || 0}/${operations.total_advisories || 0}`,
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(vulnScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Vulnerability Closure',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 5: SIEM Use Cases (5%)
  if (!operations.metric5_siem_use_cases_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const useCaseScore = (safeDivide(operations.technologies_with_use_cases, operations.total_soc_technologies)) * adjustedWeight;
    allMetrics.push({
      metric: 'SIEM Use Cases Coverage',
      value: `${operations.technologies_with_use_cases || 0}/${operations.total_soc_technologies || 0}`,
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(useCaseScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'SIEM Use Cases Coverage',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 6: Non-triggered Use Cases (5%)
  if (!operations.metric6_use_cases_triggered_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const notTriggered = operations.use_cases_not_triggered || 0;
    const totalUseCases = operations.total_use_cases || 0;
    const triggeredScore = (safeDivide(totalUseCases - notTriggered, totalUseCases)) * adjustedWeight;
    allMetrics.push({
      metric: 'Use Cases Triggered',
      value: `${totalUseCases - notTriggered}/${totalUseCases}`,
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(triggeredScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Use Cases Triggered',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 7: Playbooks (10%)
  if (!operations.metric7_playbooks_na) {
    const adjustedWeight = (10 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const playbookScore = (safeDivide(operations.playbooks_defined, operations.total_use_cases_for_playbooks)) * adjustedWeight;
    allMetrics.push({
      metric: 'Playbooks Defined',
      value: `${operations.playbooks_defined || 0}/${operations.total_use_cases_for_playbooks || 0}`,
      weight: 10,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(playbookScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Playbooks Defined',
      value: 'N/A',
      weight: 10,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 8: False Positives (10%)
  if (!operations.metric8_false_positives_na) {
    const adjustedWeight = (10 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const fp = operations.false_positives || 0;
    const totalAlertsFP = operations.total_alerts_for_fp || 0;
    const fpScore = (safeDivide(totalAlertsFP - fp, totalAlertsFP)) * adjustedWeight;
    allMetrics.push({
      metric: 'False Positive Rate',
      value: `${fp}/${totalAlertsFP}`,
      weight: 10,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(fpScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'False Positive Rate',
      value: 'N/A',
      weight: 10,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 9: False Negatives (10%)
  if (!operations.metric9_false_negatives_na) {
    const adjustedWeight = (10 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const fn = operations.false_negatives || 0;
    const totalAlertsFN = operations.total_alerts_for_fn || 0;
    const fnScore = (safeDivide(totalAlertsFN - fn, totalAlertsFN)) * adjustedWeight;
    allMetrics.push({
      metric: 'False Negative Rate',
      value: `${fn}/${totalAlertsFN}`,
      weight: 10,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(fnScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'False Negative Rate',
      value: 'N/A',
      weight: 10,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 10: Threat Intel Processing (5%)
  if (!operations.metric10_threat_intel_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
    const threatIntelTime = operations.threat_intel_processing_time_minutes || 0;
    let threatIntelScore = 0;
    if (threatIntelTime < 60) {
      threatIntelScore = ((60 - threatIntelTime) / 60) * adjustedWeight;
    }
    allMetrics.push({
      metric: 'Threat Intel Processing Time',
      value: `${threatIntelTime} minutes`,
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(threatIntelScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Threat Intel Processing Time',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metrics 11-15: Critical Systems (2% each)
  const criticalMetrics = [
    { name: 'Daily Log Verification', value: operations.critical_log_verification_daily || 0, naKey: 'metric11_log_verification_na' },
    { name: 'Daily Integration Check', value: operations.critical_integration_check_daily || 0, naKey: 'metric12_integration_check_na' },
    { name: 'SIEM Rules Configured', value: operations.critical_siem_rules_configured || 0, naKey: 'metric13_siem_rules_na' },
    { name: 'Weekly Privilege Check', value: operations.critical_privilege_check_weekly || 0, naKey: 'metric14_privilege_check_na' },
    { name: 'Periodic Backups', value: operations.critical_backups_periodic || 0, naKey: 'metric15_backups_na' }
  ];

  criticalMetrics.forEach(cm => {
    if (!operations[cm.naKey]) {
      const adjustedWeight = (2 / totalRemainingWeight) * 75;  // Table 31 total is 75%, not 100%
      const score = cm.value * adjustedWeight;
      allMetrics.push({
        metric: cm.name,
        value: cm.value === 1 ? 'Yes' : 'No',
        weight: 2,
        adjusted_weight: Math.round(adjustedWeight * 100) / 100,
        weighted_score: Math.round(score * 100) / 100,
        is_na: false
      });
    } else {
      allMetrics.push({
        metric: cm.name,
        value: 'N/A',
        weight: 2,
        adjusted_weight: 0,
        weighted_score: 0,
        is_na: true
      });
    }
  });

  const totalScore = allMetrics.reduce((sum, item) => sum + item.weighted_score, 0);

  return {
    breakdown: allMetrics,
    total_score: Math.round(totalScore * 100) / 100,
    has_na_items: activeMetrics.length < metricDefinitions.length
  };
}

/**
 * Calculate Table 32 - Domain 3: Personnel Competency (Score P)
 * @param {Object} personnel - table32_personnel object
 * @returns {Object} - Score breakdown and total
 */
export function calculateDomain3Score(personnel) {
  const categoryDefinitions = [
    { key: 'category_l1_na', weight: 35 },
    { key: 'category_l2_na', weight: 25 },
    { key: 'category_l3_na', weight: 40 }
  ];

  // Filter out N/A categories
  const activeCategories = categoryDefinitions.filter(c => !personnel[c.key]);

  // Validate: at least 1 category must be active
  if (activeCategories.length === 0) {
    throw new Error('At least one category in Table 32 must be active (not N/A)');
  }

  const totalRemainingWeight = activeCategories.reduce((sum, c) => sum + c.weight, 0);
  const categories = [];

  // L1 Engineers (35% weight, CEH certified)
  if (!personnel.category_l1_na) {
    const adjustedWeight = (35 / totalRemainingWeight) * 100;
    const l1_counts = [
      { years: 2, weight: 0.25, count: personnel.l1_2years || 0 },
      { years: 3, weight: 0.50, count: personnel.l1_3years || 0 },
      { years: 4, weight: 0.75, count: personnel.l1_4years || 0 },
      { years: 5, weight: 1.00, count: personnel.l1_5years || 0 }
    ];
    const l1_sum_z = l1_counts.reduce((sum, tier) => sum + (tier.count * tier.weight), 0);
    const l1_sum_x = l1_counts.reduce((sum, tier) => sum + tier.count, 0);
    const l1_category_score = safeDivide(l1_sum_z, l1_sum_x);
    const l1_weighted_score = l1_category_score * adjustedWeight;

    categories.push({
      category: 'L1 Engineers (CEH)',
      weight: 35,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      tiers: l1_counts.map(t => ({ years: t.years, weight: t.weight, count: t.count })),
      category_score: Math.round(l1_category_score * 10000) / 10000,
      weighted_score: Math.round(l1_weighted_score * 100) / 100,
      is_na: false
    });
  } else {
    categories.push({
      category: 'L1 Engineers (CEH)',
      weight: 35,
      adjusted_weight: 0,
      tiers: [],
      category_score: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // L2 Engineers (25% weight, CEH + OEM certified)
  if (!personnel.category_l2_na) {
    const adjustedWeight = (25 / totalRemainingWeight) * 100;
    const l2_counts = [
      { years: 6, weight: 0.33, count: personnel.l2_6years || 0 },
      { years: 7, weight: 0.66, count: personnel.l2_7years || 0 },
      { years: 8, weight: 1.00, count: personnel.l2_8years || 0 }
    ];
    const l2_sum_z = l2_counts.reduce((sum, tier) => sum + (tier.count * tier.weight), 0);
    const l2_sum_x = l2_counts.reduce((sum, tier) => sum + tier.count, 0);
    const l2_category_score = safeDivide(l2_sum_z, l2_sum_x);
    const l2_weighted_score = l2_category_score * adjustedWeight;

    categories.push({
      category: 'L2 Engineers (CEH + OEM)',
      weight: 25,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      tiers: l2_counts.map(t => ({ years: t.years, weight: t.weight, count: t.count })),
      category_score: Math.round(l2_category_score * 10000) / 10000,
      weighted_score: Math.round(l2_weighted_score * 100) / 100,
      is_na: false
    });
  } else {
    categories.push({
      category: 'L2 Engineers (CEH + OEM)',
      weight: 25,
      adjusted_weight: 0,
      tiers: [],
      category_score: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // L3 Engineers (40% weight, CEH + CISM certified)
  if (!personnel.category_l3_na) {
    const adjustedWeight = (40 / totalRemainingWeight) * 100;
    const l3_counts = [
      { years: 9, weight: 0.25, count: personnel.l3_9years || 0 },
      { years: 10, weight: 0.50, count: personnel.l3_10years || 0 },
      { years: 11, weight: 0.75, count: personnel.l3_11years || 0 },
      { years: '12+', weight: 1.00, count: personnel.l3_12plus_years || 0 }
    ];
    const l3_sum_z = l3_counts.reduce((sum, tier) => sum + (tier.count * tier.weight), 0);
    const l3_sum_x = l3_counts.reduce((sum, tier) => sum + tier.count, 0);
    const l3_category_score = safeDivide(l3_sum_z, l3_sum_x);
    const l3_weighted_score = l3_category_score * adjustedWeight;

    categories.push({
      category: 'L3 Engineers (CEH + CISM)',
      weight: 40,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      tiers: l3_counts.map(t => ({ years: t.years, weight: t.weight, count: t.count })),
      category_score: Math.round(l3_category_score * 10000) / 10000,
      weighted_score: Math.round(l3_weighted_score * 100) / 100,
      is_na: false
    });
  } else {
    categories.push({
      category: 'L3 Engineers (CEH + CISM)',
      weight: 40,
      adjusted_weight: 0,
      tiers: [],
      category_score: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  const totalScore = categories.reduce((sum, cat) => sum + cat.weighted_score, 0);

  return {
    breakdown: categories,
    total_score: Math.round(totalScore * 100) / 100,
    has_na_items: activeCategories.length < categoryDefinitions.length
  };
}

/**
 * Calculate Table 33 - Domain 4: SOC Governance (Score H)
 * @param {Object} governance - table33_governance object
 * @returns {Object} - Score breakdown and total
 */
export function calculateDomain4Score(governance) {
  const metricDefinitions = [
    { key: 'metric1_budget_na', weight: 45 },
    { key: 'metric2_training_na', weight: 10 },
    { key: 'metric3_it_committee_na', weight: 5 },
    { key: 'metric4_tech_committee_na', weight: 5 }
  ];

  // Filter out N/A metrics
  const activeMetrics = metricDefinitions.filter(m => !governance[m.key]);

  // Validate: at least 1 metric must be active
  if (activeMetrics.length === 0) {
    throw new Error('At least one metric in Table 33 must be active (not N/A)');
  }

  const totalRemainingWeight = activeMetrics.reduce((sum, m) => sum + m.weight, 0);
  const allMetrics = [];

  // Metric 1: SOC Budget (45% max)
  if (!governance.metric1_budget_na) {
    const adjustedWeight = (45 / totalRemainingWeight) * 65;  // Table 33 total is 65%, not 100%
    const totalBudget = governance.total_cybersecurity_budget || 0;
    const socBudget = governance.soc_budget || 0;
    let budgetScore = (safeDivide((2 * socBudget), totalBudget)) * adjustedWeight;
    budgetScore = Math.min(budgetScore, adjustedWeight); // Cap at adjusted weight

    allMetrics.push({
      metric: 'SOC Budget Allocation',
      value: `${socBudget}/${totalBudget}`,
      weight: 45,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(budgetScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'SOC Budget Allocation',
      value: 'N/A',
      weight: 45,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 2: Training Budget (10%)
  if (!governance.metric2_training_na) {
    const adjustedWeight = (10 / totalRemainingWeight) * 65;  // Table 33 total is 65%, not 100%
    const trainingPct = governance.training_budget_percentage || 0;
    const trainingScore = (trainingPct / 100) * adjustedWeight;

    allMetrics.push({
      metric: 'Training Budget',
      value: `${trainingPct}%`,
      weight: 10,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(trainingScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Training Budget',
      value: 'N/A',
      weight: 10,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 3: IT Committee Review (5%)
  if (!governance.metric3_it_committee_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 65;  // Table 33 total is 65%, not 100%
    const itCommitteeScore = (governance.it_committee_review_done || 0) * adjustedWeight;

    allMetrics.push({
      metric: 'IT Committee Review',
      value: governance.it_committee_review_done === 1 ? 'Yes' : 'No',
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(itCommitteeScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'IT Committee Review',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  // Metric 4: Tech Committee Recommendations (5%)
  if (!governance.metric4_tech_committee_na) {
    const adjustedWeight = (5 / totalRemainingWeight) * 65;  // Table 33 total is 65%, not 100%
    const techCommitteeScore = (governance.tech_committee_recommendations_submitted || 0) * adjustedWeight;

    allMetrics.push({
      metric: 'Tech Committee Recommendations',
      value: governance.tech_committee_recommendations_submitted === 1 ? 'Yes' : 'No',
      weight: 5,
      adjusted_weight: Math.round(adjustedWeight * 100) / 100,
      weighted_score: Math.round(techCommitteeScore * 100) / 100,
      is_na: false
    });
  } else {
    allMetrics.push({
      metric: 'Tech Committee Recommendations',
      value: 'N/A',
      weight: 5,
      adjusted_weight: 0,
      weighted_score: 0,
      is_na: true
    });
  }

  const totalScore = allMetrics.reduce((sum, item) => sum + item.weighted_score, 0);

  return {
    breakdown: allMetrics,
    total_score: Math.round(totalScore * 100) / 100,
    has_na_items: activeMetrics.length < metricDefinitions.length
  };
}

/**
 * Calculate Table 34 - Domain 5: SOC Enhancements (Score E)
 * @param {Object} enhancements - table34_enhancements object
 * @returns {Object} - Score breakdown and total
 */
export function calculateDomain5Score(enhancements) {
  // Define all 19 metrics with their NA flags and weights
  const metricDefinitions = [
    { name: 'Native Dashboard', key: 'native_dashboard', naKey: 'native_dashboard_na', weight: 5 },
    { name: 'Custom Dashboard', key: 'custom_dashboard', naKey: 'custom_dashboard_na', weight: 5 },
    { name: 'Threat Hunting - Service Provider', key: 'threat_hunting_service_provider', naKey: 'threat_hunting_service_provider_na', weight: 5 },
    { name: 'Threat Hunting - Internal Team', key: 'threat_hunting_internal_team', naKey: 'threat_hunting_internal_team_na', weight: 3 },
    { name: 'Threat Hunting - Quarterly', key: 'threat_hunting_quarterly', naKey: 'threat_hunting_quarterly_na', weight: 5 },
    { name: 'Threat Hunting - Half-Yearly', key: 'threat_hunting_half_yearly', naKey: 'threat_hunting_half_yearly_na', weight: 3 },
    { name: 'Hypotheses - Vulnerabilities', key: 'hypotheses_vulnerabilities', naKey: 'hypotheses_vulnerabilities_na', weight: 5, isRatio: true },
    { name: 'Hypotheses - IoCs', key: 'hypotheses_iocs', naKey: 'hypotheses_iocs_na', weight: 5, isRatio: true },
    { name: 'Hypotheses - IoAs', key: 'hypotheses_ioas', naKey: 'hypotheses_ioas_na', weight: 5, isRatio: true },
    { name: 'Threat Intel - SIEM Integration', key: 'threat_intel_integrated_siem', naKey: 'threat_intel_integrated_siem_na', weight: 5 },
    { name: 'SOAR Actions', key: 'soar_actions', naKey: 'soar_actions_na', weight: 5, isSOAR: true },
    { name: 'Technology - Decoy', key: 'tech_decoy', naKey: 'tech_decoy_na', weight: 3 },
    { name: 'Technology - Sandboxing', key: 'tech_sandboxing', naKey: 'tech_sandboxing_na', weight: 3 },
    { name: 'Technology - UEBA', key: 'tech_ueba', naKey: 'tech_ueba_na', weight: 3 },
    { name: 'Technology - Vulnerability Management', key: 'tech_vulnerability_mgmt', naKey: 'tech_vulnerability_mgmt_na', weight: 3 },
    { name: 'Technology - Encrypted Traffic Management', key: 'tech_encrypted_traffic_mgmt', naKey: 'tech_encrypted_traffic_mgmt_na', weight: 3 },
    { name: 'Technology - DNS Security', key: 'tech_dns_security', naKey: 'tech_dns_security_na', weight: 3 },
    { name: 'Technology - IPS', key: 'tech_ips', naKey: 'tech_ips_na', weight: 3 },
    { name: 'Technology - Data Classification', key: 'tech_data_classification', naKey: 'tech_data_classification_na', weight: 3 }
  ];

  // Filter out N/A metrics
  const activeMetrics = metricDefinitions.filter(m => !enhancements[m.naKey]);

  // Validate: at least 1 metric must be active
  if (activeMetrics.length === 0) {
    throw new Error('At least one metric in Table 34 must be active (not N/A)');
  }

  const totalRemainingWeight = activeMetrics.reduce((sum, m) => sum + m.weight, 0);
  const allMetrics = [];

  metricDefinitions.forEach(metric => {
    if (enhancements[metric.naKey]) {
      // Metric is N/A
      allMetrics.push({
        metric: metric.name,
        value: 'N/A',
        weight: metric.weight,
        adjusted_weight: 0,
        weighted_score: 0,
        is_na: true
      });
    } else {
      // Metric is active
      const adjustedWeight = (metric.weight / totalRemainingWeight) * 75;  // Table 34 total is 75%, not 100%
      let value, rawScore;

      if (metric.isRatio) {
        // Hypotheses metrics
        const totalHypotheses = enhancements.total_hypotheses || 0;
        const hypothesisValue = enhancements[metric.key] || 0;
        rawScore = (safeDivide(hypothesisValue, totalHypotheses)) * adjustedWeight;
        value = `${hypothesisValue}/${totalHypotheses}`;
      } else if (metric.isSOAR) {
        // SOAR Actions
        const soarTriggered = enhancements.soar_actions_triggered || 0;
        const soarCreated = enhancements.soar_actions_created || 0;
        rawScore = (safeDivide(soarTriggered, soarCreated)) * adjustedWeight;
        value = `${soarTriggered}/${soarCreated}`;
      } else {
        // Boolean metrics
        const boolValue = enhancements[metric.key] || 0;
        rawScore = boolValue * adjustedWeight;
        value = boolValue === 1 ? 'Yes' : 'No';
      }

      allMetrics.push({
        metric: metric.name,
        value,
        weight: metric.weight,
        adjusted_weight: Math.round(adjustedWeight * 100) / 100,
        weighted_score: Math.round(rawScore * 100) / 100,
        is_na: false
      });
    }
  });

  const totalScore = allMetrics.reduce((sum, item) => sum + item.weighted_score, 0);

  return {
    breakdown: allMetrics,
    total_score: Math.round(totalScore * 100) / 100,
    has_na_items: activeMetrics.length < metricDefinitions.length
  };
}

/**
 * Calculate Table 28 - Final SOC Efficacy Score
 * @param {Object} data - Complete SOC efficacy data
 * @returns {Object} - All domain scores and final score
 */
export function calculateFinalScore(data) {
  // Auto-calculate integration counts from assets
  const integrationCounts = calculateIntegrationCounts(data.table29_assets);

  // Update table30_integration with calculated counts
  const updatedIntegration = { ...data.table30_integration };
  Object.keys(integrationCounts).forEach(tech => {
    if (updatedIntegration[tech]) {
      updatedIntegration[tech].to_be_integrated = integrationCounts[tech];
    }
  });

  // Calculate all domain scores
  const domain1 = calculateDomain1Score(updatedIntegration);
  const domain2 = calculateDomain2Score(data.table31_operations);
  const domain3 = calculateDomain3Score(data.table32_personnel);
  const domain4 = calculateDomain4Score(data.table33_governance);
  const domain5 = calculateDomain5Score(data.table34_enhancements);

  // Calculate normalized scores (Domain Score × Weight / 100)
  const normalizedScores = {
    domain1_normalized: Math.round((domain1.total_score * 25 / 100) * 100) / 100,
    domain2_normalized: Math.round((domain2.total_score * 25 / 75) * 100) / 100,
    domain3_normalized: Math.round((domain3.total_score * 20 / 100) * 100) / 100,
    domain4_normalized: Math.round((domain4.total_score * 15 / 65) * 100) / 100,
    domain5_normalized: Math.round((domain5.total_score * 15 / 75) * 100) / 100
  };

  // Final score
  const finalScore = Object.values(normalizedScores).reduce((sum, val) => sum + val, 0);

  return {
    table28_final_score: {
      domains: [
        {
          name: 'Coverage of Assets w.r.t SOC Technologies',
          weight: 25,
          score: domain1.total_score,
          normalized_score: normalizedScores.domain1_normalized,
          breakdown: domain1.breakdown
        },
        {
          name: 'SOC Operations',
          weight: 25,
          score: domain2.total_score,
          normalized_score: normalizedScores.domain2_normalized,
          breakdown: domain2.breakdown
        },
        {
          name: 'Competency of Deployed SOC Personnel',
          weight: 20,
          score: domain3.total_score,
          normalized_score: normalizedScores.domain3_normalized,
          breakdown: domain3.breakdown
        },
        {
          name: 'SOC Governance',
          weight: 15,
          score: domain4.total_score,
          normalized_score: normalizedScores.domain4_normalized,
          breakdown: domain4.breakdown
        },
        {
          name: 'SOC Enrichments and Enhancements',
          weight: 15,
          score: domain5.total_score,
          normalized_score: normalizedScores.domain5_normalized,
          breakdown: domain5.breakdown
        }
      ],
      final_score: Math.round(finalScore * 100) / 100
    },
    updated_integration: updatedIntegration
  };
}
