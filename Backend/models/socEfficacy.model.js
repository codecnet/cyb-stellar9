import mongoose from 'mongoose';

/**
 * SOC Efficacy Data Model
 * Stores organization-specific SOC efficacy assessment data
 * Based on SEBI Cybersecurity and Cyber Resilience Framework (CSCRF)
 */

const socEfficacySchema = new mongoose.Schema({
  // Organization Reference
  organisation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: [true, 'Organisation ID is required'],
    unique: true, // One record per organization
    index: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid organisation ID'
    }
  },

  // TABLE 29: IT Asset Distribution
  table29_assets: {
    network_devices: { type: Number, default: 0, min: 0 },        // S1
    security_solutions: { type: Number, default: 0, min: 0 },     // S2
    endpoints: { type: Number, default: 0, min: 0 },              // S3
    applications: { type: Number, default: 0, min: 0 },           // S4
    databases: { type: Number, default: 0, min: 0 },              // S5
    servers: { type: Number, default: 0, min: 0 }                 // S6
  },

  // TABLE 30: Asset Integration with SOC Technologies
  table30_integration: {
    pam: {
      to_be_integrated: { type: Number, default: 0, min: 0 },     // Auto-calculated from Table 29
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    antivirus_epp: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    edr: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    dlp: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    dam: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    waf: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    email_gateway: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    web_gateway_proxy: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    ddos: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    },
    siem: {
      to_be_integrated: { type: Number, default: 0, min: 0 },
      actually_integrated: { type: Number, default: 0, min: 0 },
      na: { type: Boolean, default: false }
    }
  },

  // TABLE 31: SOC Operations Performance
  table31_operations: {
    // Metric 1: Log Ingestion
    log_sources_in_siem: { type: Number, default: 0, min: 0 },          // A
    total_log_sources: { type: Number, default: 0, min: 0 },            // B
    metric1_log_ingestion_na: { type: Boolean, default: false },

    // Metric 2: Log Latency
    max_log_latency_minutes: { type: Number, default: 0, min: 0 },      // C
    metric2_log_latency_na: { type: Boolean, default: false },

    // Metric 3: Version Control
    technologies_on_latest_versions: { type: Number, default: 0, min: 0 }, // D
    total_technologies_deployed: { type: Number, default: 0, min: 0 },     // E
    metric3_version_control_na: { type: Boolean, default: false },

    // Metric 4: Vulnerability Closure
    open_advisories: { type: Number, default: 0, min: 0 },              // F
    total_advisories: { type: Number, default: 0, min: 0 },             // G
    metric4_vulnerability_closure_na: { type: Boolean, default: false },

    // Metric 5: SIEM Use Cases
    technologies_with_use_cases: { type: Number, default: 0, min: 0 },  // H
    total_soc_technologies: { type: Number, default: 0, min: 0 },       // I
    metric5_siem_use_cases_na: { type: Boolean, default: false },

    // Metric 6: Non-triggered Use Cases
    use_cases_not_triggered: { type: Number, default: 0, min: 0 },      // J
    total_use_cases: { type: Number, default: 0, min: 0 },              // K
    metric6_use_cases_triggered_na: { type: Boolean, default: false },

    // Metric 7: Playbooks
    playbooks_defined: { type: Number, default: 0, min: 0 },            // L
    total_use_cases_for_playbooks: { type: Number, default: 0, min: 0 }, // M
    metric7_playbooks_na: { type: Boolean, default: false },

    // Metric 8: False Positives
    false_positives: { type: Number, default: 0, min: 0 },              // N
    total_alerts_for_fp: { type: Number, default: 0, min: 0 },          // O
    metric8_false_positives_na: { type: Boolean, default: false },

    // Metric 9: False Negatives
    false_negatives: { type: Number, default: 0, min: 0 },              // P
    total_alerts_for_fn: { type: Number, default: 0, min: 0 },          // Q
    metric9_false_negatives_na: { type: Boolean, default: false },

    // Metric 10: Threat Intel
    threat_intel_processing_time_minutes: { type: Number, default: 0, min: 0 }, // R
    metric10_threat_intel_na: { type: Boolean, default: false },

    // Metric 11-15: Critical Systems (Boolean: 1=Yes, 0=No)
    critical_log_verification_daily: { type: Number, default: 0, min: 0, max: 1 },    // S
    metric11_log_verification_na: { type: Boolean, default: false },
    critical_integration_check_daily: { type: Number, default: 0, min: 0, max: 1 },   // T
    metric12_integration_check_na: { type: Boolean, default: false },
    critical_siem_rules_configured: { type: Number, default: 0, min: 0, max: 1 },     // U
    metric13_siem_rules_na: { type: Boolean, default: false },
    critical_privilege_check_weekly: { type: Number, default: 0, min: 0, max: 1 },    // V
    metric14_privilege_check_na: { type: Boolean, default: false },
    critical_backups_periodic: { type: Number, default: 0, min: 0, max: 1 },          // X
    metric15_backups_na: { type: Boolean, default: false }
  },

  // TABLE 32: Personnel Competency
  table32_personnel: {
    // L1 Engineers (CEH certified)
    l1_2years: { type: Number, default: 0, min: 0 },
    l1_3years: { type: Number, default: 0, min: 0 },
    l1_4years: { type: Number, default: 0, min: 0 },
    l1_5years: { type: Number, default: 0, min: 0 },
    category_l1_na: { type: Boolean, default: false },

    // L2 Engineers (CEH + OEM certified)
    l2_6years: { type: Number, default: 0, min: 0 },
    l2_7years: { type: Number, default: 0, min: 0 },
    l2_8years: { type: Number, default: 0, min: 0 },
    category_l2_na: { type: Boolean, default: false },

    // L3 Engineers (CEH + CISM certified)
    l3_9years: { type: Number, default: 0, min: 0 },
    l3_10years: { type: Number, default: 0, min: 0 },
    l3_11years: { type: Number, default: 0, min: 0 },
    l3_12plus_years: { type: Number, default: 0, min: 0 },
    category_l3_na: { type: Boolean, default: false }
  },

  // TABLE 33: SOC Governance
  table33_governance: {
    // Metric 1: Budget
    total_cybersecurity_budget: { type: Number, default: 0, min: 0 },   // A
    soc_budget: { type: Number, default: 0, min: 0 },                   // B
    metric1_budget_na: { type: Boolean, default: false },

    // Metric 2: Training
    training_budget_percentage: { type: Number, default: 0, min: 0, max: 100 }, // E
    metric2_training_na: { type: Boolean, default: false },

    // Metric 3 & 4: Committee Reviews (Boolean: 1=Yes, 0=No)
    it_committee_review_done: { type: Number, default: 0, min: 0, max: 1 },     // F
    metric3_it_committee_na: { type: Boolean, default: false },
    tech_committee_recommendations_submitted: { type: Number, default: 0, min: 0, max: 1 }, // G
    metric4_tech_committee_na: { type: Boolean, default: false }
  },

  // TABLE 34: SOC Enhancements and Proactiveness
  table34_enhancements: {
    // 1. Dashboards (Boolean: 1=Yes, 0=No)
    native_dashboard: { type: Number, default: 0, min: 0, max: 1 },
    native_dashboard_na: { type: Boolean, default: false },
    custom_dashboard: { type: Number, default: 0, min: 0, max: 1 },
    custom_dashboard_na: { type: Boolean, default: false },

    // 2. Threat Hunting
    threat_hunting_service_provider: { type: Number, default: 0, min: 0, max: 1 },
    threat_hunting_service_provider_na: { type: Boolean, default: false },
    threat_hunting_internal_team: { type: Number, default: 0, min: 0, max: 1 },
    threat_hunting_internal_team_na: { type: Boolean, default: false },
    threat_hunting_quarterly: { type: Number, default: 0, min: 0, max: 1 },
    threat_hunting_quarterly_na: { type: Boolean, default: false },
    threat_hunting_half_yearly: { type: Number, default: 0, min: 0, max: 1 },
    threat_hunting_half_yearly_na: { type: Boolean, default: false },

    // Hypotheses
    total_hypotheses: { type: Number, default: 0, min: 0 },                    // T
    hypotheses_vulnerabilities: { type: Number, default: 0, min: 0 },          // X
    hypotheses_vulnerabilities_na: { type: Boolean, default: false },
    hypotheses_iocs: { type: Number, default: 0, min: 0 },                     // Y
    hypotheses_iocs_na: { type: Boolean, default: false },
    hypotheses_ioas: { type: Number, default: 0, min: 0 },                     // Z
    hypotheses_ioas_na: { type: Boolean, default: false },

    // 3. Automation
    threat_intel_integrated_siem: { type: Number, default: 0, min: 0, max: 1 },
    threat_intel_integrated_siem_na: { type: Boolean, default: false },
    soar_actions_triggered: { type: Number, default: 0, min: 0 },              // T
    soar_actions_created: { type: Number, default: 0, min: 0 },                // S
    soar_actions_na: { type: Boolean, default: false },

    // 4. Advanced Technologies (Boolean: 1=Yes, 0=No)
    tech_decoy: { type: Number, default: 0, min: 0, max: 1 },
    tech_decoy_na: { type: Boolean, default: false },
    tech_sandboxing: { type: Number, default: 0, min: 0, max: 1 },
    tech_sandboxing_na: { type: Boolean, default: false },
    tech_ueba: { type: Number, default: 0, min: 0, max: 1 },
    tech_ueba_na: { type: Boolean, default: false },
    tech_vulnerability_mgmt: { type: Number, default: 0, min: 0, max: 1 },
    tech_vulnerability_mgmt_na: { type: Boolean, default: false },
    tech_encrypted_traffic_mgmt: { type: Number, default: 0, min: 0, max: 1 },
    tech_encrypted_traffic_mgmt_na: { type: Boolean, default: false },
    tech_dns_security: { type: Number, default: 0, min: 0, max: 1 },
    tech_dns_security_na: { type: Boolean, default: false },
    tech_ips: { type: Number, default: 0, min: 0, max: 1 },
    tech_ips_na: { type: Boolean, default: false },
    tech_data_classification: { type: Number, default: 0, min: 0, max: 1 },
    tech_data_classification_na: { type: Boolean, default: false }
  },

  // Audit Fields
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function(v) {
        if (v) return mongoose.Types.ObjectId.isValid(v);
        return true;
      },
      message: 'Invalid user ID'
    }
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function(v) {
        if (v) return mongoose.Types.ObjectId.isValid(v);
        return true;
      },
      message: 'Invalid user ID'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
socEfficacySchema.index({ organisation_id: 1 });
socEfficacySchema.index({ updatedAt: -1 });

// Custom validation: actually_integrated cannot exceed to_be_integrated
socEfficacySchema.pre('save', function(next) {
  const integration = this.table30_integration;

  // Validate each technology
  const technologies = ['pam', 'antivirus_epp', 'edr', 'dlp', 'dam', 'waf', 'email_gateway', 'web_gateway_proxy', 'ddos', 'siem'];

  for (const tech of technologies) {
    if (integration[tech].actually_integrated > integration[tech].to_be_integrated) {
      return next(new Error(`${tech}: Actually integrated (${integration[tech].actually_integrated}) cannot exceed to be integrated (${integration[tech].to_be_integrated})`));
    }
  }

  // Validate SOC budget doesn't exceed total cybersecurity budget
  if (this.table33_governance.soc_budget > this.table33_governance.total_cybersecurity_budget) {
    return next(new Error('SOC budget cannot exceed total cybersecurity budget'));
  }

  // Validate SOAR actions
  if (this.table34_enhancements.soar_actions_triggered > this.table34_enhancements.soar_actions_created) {
    return next(new Error('SOAR actions triggered cannot exceed actions created'));
  }

  next();
});

// Static method to find by organization
socEfficacySchema.statics.findByOrganisation = function(organisationId) {
  return this.findOne({ organisation_id: organisationId });
};

// Instance method to create or update
socEfficacySchema.statics.upsertByOrganisation = async function(organisationId, data, userId) {
  const existing = await this.findOne({ organisation_id: organisationId });

  if (existing) {
    // Update existing
    Object.assign(existing, data);
    existing.updated_by = userId;
    return await existing.save();
  } else {
    // Create new
    const newRecord = new this({
      organisation_id: organisationId,
      ...data,
      created_by: userId,
      updated_by: userId
    });
    return await newRecord.save();
  }
};

const SocEfficacy = mongoose.model('SocEfficacy', socEfficacySchema);
export default SocEfficacy;
