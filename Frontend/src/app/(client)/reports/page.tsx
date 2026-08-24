'use client'

import { useState, useEffect } from 'react'
import { DocumentTextIcon, ArrowDownTrayIcon, CalendarIcon, TrashIcon, ClockIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useClient } from '@/contexts/ClientContext'
import { Table34Enhancements } from './components/Table34Enhancements'
import { Table29Assets } from './components/Table29Assets'
import { Table30Integration } from './components/Table30Integration'
import { Table31Operations } from './components/Table31Operations'
import { Table32Personnel } from './components/Table32Personnel'
import { Table33Governance } from './components/Table33Governance'
import { FieldLabel } from './components/FieldLabel'
import { FIELD_DESCRIPTIONS } from './components/fieldDescriptions'

const BASE_URL = process.env.NEXT_PUBLIC_RBAC_BASE_IP

// Month options for the Security Reports month filter (used to pick the
// reporting period for Monthly Reports and to filter the generated list).
const MONTH_OPTIONS = [
  { value: '2026-01', label: 'January 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-08', label: 'August 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'October 2026' },
  { value: '2026-11', label: 'November 2026' },
  { value: '2026-12', label: 'December 2026' },
]

// Month to preselect when the user switches into Month mode: the current
// month if it is offered, otherwise the latest month available.
const defaultMonthValue = () => {
  const now = new Date()
  const current = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  return MONTH_OPTIONS.some(m => m.value === current)
    ? current
    : MONTH_OPTIONS[MONTH_OPTIONS.length - 1]?.value ?? ''
}

// Given a 'YYYY-MM' value, return the first/last instant of that month in UTC.
// The boundaries must be UTC: they are sent to the API as ISO strings and the
// backend renders the report period in UTC. Building them in the browser's
// local zone shifts the start into the previous month for any zone ahead of
// UTC (e.g. June would print as "May 31 — June 30" from IST).
const getMonthRange = (value: string) => {
  const [year, month] = value.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  return { start, end }
}


interface Report {
  id: string
  report_name: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'on-demand'
  template: string
  file_name: string
  file_size: number
  file_extension: string
  priority: string
  report_period_start: string
  report_period_end: string
  created_at: string
  created_by?: {
    username: string
    full_name: string
  }
  metadata?: {
    alerts_count?: number
    severity_counts?: any
    agents_count?: number
    sca_score?: number
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingData, setIsSavingData] = useState(false)
  const { selectedClient, isClientMode } = useClient()
  // Month mode is persisted across visits, so both the template and the month
  // have to rehydrate with it or the form reopens in an impossible state.
  const [selectedTemplate, setSelectedTemplate] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('reports_timeRangeType') === 'month'
      ? 'monthly'
      : 'executive'
  )
  // Month filter: only meaningful in the 'month' time range mode, where a
  // 'YYYY-MM' value both filters the generated list and sets the reporting
  // period. Cleared whenever the mode is Relative or Absolute.
  const [selectedMonth, setSelectedMonth] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('reports_timeRangeType') === 'month'
      ? defaultMonthValue()
      : ''
  )

  // Time range filters. Exactly one mode is active at a time — Month is a
  // peer of Relative/Absolute, not an extra filter layered on top of them.
  const [timeRangeType, setTimeRangeType] = useState<'relative' | 'absolute' | 'month'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reports_timeRangeType')
      if (saved === 'relative' || saved === 'absolute' || saved === 'month') return saved
    }
    return 'relative'
  })
  const [relativeHours, setRelativeHours] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('reports_relativeHours') || '168') // Default 7 days
    }
    return 168
  })
  const [fromDate, setFromDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reports_fromDate')
      return saved || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    }
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  })
  const [toDate, setToDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reports_toDate')
      return saved || new Date().toISOString().slice(0, 16)
    }
    return new Date().toISOString().slice(0, 16)
  })

  // Month mode and the Monthly Report template are two views of the same
  // choice, so switching either one keeps the other in step. Relative and
  // Absolute clear the month so the generated-reports list is not left
  // filtered by a month the user can no longer see.
  const switchTimeRangeMode = (mode: 'relative' | 'absolute' | 'month') => {
    setTimeRangeType(mode)
    if (mode === 'month') {
      setSelectedTemplate('monthly')
      setSelectedMonth(prev => prev || defaultMonthValue())
    } else {
      setSelectedMonth('')
      setSelectedTemplate(prev => (prev === 'monthly' ? 'executive' : prev))
    }
  }

  const switchTemplate = (template: string) => {
    setSelectedTemplate(template)
    if (template === 'monthly') {
      setTimeRangeType('month')
      setSelectedMonth(prev => prev || defaultMonthValue())
    } else if (timeRangeType === 'month') {
      setTimeRangeType('relative')
      setSelectedMonth('')
    }
  }

  // SOC Efficacy Form State
  const [socEfficacyData, setSocEfficacyData] = useState({
    table29_assets: {
      network_devices: 0,
      security_solutions: 0,
      endpoints: 0,
      applications: 0,
      databases: 0,
      servers: 0
    },
    table30_integration: {
      pam: { to_be_integrated: 0, actually_integrated: 0, na: false },
      antivirus_epp: { to_be_integrated: 0, actually_integrated: 0, na: false },
      edr: { to_be_integrated: 0, actually_integrated: 0, na: false },
      dlp: { to_be_integrated: 0, actually_integrated: 0, na: false },
      dam: { to_be_integrated: 0, actually_integrated: 0, na: false },
      waf: { to_be_integrated: 0, actually_integrated: 0, na: false },
      email_gateway: { to_be_integrated: 0, actually_integrated: 0, na: false },
      web_gateway_proxy: { to_be_integrated: 0, actually_integrated: 0, na: false },
      ddos: { to_be_integrated: 0, actually_integrated: 0, na: false },
      siem: { to_be_integrated: 0, actually_integrated: 0, na: false }
    },
    table31_operations: {
      log_sources_in_siem: 0,
      total_log_sources: 0,
      metric1_log_ingestion_na: false,
      max_log_latency_minutes: 0,
      metric2_log_latency_na: false,
      technologies_on_latest_versions: 0,
      total_technologies_deployed: 0,
      metric3_version_control_na: false,
      open_advisories: 0,
      total_advisories: 0,
      metric4_vulnerability_closure_na: false,
      technologies_with_use_cases: 0,
      total_soc_technologies: 0,
      metric5_siem_use_cases_na: false,
      use_cases_not_triggered: 0,
      total_use_cases: 0,
      metric6_use_cases_triggered_na: false,
      playbooks_defined: 0,
      total_use_cases_for_playbooks: 0,
      metric7_playbooks_na: false,
      false_positives: 0,
      total_alerts_for_fp: 0,
      metric8_false_positives_na: false,
      false_negatives: 0,
      total_alerts_for_fn: 0,
      metric9_false_negatives_na: false,
      threat_intel_processing_time_minutes: 0,
      metric10_threat_intel_na: false,
      critical_log_verification_daily: 0,
      metric11_log_verification_na: false,
      critical_integration_check_daily: 0,
      metric12_integration_check_na: false,
      critical_siem_rules_configured: 0,
      metric13_siem_rules_na: false,
      critical_privilege_check_weekly: 0,
      metric14_privilege_check_na: false,
      critical_backups_periodic: 0,
      metric15_backups_na: false
    },
    table32_personnel: {
      l1_2years: 0,
      l1_3years: 0,
      l1_4years: 0,
      l1_5years: 0,
      category_l1_na: false,
      l2_6years: 0,
      l2_7years: 0,
      l2_8years: 0,
      category_l2_na: false,
      l3_9years: 0,
      l3_10years: 0,
      l3_11years: 0,
      l3_12plus_years: 0,
      category_l3_na: false
    },
    table33_governance: {
      total_cybersecurity_budget: 0,
      soc_budget: 0,
      metric1_budget_na: false,
      training_budget_percentage: 0,
      metric2_training_na: false,
      it_committee_review_done: 0,
      metric3_it_committee_na: false,
      tech_committee_recommendations_submitted: 0,
      metric4_tech_committee_na: false
    },
    table34_enhancements: {
      native_dashboard: 0,
      native_dashboard_na: false,
      custom_dashboard: 0,
      custom_dashboard_na: false,
      threat_hunting_service_provider: 0,
      threat_hunting_service_provider_na: false,
      threat_hunting_internal_team: 0,
      threat_hunting_internal_team_na: false,
      threat_hunting_quarterly: 0,
      threat_hunting_quarterly_na: false,
      threat_hunting_half_yearly: 0,
      threat_hunting_half_yearly_na: false,
      total_hypotheses: 0,
      hypotheses_vulnerabilities: 0,
      hypotheses_vulnerabilities_na: false,
      hypotheses_iocs: 0,
      hypotheses_iocs_na: false,
      hypotheses_ioas: 0,
      hypotheses_ioas_na: false,
      threat_intel_integrated_siem: 0,
      threat_intel_integrated_siem_na: false,
      soar_actions_triggered: 0,
      soar_actions_created: 0,
      soar_actions_na: false,
      tech_decoy: 0,
      tech_decoy_na: false,
      tech_sandboxing: 0,
      tech_sandboxing_na: false,
      tech_ueba: 0,
      tech_ueba_na: false,
      tech_vulnerability_mgmt: 0,
      tech_vulnerability_mgmt_na: false,
      tech_encrypted_traffic_mgmt: 0,
      tech_encrypted_traffic_mgmt_na: false,
      tech_dns_security: 0,
      tech_dns_security_na: false,
      tech_ips: 0,
      tech_ips_na: false,
      tech_data_classification: 0,
      tech_data_classification_na: false
    }
  })

  const [calculatedScores, setCalculatedScores] = useState<any>(null)
  const [isSavingAuto, setIsSavingAuto] = useState(false)
  const [saveDebounceTimer, setSaveDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Save time range settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reports_timeRangeType', timeRangeType)
      localStorage.setItem('reports_relativeHours', relativeHours.toString())
      localStorage.setItem('reports_fromDate', fromDate)
      localStorage.setItem('reports_toDate', toDate)
    }
  }, [timeRangeType, relativeHours, fromDate, toDate])

  // Fetch reports on page load and when selected client changes
  useEffect(() => {
    fetchReports()
  }, [selectedClient])

  // Fetch SOC efficacy data when template changes to SOC Efficacy
  useEffect(() => {
    if (selectedTemplate === 'SOC Efficacy' || selectedTemplate === 'soc_efficacy') {
      fetchSocEfficacyData()
    }
  }, [selectedTemplate, selectedClient])

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        setIsLoading(false)
        return
      }

      // Build URL with orgId if client is selected
      let url = `${BASE_URL}/reports`
      if (isClientMode && selectedClient?.id) {
        url += `?orgId=${selectedClient.id}`
        console.log('Fetching reports for organization:', selectedClient.id)
      }

      console.log('Fetching reports from:', url)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        throw new Error(errorData.message || 'Failed to fetch reports')
      }

      const data = await response.json()
      console.log('Fetched reports data:', data)
      console.log('Data structure:', data.data)
      console.log('Reports array:', data.data?.reports)

      if (data.success && data.data && data.data.reports) {
        setReports(data.data.reports)
        console.log('Reports set:', data.data.reports.length, 'reports')
        console.log('Reports content:', data.data.reports)
      } else {
        console.warn('No reports in response or unexpected format')
        console.log('Response data:', JSON.stringify(data, null, 2))
        setReports([])
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      setReports([])
    } finally {
      setIsLoading(false)
      console.log('Loading complete')
    }
  }

  const fetchSocEfficacyData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      let url = `${BASE_URL}/soc-efficacy`
      if (isClientMode && selectedClient?.id) {
        url += `?orgId=${selectedClient.id}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.exists && data.data?.data) {
          setSocEfficacyData(data.data.data)
          if (data.data.scores) {
            setCalculatedScores(data.data.scores)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching SOC efficacy data:', error)
    }
  }

  const validateSocEfficacyData = () => {
    const errors: string[] = []

    // Validate Table 30 - Integration (at least one technology should not be N/A)
    const table30 = socEfficacyData.table30_integration
    const allTable30NA = Object.keys(table30).every(tech =>
      typeof table30[tech as keyof typeof table30] === 'object' &&
      (table30[tech as keyof typeof table30] as any).na === true
    )
    if (allTable30NA) {
      errors.push('Table 30 (Asset Integration): All technologies are marked as N/A. At least one must be active.')
    }

    // Validate Table 31 - Operations (at least one metric should not be N/A)
    const table31 = socEfficacyData.table31_operations
    const naFields31 = [
      'metric1_alerts_na', 'metric2_closed_na', 'metric3_critical_na', 'metric4_high_na',
      'metric5_medium_na', 'metric6_low_na', 'metric7_mttr_na', 'metric8_mtta_na',
      'metric9_false_positives_na', 'metric10_escalations_na', 'metric11_sla_na',
      'metric12_sla_breaches_na', 'metric13_auto_closed_na', 'metric14_hunting_na',
      'metric15_threat_intel_na'
    ]
    const allTable31NA = naFields31.every(field => table31[field as keyof typeof table31] === true)
    if (allTable31NA) {
      errors.push('Table 31 (SOC Operations): All metrics are marked as N/A. At least one must be active.')
    }

    // Validate Table 32 - Personnel (at least one category should not be N/A)
    const table32 = socEfficacyData.table32_personnel
    const naFields32 = ['category_l1_na', 'category_l2_na', 'category_l3_na']
    const allTable32NA = naFields32.every(field => table32[field as keyof typeof table32] === true)
    if (allTable32NA) {
      errors.push('Table 32 (Personnel Competency): All categories are marked as N/A. At least one must be active.')
    }

    // Validate Table 33 - Governance (at least one metric should not be N/A)
    const table33 = socEfficacyData.table33_governance
    const naFields33 = ['metric1_budget_na', 'metric2_training_na', 'metric3_it_committee_na', 'metric4_tech_committee_na']
    const allTable33NA = naFields33.every(field => table33[field as keyof typeof table33] === true)
    if (allTable33NA) {
      errors.push('Table 33 (SOC Governance): All metrics are marked as N/A. At least one must be active.')
    }

    // Validate Table 34 - Enhancements (at least one field should not be N/A)
    const table34 = socEfficacyData.table34_enhancements
    const naFields34 = [
      'native_dashboard_na', 'custom_dashboard_na', 'hypotheses_1_na', 'hypotheses_2_na',
      'hypotheses_3_na', 'hypotheses_4_na', 'hypotheses_5_na', 'hypotheses_6_na',
      'hypotheses_7_na', 'threat_intel_integration_na', 'soar_na', 'tech_ndr_na',
      'tech_ueba_na', 'tech_sandboxing_na', 'tech_deception_na', 'tech_vulnerability_mgmt_na',
      'tech_encrypted_traffic_mgmt_na', 'tech_dns_security_na', 'tech_ips_na',
      'tech_data_classification_na'
    ]
    const allTable34NA = naFields34.every(field => table34[field as keyof typeof table34] === true)
    if (allTable34NA) {
      errors.push('Table 34 (SOC Enhancements): All fields are marked as N/A. At least one must be active.')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const saveSocEfficacyData = async () => {
    try {
      setIsSavingData(true)

      // Validate data before saving
      const validation = validateSocEfficacyData()
      if (!validation.isValid) {
        const errorMessage = 'Cannot save SOC Efficacy data:\n\n' + validation.errors.join('\n\n')
        alert(errorMessage)
        setIsSavingData(false)
        return
      }

      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      let url = `${BASE_URL}/soc-efficacy`
      if (isClientMode && selectedClient?.id) {
        url += `?orgId=${selectedClient.id}`
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(socEfficacyData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to save SOC efficacy data')
      }

      const data = await response.json()
      if (data.success) {
        alert('SOC efficacy data saved successfully!')
        if (data.data.scores) {
          setCalculatedScores(data.data.scores)
        }
      }
    } catch (error: any) {
      console.error('Error saving SOC efficacy data:', error)
      alert(error.message || 'Failed to save SOC efficacy data')
    } finally {
      setIsSavingData(false)
    }
  }

  // Helper to convert empty strings to 0 for backend
  const sanitizeDataForSave = (data: any): any => {
    const sanitized = JSON.parse(JSON.stringify(data))

    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (obj[key] === '') {
          obj[key] = 0
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key])
        }
      }
    }

    sanitizeObject(sanitized)
    return sanitized
  }

  const autoSaveSocEfficacyData = async (data: any) => {
    try {
      setIsSavingAuto(true)
      const token = localStorage.getItem('token')
      if (!token) return

      // Validate before saving
      const validation = validateSocEfficacyData()
      if (!validation.isValid) {
        console.warn('Validation failed, skipping auto-save:', validation.errors)
        setIsSavingAuto(false)
        return
      }

      let url = `${BASE_URL}/soc-efficacy`
      if (isClientMode && selectedClient?.id) {
        url += `?orgId=${selectedClient.id}`
      }

      // Sanitize data: convert empty strings to 0
      const sanitizedData = sanitizeDataForSave(data)

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sanitizedData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Refetch after save to update scores (debouncing ensures this only happens when user stops typing)
          await fetchSocEfficacyData()
        }
      }
    } catch (error: any) {
      console.error('Auto-save error:', error)
    } finally {
      setIsSavingAuto(false)
    }
  }

  const updateSocEfficacyField = (table: string, field: string, value: any) => {
    setSocEfficacyData(prev => {
      const newData = {
        ...prev,
        [table]: {
          ...prev[table as keyof typeof prev],
          [field]: value
        }
      }

      // Auto-calculate total_log_sources when Table 29 changes
      if (table === 'table29_assets') {
        const table29 = newData.table29_assets
        const totalLogSources =
          table29.network_devices +
          table29.security_solutions +
          table29.endpoints +
          table29.applications +
          table29.databases +
          table29.servers

        newData.table31_operations = {
          ...newData.table31_operations,
          total_log_sources: totalLogSources
        }
      }

      return newData
    })
  }

  const updateIntegrationField = (tech: string, field: 'to_be_integrated' | 'actually_integrated' | 'na', value: number | boolean | '') => {
    setSocEfficacyData(prev => {
      const newData = {
        ...prev,
        table30_integration: {
          ...prev.table30_integration,
          [tech]: {
            ...prev.table30_integration[tech as keyof typeof prev.table30_integration],
            [field]: value
          }
        }
      }

      // Auto-calculate total_soc_technologies when Table 30 changes
      const table30 = newData.table30_integration
      const totalSocTechnologies = Object.keys(table30).filter(techKey => {
        const techData = table30[techKey as keyof typeof table30]
        return typeof techData === 'object' && !(techData as any).na
      }).length

      newData.table31_operations = {
        ...newData.table31_operations,
        total_soc_technologies: totalSocTechnologies
      }

      return newData
    })
  }

  // Trigger save after blur (give React time to update state)
  const triggerSaveOnBlur = () => {
    setTimeout(() => {
      // Use a callback to ensure we get the latest state
      setSocEfficacyData(currentData => {
        autoSaveSocEfficacyData(currentData)
        return currentData
      })
    }, 150)
  }

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    // Get the selected template option text (not value)
    const templateSelect = form.querySelector('select[name="template"]') as HTMLSelectElement
    const selectedTemplateText = templateSelect.options[templateSelect.selectedIndex].text

    // Auto-generate report name based on time range
    const date = new Date()
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    const orgName = selectedClient?.name || selectedClient?.organisation_name || 'Stellar9'

    // Generate time range description for report name
    let timeRangeDesc = 'All Time'
    if (timeRangeType === 'relative' && relativeHours > 0) {
      if (relativeHours === 1) timeRangeDesc = 'Last Hour'
      else if (relativeHours === 6) timeRangeDesc = 'Last 6 Hours'
      else if (relativeHours === 24) timeRangeDesc = 'Last 24 Hours'
      else if (relativeHours === 168) timeRangeDesc = 'Last 7 Days'
      else if (relativeHours === 720) timeRangeDesc = 'Last 30 Days'
      else if (relativeHours === 2160) timeRangeDesc = 'Last 90 Days'
    } else if (timeRangeType === 'absolute') {
      const from = new Date(fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const to = new Date(toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      timeRangeDesc = `${from} - ${to}`
    }

    // Month mode: the reporting period is the selected calendar month.
    const monthOption = MONTH_OPTIONS.find(m => m.value === selectedMonth)
    if (timeRangeType === 'month') {
      if (!monthOption) {
        alert('Please select a month for the Monthly Report.')
        return
      }
      timeRangeDesc = monthOption.label
    }

    const autoGeneratedName = `${orgName} - ${selectedTemplateText} - ${timeRangeDesc} - ${formattedDate}`

    // Build report data with time parameters
    const reportData: any = {
      reportName: autoGeneratedName,
      description: formData.get('description') as string,
      // Weekly Report → weekly, Monthly Report → monthly, otherwise on-demand.
      frequency: selectedTemplate === 'monthly' ? 'monthly' : selectedTemplate === 'executive' ? 'weekly' : 'on-demand',
      template: selectedTemplateText,
    }

    // For SOC Efficacy reports, include the efficacy data
    if (selectedTemplate === 'SOC Efficacy' || selectedTemplate === 'soc_efficacy') {
      // Validate SOC efficacy data before generating report
      const validation = validateSocEfficacyData()
      if (!validation.isValid) {
        const errorMessage = 'Cannot generate SOC Efficacy report:\n\n' + validation.errors.join('\n\n')
        alert(errorMessage)
        return
      }
      // Include current form data to save before generating report
      reportData.soc_efficacy_data = socEfficacyData
    }

    // Add time filter parameters if not "All Time"
    if (timeRangeType === 'month' && monthOption) {
      // Monthly Report covers the full selected calendar month.
      const { start, end } = getMonthRange(selectedMonth)
      reportData.start_date = start.toISOString()
      reportData.end_date = end.toISOString()
    } else if (timeRangeType === 'relative' && relativeHours > 0) {
      const now = new Date();
      const startTime = new Date(now.getTime() - relativeHours * 60 * 60 * 1000);
      reportData.start_date = startTime.toISOString();
      reportData.end_date = now.toISOString();
    } else if (timeRangeType === 'absolute') {
      reportData.start_date = new Date(fromDate).toISOString();
      reportData.end_date = new Date(toDate).toISOString();
    }

    try {
      setIsGenerating(true)

      // Call API to generate report
      const token = localStorage.getItem('token')

      if (!token) {
        throw new Error('No authentication token found. Please login again.')
      }

      // Build URL with orgId if client is selected
      let generateUrl = `${BASE_URL}/reports/generate`
      if (isClientMode && selectedClient?.id) {
        generateUrl += `?orgId=${selectedClient.id}`
      }

      const response = await fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || 'Failed to generate report'
        console.error('Server error:', response.status, errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (data.success) {
        // Refresh the reports list
        await fetchReports()
        form.reset()
        alert('Report generated and saved successfully!')
      } else {
        throw new Error(data.message || 'Failed to generate report')
      }
    } catch (error: any) {
      console.error('Error generating report:', error)
      alert(error.message || 'Failed to generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadReport = async (reportId: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${BASE_URL}/reports/${reportId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download report')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${BASE_URL}/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete report')
      }

      // Refresh the reports list
      await fetchReports()
      alert('Report deleted successfully!')
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('Failed to delete report. Please try again.')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Filter the generated reports list by the selected month. A report matches
  // if it was generated in, or its reporting period falls within, that month.
  const filteredReports = selectedMonth
    ? reports.filter((report) => {
        const { start, end } = getMonthRange(selectedMonth)
        const inRange = (value?: string) => {
          if (!value) return false
          const d = new Date(value)
          return d >= start && d <= end
        }
        return inRange(report.created_at) || inRange(report.report_period_start)
      })
    : reports

  const selectedMonthLabel = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Security Reports
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage reports for your organization
        </p>
      </div>

      {/* Add New Report */}
      <PermissionGate section="reports" action="create" showLock={false}>
        <div className="card-gradient p-8 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mr-3">
              <DocumentTextIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Report
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Set up automated security reports for stakeholders
              </p>
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Report Time Range:</span>
              </div>

              {/* One mode at a time: Relative, Absolute or Month */}
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1">
                {([
                  { mode: 'relative', label: 'Relative' },
                  { mode: 'absolute', label: 'Absolute' },
                  { mode: 'month', label: 'Month' },
                ] as const).map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => switchTimeRangeMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      timeRangeType === mode
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
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

              {/* Month Selector — sets the reporting period and filters the list */}
              {timeRangeType === 'month' && (
                <>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Month:</label>
                    <select
                      name="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Months</option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Covers the full calendar month — no other time range needed.
                  </span>
                </>
              )}
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleCreateReport}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Report Template *
            </label>
            <select
              name="template"
              required
              value={selectedTemplate}
              onChange={(e) => switchTemplate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl
                             focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                             text-gray-900 dark:text-white transition-all duration-200">
              <option value="executive">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="SOC Efficacy">SOC Efficacy</option>
            </select>
          </div>

          {/* SOC Efficacy Input Fields - Conditional Rendering */}
          {(selectedTemplate === 'SOC Efficacy' || selectedTemplate === 'soc_efficacy') && (
            <div className="space-y-6 border-t border-gray-200 dark:border-gray-600 pt-6 mt-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Fill in the SOC efficacy assessment data below. Data will be auto-saved and used for report generation.
                </p>
              </div>

              {/* Calculated Scores Display */}
              {calculatedScores && (
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">Current SOC Efficacy Score</h3>
                  <div className="text-5xl font-bold mb-6">{calculatedScores.final_score.toFixed(2)}</div>

                  {/* Domain Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {calculatedScores.domains.map((domain: any, idx: number) => {
                      // Max scores based on normalization formula: domain1=100, domain2=75, domain3=100, domain4=65, domain5=75
                      const maxScores = [100, 75, 100, 65, 75]
                      const maxScore = domain.max_score || maxScores[idx] || 100

                      // Normalization weights: domain1=25%, domain2=25%, domain3=20%, domain4=15%, domain5=15%
                      const weights = [25, 25, 20, 15, 15]
                      const weight = weights[idx]

                      // Calculate normalized score: (domain_score * weight / max_score)
                      const normalizedScore = Math.round((domain.score * weight / maxScore) * 100) / 100

                      return (
                        <div key={idx} className="bg-white/10 rounded-lg p-4">
                          <div className="text-xs opacity-80 mb-1">{domain.name}</div>
                          <div className="text-3xl font-bold mb-2">{domain.score.toFixed(2)}</div>

                          {/* Normalization Formula */}
                          <div className="text-[10px] opacity-70 bg-white/10 rounded p-2 mt-2">
                            <div className="mb-1">Weight: {weight}%</div>
                            <div className="italic font-mono">
                              ({domain.score.toFixed(2)} × {weight} / {maxScore}) = {normalizedScore.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}


              <Table29Assets
                data={socEfficacyData.table29_assets}
                updateField={updateSocEfficacyField}
                onBlurSave={triggerSaveOnBlur}
              />

              <Table30Integration
                data={socEfficacyData.table30_integration}
                updateIntegrationField={updateIntegrationField}
                scores={calculatedScores?.domains?.find((d: any) => d.name.includes('Coverage of Assets'))}
                onBlurSave={triggerSaveOnBlur}
              />

              <Table31Operations
                data={socEfficacyData.table31_operations}
                updateField={updateSocEfficacyField}
                scores={calculatedScores?.domains?.find((d: any) => d.name.includes('SOC Operations'))}
                onBlurSave={triggerSaveOnBlur}
              />

              <Table32Personnel
                data={socEfficacyData.table32_personnel}
                updateField={updateSocEfficacyField}
                scores={calculatedScores?.domains?.find((d: any) => d.name.includes('Personnel'))}
                onBlurSave={triggerSaveOnBlur}
              />

              <Table33Governance
                data={socEfficacyData.table33_governance}
                updateField={updateSocEfficacyField}
                scores={calculatedScores?.domains?.find((d: any) => d.name.includes('Governance'))}
                onBlurSave={triggerSaveOnBlur}
              />

              <Table34Enhancements
                data={socEfficacyData.table34_enhancements}
                updateField={updateSocEfficacyField}
                scores={calculatedScores?.domains?.find((d: any) => d.name.includes('Enhancements'))}
                onBlurSave={triggerSaveOnBlur}
              />

              {/* Auto-save Indicator */}
              <div className="flex justify-end items-center gap-2 text-sm">
                {isSavingAuto && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Auto-saving...</span>
                  </div>
                )}
                {!isSavingAuto && calculatedScores && (
                  <div className="text-green-600 dark:text-green-400 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>All changes saved</span>
                  </div>
                )}
              </div>


            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Report Description (Optional)
            </label>
            <textarea
              rows={3}
              name="description"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl
                        focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                        text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                        transition-all duration-200 resize-none"
              placeholder="Add any additional notes about this report (optional)..."
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Report Name:</strong> Will be auto-generated as: <br />
              <span className="font-mono text-xs">{selectedClient?.name || selectedClient?.organisation_name || 'Stellar9'} - [Template] - [Time Range] - [Date]</span>
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600
                          hover:from-blue-700 hover:to-purple-700 rounded-lg shadow-lg shadow-blue-500/25
                          transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-blue-500/50 focus:outline-none
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isGenerating ? 'Generating Report...' : 'Create Report'}
              </button>
            </div>
          </div>
        </form>
      </div>
      </PermissionGate>

      {/* Generated Reports */}
      <PermissionGate section="reports" action="read" showLock={false}>
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Generated Reports
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedMonthLabel
                  ? `Your organization's security reports for ${selectedMonthLabel}`
                  : "Your organization's security reports"}
              </p>
            </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="ml-3 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                        {report.report_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {report.frequency} • {report.template}
                      </p>
                    </div>
                  </div>

                </div>

                {report.description && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {report.description}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">File Size:</span>
                    <span className="ml-2">{formatFileSize(report.file_size)}</span>
                  </div>
                  {report.created_by && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Created by:</span>
                      <span className="ml-2">{report.created_by.full_name || report.created_by.username}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Generated:</span>
                    <span className="ml-2">{formatDate(report.created_at)}</span>
                  </div>
                  {report.metadata && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Alerts:</span>
                      <span className="ml-2">{report.metadata.alerts_count || 0}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex space-x-2">
                  <PermissionGate section="reports" action="download" showLock={false}>
                    <button
                      onClick={() => handleDownloadReport(report.id, report.file_name)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </PermissionGate>
                  <PermissionGate section="reports" action="delete" showLock={false}>
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {selectedMonthLabel && reports.length > 0
              ? `No reports for ${selectedMonthLabel}`
              : 'No reports generated yet'}
          </p>
        </div>
      )}
      </PermissionGate>
    </div>
  )
} 