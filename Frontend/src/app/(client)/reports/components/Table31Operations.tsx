import React from 'react';
import { FieldLabel } from './FieldLabel';
import { FIELD_DESCRIPTIONS } from './fieldDescriptions';

interface Table31OperationsProps {
  data: any;
  updateField: (table: string, field: string, value: any) => void;
  scores?: any;
  onBlurSave: () => void
}

export function Table31Operations({ data, updateField, scores , onBlurSave}: Table31OperationsProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          CSCRF Annexure N - Table 31 - SOC Operations Performance
        </h3>
      </div>
      <div className="space-y-4">
        {/* Metric 1: Log Ingestion */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 1: Log Ingestion into SIEM</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric1_log_ingestion_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Log Ingestion'))
                const coverage = data.total_log_sources > 0 ? ((data.log_sources_in_siem / data.total_log_sources) * 100) : 0
                return metricScore && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.metric1_log_ingestion_na}
                  onChange={(e) => { updateField('table31_operations', 'metric1_log_ingestion_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>N/A</span>
              </label>
            </div>
          </div>
          {!data.metric1_log_ingestion_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Log Ingestion'))
            const coverage = data.total_log_sources > 0 ? ((data.log_sources_in_siem / data.total_log_sources) * 100) : 0
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Coverage: {coverage.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: ({data.log_sources_in_siem}/{data.total_log_sources}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Log Sources in SIEM" description={FIELD_DESCRIPTIONS.log_sources_in_siem} />
              <input
                type="number"
                min="0"
                value={data.log_sources_in_siem === '' ? '' : data.log_sources_in_siem}
                disabled={data.metric1_log_ingestion_na}
                onChange={(e) => updateField('table31_operations', 'log_sources_in_siem', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'log_sources_in_siem', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  data.metric1_log_ingestion_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="Total Log Sources (Auto-calculated from Table 29)" description={FIELD_DESCRIPTIONS.total_log_sources} />
              <input
                type="number"
                min="0"
                value={data.total_log_sources === '' ? '' : data.total_log_sources}
                disabled={true}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Compact metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metric 2: Log Latency */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Metric 2: Log Processing Latency</h4>
              <div className="flex items-center gap-3">
                {scores && !data.metric2_log_latency_na && (() => {
                  const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Log Processing Latency') || m.metric?.includes('Latency'))
                  return metricScore && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                    </div>
                  )
                })()}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.metric2_log_latency_na}
                    onChange={(e) => { updateField('table31_operations', 'metric2_log_latency_na', e.target.checked); onBlurSave() }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-600 dark:text-gray-400">N/A</span>
                </label>
              </div>
            </div>
            {!data.metric2_log_latency_na && scores && (() => {
              const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Log Processing Latency') || m.metric?.includes('Latency'))
              const latency = data.max_log_latency_minutes || 0
              const performanceScore = latency < 5 ? ((5 - latency) / 5) * 100 : 0
              return metricScore && (
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  <div>Latency: {latency} min | Performance: {performanceScore.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                  <div className="italic">Formula: ((5-{latency})/5) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                </div>
              )
            })()}
            <FieldLabel label="Max Log Latency (minutes)" description={FIELD_DESCRIPTIONS.max_log_latency_minutes} />
            <input
              type="number"
              min="0"
              value={data.max_log_latency_minutes === '' ? '' : data.max_log_latency_minutes}
              disabled={data.metric2_log_latency_na}
              onChange={(e) => updateField('table31_operations', 'max_log_latency_minutes', e.target.value === '' ? '' : parseInt(e.target.value))}
              onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'max_log_latency_minutes', 0)
                  }
                  onBlurSave()
                }}
              className={`w-full px-3 py-2 border rounded ${
                data.metric2_log_latency_na
                  ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            />
          </div>

          {/* Metric 10: Threat Intel Processing Time */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Metric 10: Threat Intel Processing</h4>
              <div className="flex items-center gap-3">
                {scores && !data.metric10_threat_intel_na && (() => {
                  const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Threat Intel') || m.metric?.includes('Threat Intelligence'))
                  return metricScore && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                    </div>
                  )
                })()}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.metric10_threat_intel_na}
                    onChange={(e) => { updateField('table31_operations', 'metric10_threat_intel_na', e.target.checked); onBlurSave() }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-600 dark:text-gray-400">N/A</span>
                </label>
              </div>
            </div>
            {!data.metric10_threat_intel_na && scores && (() => {
              const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Threat Intel') || m.metric?.includes('Threat Intelligence'))
              const processingTime = data.threat_intel_processing_time_minutes || 0
              const performanceScore = processingTime < 60 ? ((60 - processingTime) / 60) * 100 : 0
              return metricScore && (
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  <div>Processing Time: {processingTime} min | Performance: {performanceScore.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                  <div className="italic">Formula: ((60-{processingTime})/60) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                </div>
              )
            })()}
            <FieldLabel label="Threat Intel Processing Time (min)" description={FIELD_DESCRIPTIONS.threat_intel_processing_time} />
            <input
              type="number"
              min="0"
              value={data.threat_intel_processing_time_minutes === '' ? '' : data.threat_intel_processing_time_minutes}
              disabled={data.metric10_threat_intel_na}
              onChange={(e) => updateField('table31_operations', 'threat_intel_processing_time_minutes', e.target.value === '' ? '' : parseInt(e.target.value))}
              onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'threat_intel_processing_time_minutes', 0)
                  }
                  onBlurSave()
                }}
              className={`w-full px-3 py-2 border rounded ${
                data.metric10_threat_intel_na
                  ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            />
          </div>
        </div>

        {/* Metric 3: Version Control */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 3: Technology Version Control</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric3_version_control_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Technology Version Control') || m.metric?.includes('Version Control'))
                return metricScore && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.metric3_version_control_na}
                  onChange={(e) => { updateField('table31_operations', 'metric3_version_control_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">N/A</span>
              </label>
            </div>
          </div>
          {!data.metric3_version_control_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Technology Version Control') || m.metric?.includes('Version Control'))
            const coverage = data.total_technologies_deployed > 0 ? ((data.technologies_on_latest_versions / data.total_technologies_deployed) * 100) : 0
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Coverage: {coverage.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: ({data.technologies_on_latest_versions}/{data.total_technologies_deployed}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Technologies on Latest Versions" description={FIELD_DESCRIPTIONS.technologies_on_latest_versions} />
              <input
                type="number"
                min="0"
                value={data.technologies_on_latest_versions === '' ? '' : data.technologies_on_latest_versions}
                disabled={data.metric3_version_control_na}
                onChange={(e) => updateField('table31_operations', 'technologies_on_latest_versions', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'technologies_on_latest_versions', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric3_version_control_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="Total Technologies Deployed" description={FIELD_DESCRIPTIONS.total_technologies_deployed} />
              <input
                type="number"
                min="0"
                value={data.total_technologies_deployed === '' ? '' : data.total_technologies_deployed}
                disabled={data.metric3_version_control_na}
                onChange={(e) => updateField('table31_operations', 'total_technologies_deployed', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'total_technologies_deployed', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric3_version_control_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Metric 4: Vulnerability Closure */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 4: Vulnerability Closure</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric4_vulnerability_closure_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Vulnerability Closure'))
                return metricScore && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.metric4_vulnerability_closure_na}
                  onChange={(e) => { updateField('table31_operations', 'metric4_vulnerability_closure_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">N/A</span>
              </label>
            </div>
          </div>
          {!data.metric4_vulnerability_closure_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Vulnerability Closure'))
            const closureRate = data.total_advisories > 0 ? (((data.total_advisories - data.open_advisories) / data.total_advisories) * 100) : 0
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Closure Rate: {closureRate.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: (({data.total_advisories}-{data.open_advisories})/{data.total_advisories}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Open Advisories" description={FIELD_DESCRIPTIONS.open_advisories} />
              <input
                type="number"
                min="0"
                value={data.open_advisories === '' ? '' : data.open_advisories}
                disabled={data.metric4_vulnerability_closure_na}
                onChange={(e) => updateField('table31_operations', 'open_advisories', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'open_advisories', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric4_vulnerability_closure_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="Total Advisories" description={FIELD_DESCRIPTIONS.total_advisories} />
              <input
                type="number"
                min="0"
                value={data.total_advisories === '' ? '' : data.total_advisories}
                disabled={data.metric4_vulnerability_closure_na}
                onChange={(e) => updateField('table31_operations', 'total_advisories', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'total_advisories', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric4_vulnerability_closure_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Metric 5: SIEM Use Cases Coverage */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 5: SIEM Use Cases Coverage</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric5_siem_use_cases_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('SIEM Use Cases Coverage') || m.metric?.includes('Use Cases Coverage'))
                return metricScore && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.metric5_siem_use_cases_na}
                  onChange={(e) => { updateField('table31_operations', 'metric5_siem_use_cases_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">N/A</span>
              </label>
            </div>
          </div>
          {!data.metric5_siem_use_cases_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('SIEM Use Cases Coverage') || m.metric?.includes('Use Cases Coverage'))
            const coverage = data.total_soc_technologies > 0 ? ((data.technologies_with_use_cases / data.total_soc_technologies) * 100) : 0
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Coverage: {coverage.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: ({data.technologies_with_use_cases}/{data.total_soc_technologies}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Technologies with Use Cases" description={FIELD_DESCRIPTIONS.technologies_with_use_cases} />
              <input
                type="number"
                min="0"
                value={data.technologies_with_use_cases === '' ? '' : data.technologies_with_use_cases}
                disabled={data.metric5_siem_use_cases_na}
                onChange={(e) => updateField('table31_operations', 'technologies_with_use_cases', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'technologies_with_use_cases', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric5_siem_use_cases_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="Total SOC Technologies (Auto-calculated from Table 30)" description={FIELD_DESCRIPTIONS.total_soc_technologies} />
              <input
                type="number"
                min="0"
                value={data.total_soc_technologies === '' ? '' : data.total_soc_technologies}
                disabled={true}
                readOnly
                className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Metric 6: Use Cases Triggered */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 6: Use Cases Triggered</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric6_use_cases_triggered_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Use Cases Triggered'))
                return metricScore && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.metric6_use_cases_triggered_na}
                  onChange={(e) => { updateField('table31_operations', 'metric6_use_cases_triggered_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">N/A</span>
              </label>
            </div>
          </div>
          {!data.metric6_use_cases_triggered_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Use Cases Triggered'))
            const triggerRate = data.total_use_cases > 0 ? (((data.total_use_cases - data.use_cases_not_triggered) / data.total_use_cases) * 100) : 0
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Trigger Rate: {triggerRate.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: (({data.total_use_cases}-{data.use_cases_not_triggered})/{data.total_use_cases}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Use Cases Not Triggered" description={FIELD_DESCRIPTIONS.use_cases_not_triggered} />
              <input
                type="number"
                min="0"
                value={data.use_cases_not_triggered === '' ? '' : data.use_cases_not_triggered}
                disabled={data.metric6_use_cases_triggered_na}
                onChange={(e) => updateField('table31_operations', 'use_cases_not_triggered', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'use_cases_not_triggered', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric6_use_cases_triggered_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="Total Use Cases" description={FIELD_DESCRIPTIONS.total_use_cases} />
              <input
                type="number"
                min="0"
                value={data.total_use_cases === '' ? '' : data.total_use_cases}
                disabled={data.metric6_use_cases_triggered_na}
                onChange={(e) => updateField('table31_operations', 'total_use_cases', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'total_use_cases', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric6_use_cases_triggered_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Metric 7: Playbooks Defined */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 7: Playbooks Defined</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric7_playbooks_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Playbooks Defined') || m.metric?.includes('Playbooks'))
                return metricScore && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.metric7_playbooks_na}
                  onChange={(e) => { updateField('table31_operations', 'metric7_playbooks_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">N/A</span>
              </label>
            </div>
          </div>
          {!data.metric7_playbooks_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Playbooks Defined') || m.metric?.includes('Playbooks'))
            const coverage = data.total_use_cases_for_playbooks > 0 ? ((data.playbooks_defined / data.total_use_cases_for_playbooks) * 100) : 0
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Coverage: {coverage.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: ({data.playbooks_defined}/{data.total_use_cases_for_playbooks}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Playbooks Defined" description={FIELD_DESCRIPTIONS.playbooks_defined} />
              <input
                type="number"
                min="0"
                value={data.playbooks_defined === '' ? '' : data.playbooks_defined}
                disabled={data.metric7_playbooks_na}
                onChange={(e) => updateField('table31_operations', 'playbooks_defined', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'playbooks_defined', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric7_playbooks_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="Total Use Cases (for Playbooks)" description={FIELD_DESCRIPTIONS.total_use_cases_for_playbooks} />
              <input
                type="number"
                min="0"
                value={data.total_use_cases_for_playbooks === '' ? '' : data.total_use_cases_for_playbooks}
                disabled={data.metric7_playbooks_na}
                onChange={(e) => updateField('table31_operations', 'total_use_cases_for_playbooks', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'total_use_cases_for_playbooks', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric7_playbooks_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Metric 8: False Positives */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 8: False Positive Rate</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric8_false_positives_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('False Positive'))
                return metricScore && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.metric8_false_positives_na}
                  onChange={(e) => { updateField('table31_operations', 'metric8_false_positives_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">N/A</span>
              </label>
            </div>
          </div>
          {!data.metric8_false_positives_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('False Positive'))
            const fpRate = data.total_alerts_for_fp > 0 ? ((data.false_positives / data.total_alerts_for_fp) * 100) : 0
            const accuracy = 100 - fpRate
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>FP Rate: {fpRate.toFixed(1)}% | Accuracy: {accuracy.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: (1 - {data.false_positives}/{data.total_alerts_for_fp}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="False Positives" description={FIELD_DESCRIPTIONS.false_positives} />
              <input
                type="number"
                min="0"
                value={data.false_positives === '' ? '' : data.false_positives}
                disabled={data.metric8_false_positives_na}
                onChange={(e) => updateField('table31_operations', 'false_positives', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'false_positives', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric8_false_positives_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="Total Alerts (for FP)" description={FIELD_DESCRIPTIONS.total_alerts_for_fp} />
              <input
                type="number"
                min="0"
                value={data.total_alerts_for_fp === '' ? '' : data.total_alerts_for_fp}
                disabled={data.metric8_false_positives_na}
                onChange={(e) => updateField('table31_operations', 'total_alerts_for_fp', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'total_alerts_for_fp', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric8_false_positives_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Metric 9: False Negatives */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 9: False Negative Rate</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric9_false_negatives_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('False Negative'))
                return metricScore && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.metric9_false_negatives_na}
                  onChange={(e) => { updateField('table31_operations', 'metric9_false_negatives_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">N/A</span>
              </label>
            </div>
          </div>
          {!data.metric9_false_negatives_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('False Negative'))
            const fnRate = data.total_alerts_for_fn > 0 ? ((data.false_negatives / data.total_alerts_for_fn) * 100) : 0
            const accuracy = 100 - fnRate
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>FN Rate: {fnRate.toFixed(1)}% | Accuracy: {accuracy.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: (1 - {data.false_negatives}/{data.total_alerts_for_fn}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="False Negatives" description={FIELD_DESCRIPTIONS.false_negatives} />
              <input
                type="number"
                min="0"
                value={data.false_negatives === '' ? '' : data.false_negatives}
                disabled={data.metric9_false_negatives_na}
                onChange={(e) => updateField('table31_operations', 'false_negatives', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'false_negatives', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric9_false_negatives_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="Total Alerts (for FN)" description={FIELD_DESCRIPTIONS.total_alerts_for_fn} />
              <input
                type="number"
                min="0"
                value={data.total_alerts_for_fn === '' ? '' : data.total_alerts_for_fn}
                disabled={data.metric9_false_negatives_na}
                onChange={(e) => updateField('table31_operations', 'total_alerts_for_fn', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table31_operations', 'total_alerts_for_fn', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border rounded ${
                  data.metric9_false_negatives_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Metrics 11-15: Critical Systems (Boolean fields) */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Metrics 11-15: Critical Systems Handling</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { field: 'critical_log_verification_daily', label: 'M11: Daily Log Verification', naField: 'metric11_log_verification_na', metricName: 'Daily Log Verification' },
              { field: 'critical_integration_check_daily', label: 'M12: Daily Integration Check', naField: 'metric12_integration_check_na', metricName: 'Daily Integration Check' },
              { field: 'critical_siem_rules_configured', label: 'M13: SIEM Rules Configured', naField: 'metric13_siem_rules_na', metricName: 'SIEM Rules Configured' },
              { field: 'critical_privilege_check_weekly', label: 'M14: Weekly Privilege Check', naField: 'metric14_privilege_check_na', metricName: 'Weekly Privilege Check' },
              { field: 'critical_backups_periodic', label: 'M15: Periodic Backups', naField: 'metric15_backups_na', metricName: 'Periodic Backups' }
            ].map(item => (
              <div key={item.field} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {scores && !data[item.naField as keyof typeof data] && (() => {
                      const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName))
                      return metricScore && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Score</div>
                          <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                        </div>
                      )
                    })()}
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data[item.naField as keyof typeof data] as boolean}
                        onChange={(e) => { updateField('table31_operations', item.naField, e.target.checked); onBlurSave() }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-gray-600 dark:text-gray-400">N/A</span>
                    </label>
                  </div>
                </div>
                {!data[item.naField as keyof typeof data] && scores && (() => {
                  const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName))
                  const isImplemented = data[item.field as keyof typeof data] === 1
                  return metricScore && (
                    <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <div>Status: {isImplemented ? 'Yes' : 'No'} | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                      <div className="italic">Formula: {isImplemented ? '1' : '0'} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                    </div>
                  )
                })()}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data[item.field as keyof typeof data] === 1}
                    disabled={data[item.naField as keyof typeof data] as boolean}
                    onChange={(e) => { updateField('table31_operations', item.field, e.target.checked ? 1 : 0); onBlurSave() }}
                    className={`w-5 h-5 text-blue-600 rounded ${
                      data[item.naField as keyof typeof data]
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  />
                  <span className={`text-sm ${
                    data[item.naField as keyof typeof data]
                      ? 'text-gray-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {data[item.field as keyof typeof data] === 1 ? 'Yes' : 'No'}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      {scores && (
        <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border-2 border-blue-500">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">(Domain 2) Total Score</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scores.score.toFixed(2)}/75</span>
          </div>
        </div>
      )}
    </div>
  );
}
