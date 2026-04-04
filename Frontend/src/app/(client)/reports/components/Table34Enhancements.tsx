import { FieldLabel } from './FieldLabel'
import { FIELD_DESCRIPTIONS } from './fieldDescriptions'

interface Table34Props {
  data: any
  updateField: (table: string, field: string, value: any) => void
  scores?: any
  onBlurSave: () => void
}

export function Table34Enhancements({ data, updateField, scores, onBlurSave }: Table34Props) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          CSCRF Annexure N - Table 34 - SOC Enrichments and Enhancements
        </h3>
      </div>
      <div className="space-y-4">
        {/* Dashboards */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Dashboards & Analytics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { field: 'native_dashboard', naField: 'native_dashboard_na', label: 'Native Technology Dashboard', metricName: 'Native Dashboard' },
              { field: 'custom_dashboard', naField: 'custom_dashboard_na', label: 'Custom Developed Dashboard', metricName: 'Custom Dashboard' }
            ].map(item => (
              <div key={item.field} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {scores && !data[item.naField] && (() => {
                      const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName))
                      return metricScore && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Score</div>
                          <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                        </div>
                      )
                    })()}
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data[item.naField]}
                        onChange={(e) => { updateField('table34_enhancements', item.naField, e.target.checked); onBlurSave() }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-gray-600 dark:text-gray-400">N/A</span>
                    </label>
                  </div>
                </div>
                {!data[item.naField] && scores && (() => {
                  const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName))
                  const isEnabled = data[item.field] === 1
                  return metricScore && (
                    <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <div>Status: {isEnabled ? 'Enabled' : 'Disabled'} | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                      <div className="italic">Formula: {isEnabled ? '1' : '0'} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                    </div>
                  )
                })()}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data[item.field] === 1}
                    disabled={data[item.naField]}
                    onChange={(e) => { updateField('table34_enhancements', item.field, e.target.checked ? 1 : 0); onBlurSave() }}
                    className={`w-5 h-5 text-blue-600 rounded ${data[item.naField] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <span className={`text-sm ${data[item.naField] ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {data[item.field] === 1 ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Threat Hunting */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Threat Hunting</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {[
              { field: 'threat_hunting_service_provider', naField: 'threat_hunting_service_provider_na', label: 'Service Provider', metricName: 'Threat Hunting - Service Provider' },
              { field: 'threat_hunting_internal_team', naField: 'threat_hunting_internal_team_na', label: 'Internal Team', metricName: 'Threat Hunting - Internal Team' },
              { field: 'threat_hunting_quarterly', naField: 'threat_hunting_quarterly_na', label: 'Quarterly', metricName: 'Threat Hunting - Quarterly' },
              { field: 'threat_hunting_half_yearly', naField: 'threat_hunting_half_yearly_na', label: 'Half-Yearly', metricName: 'Threat Hunting - Half-Yearly' }
            ].map(item => (
              <div key={item.field} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {scores && !data[item.naField] && (() => {
                      const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName))
                      return metricScore && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Score</div>
                          <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                        </div>
                      )
                    })()}
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data[item.naField]}
                        onChange={(e) => { updateField('table34_enhancements', item.naField, e.target.checked); onBlurSave() }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-gray-600 dark:text-gray-400">N/A</span>
                    </label>
                  </div>
                </div>
                {!data[item.naField] && scores && (() => {
                  const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName))
                  const isEnabled = data[item.field] === 1
                  return metricScore && (
                    <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <div>Status: {isEnabled ? 'Yes' : 'No'} | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                      <div className="italic">Formula: {isEnabled ? '1' : '0'} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                    </div>
                  )
                })()}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data[item.field] === 1}
                    disabled={data[item.naField]}
                    onChange={(e) => { updateField('table34_enhancements', item.field, e.target.checked ? 1 : 0); onBlurSave() }}
                    className={`w-4 h-4 text-blue-600 rounded ${data[item.naField] ? 'opacity-50' : ''}`}
                  />
                  <span className={`text-sm ${data[item.naField] ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {data[item.field] === 1 ? 'Yes' : 'No'}
                  </span>
                </label>
              </div>
            ))}
          </div>

          {/* Hypotheses */}
          <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
            <div className="mb-3">
              <FieldLabel label="Total Hypotheses" description={FIELD_DESCRIPTIONS.total_hypotheses} />
              <input
                type="number"
                min="0"
                value={data.total_hypotheses === '' ? '' : data.total_hypotheses}
                onChange={(e) => updateField('table34_enhancements', 'total_hypotheses', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table34_enhancements', 'total_hypotheses', 0)
                  }
                  onBlurSave()
                }}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { field: 'hypotheses_vulnerabilities', naField: 'hypotheses_vulnerabilities_na', label: 'Vulnerabilities', metricName: 'Hypotheses Vulnerabilities' },
                { field: 'hypotheses_iocs', naField: 'hypotheses_iocs_na', label: 'IoCs', metricName: 'Hypotheses IoCs' },
                { field: 'hypotheses_ioas', naField: 'hypotheses_ioas_na', label: 'IoAs', metricName: 'Hypotheses IoAs' }
              ].map(item => (
                <div key={item.field}>
                  <div className="flex items-center justify-between mb-2">
                    <FieldLabel label={item.label} description={FIELD_DESCRIPTIONS[item.field]} />
                    <div className="flex items-center gap-1">
                      {scores && !data[item.naField] && (() => {
                        const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName) || m.metric?.includes('Hypotheses'))
                        return metricScore && (
                          <div className="text-right mr-1">
                            <div className="text-xs text-gray-500">Score</div>
                            <div className="text-xs font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                          </div>
                        )
                      })()}
                      <label className="flex items-center gap-1 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data[item.naField]}
                          onChange={(e) => { updateField('table34_enhancements', item.naField, e.target.checked); onBlurSave() }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-600 dark:text-gray-400">N/A</span>
                      </label>
                    </div>
                  </div>
                  {!data[item.naField] && scores && (() => {
                    const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName) || m.metric?.includes('Hypotheses'))
                    const count = data[item.field] || 0
                    const total = data.total_hypotheses || 0
                    const ratio = total > 0 ? (count / total) : 0
                    const weight = 5  // Fixed weight of 5 for each hypothesis type
                    const calculatedScore = ratio * weight
                    return metricScore && (
                      <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        <div>Ratio: {ratio.toFixed(2)} ({count}/{total}) | Weight: {weight}</div>
                        <div className="italic">Formula: ({count}/{total}) × {weight} = {calculatedScore.toFixed(2)}</div>
                      </div>
                    )
                  })()}
                  <input
                    type="number"
                    min="0"
                    value={data[item.field] === '' ? '' : data[item.field]}
                    disabled={data[item.naField]}
                    onChange={(e) => updateField('table34_enhancements', item.field, e.target.value === '' ? '' : parseInt(e.target.value))}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        updateField('table34_enhancements', item.field, 0)
                      }
                      onBlurSave()
                    }}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                      data[item.naField]
                        ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Automation */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Automation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Threat Intel */}
            <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Threat Intel - SIEM Integration</span>
                <div className="flex items-center gap-2">
                  {scores && !data.threat_intel_integrated_siem_na && (() => {
                    const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Threat Intel') && m.metric?.includes('SIEM'))
                    return metricScore && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Score</div>
                        <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                      </div>
                    )
                  })()}
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.threat_intel_integrated_siem_na}
                      onChange={(e) => { updateField('table34_enhancements', 'threat_intel_integrated_siem_na', e.target.checked); onBlurSave() }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-600 dark:text-gray-400">N/A</span>
                  </label>
                </div>
              </div>
              {!data.threat_intel_integrated_siem_na && scores && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Threat Intel') && m.metric?.includes('SIEM'))
                const isEnabled = data.threat_intel_integrated_siem === 1
                return metricScore && (
                  <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <div>Status: {isEnabled ? 'Enabled' : 'Disabled'} | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                    <div className="italic">Formula: {isEnabled ? '1' : '0'} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.threat_intel_integrated_siem === 1}
                  disabled={data.threat_intel_integrated_siem_na}
                  onChange={(e) => { updateField('table34_enhancements', 'threat_intel_integrated_siem', e.target.checked ? 1 : 0); onBlurSave() }}
                  className={`w-5 h-5 text-blue-600 rounded ${data.threat_intel_integrated_siem_na ? 'opacity-50' : ''}`}
                />
                <span className={`text-sm ${data.threat_intel_integrated_siem_na ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {data.threat_intel_integrated_siem === 1 ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* SOAR Actions */}
            <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">SOAR Actions</span>
                <div className="flex items-center gap-2">
                  {scores && !data.soar_actions_na && (() => {
                    const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('SOAR Actions'))
                    return metricScore && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Score</div>
                        <div className="text-sm font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                      </div>
                    )
                  })()}
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.soar_actions_na}
                      onChange={(e) => { updateField('table34_enhancements', 'soar_actions_na', e.target.checked); onBlurSave() }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-600 dark:text-gray-400">N/A</span>
                  </label>
                </div>
              </div>
              {!data.soar_actions_na && scores && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('SOAR Actions'))
                const triggered = data.soar_actions_triggered || 0
                const created = data.soar_actions_created || 0
                const coverage = created > 0 ? ((triggered / created) * 100) : 0
                return metricScore && (
                  <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <div>Coverage: {coverage.toFixed(1)}% ({triggered}/{created}) | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                    <div className="italic">Formula: ({triggered}/{created}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )
              })()}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel label="Triggered" description={FIELD_DESCRIPTIONS.soar_actions_triggered} />
                  <input
                    type="number"
                    min="0"
                    value={data.soar_actions_triggered === '' ? '' : data.soar_actions_triggered}
                    disabled={data.soar_actions_na}
                    onChange={(e) => updateField('table34_enhancements', 'soar_actions_triggered', e.target.value === '' ? '' : parseInt(e.target.value))}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        updateField('table34_enhancements', 'soar_actions_triggered', 0)
                      }
                      onBlurSave()
                    }}
                    className={`w-full px-2 py-1 border rounded text-sm ${
                      data.soar_actions_na
                        ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                  />
                </div>
                <div>
                  <FieldLabel label="Created" description={FIELD_DESCRIPTIONS.soar_actions_created} />
                  <input
                    type="number"
                    min="0"
                    value={data.soar_actions_created === '' ? '' : data.soar_actions_created}
                    disabled={data.soar_actions_na}
                    onChange={(e) => updateField('table34_enhancements', 'soar_actions_created', e.target.value === '' ? '' : parseInt(e.target.value))}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        updateField('table34_enhancements', 'soar_actions_created', 0)
                      }
                      onBlurSave()
                    }}
                    className={`w-full px-2 py-1 border rounded text-sm ${
                      data.soar_actions_na
                        ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Technologies */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Advanced Technologies Implemented</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { field: 'tech_decoy', naField: 'tech_decoy_na', label: 'Decoy', metricName: 'Decoy' },
              { field: 'tech_sandboxing', naField: 'tech_sandboxing_na', label: 'Sandboxing', metricName: 'Sandboxing' },
              { field: 'tech_ueba', naField: 'tech_ueba_na', label: 'UEBA', metricName: 'UEBA' },
              { field: 'tech_vulnerability_mgmt', naField: 'tech_vulnerability_mgmt_na', label: 'Vulnerability Management', metricName: 'Vulnerability Management' },
              { field: 'tech_encrypted_traffic_mgmt', naField: 'tech_encrypted_traffic_mgmt_na', label: 'Encrypted Traffic Mgmt', metricName: 'Encrypted Traffic' },
              { field: 'tech_dns_security', naField: 'tech_dns_security_na', label: 'DNS Security', metricName: 'DNS Security' },
              { field: 'tech_ips', naField: 'tech_ips_na', label: 'IPS', metricName: 'IPS' },
              { field: 'tech_data_classification', naField: 'tech_data_classification_na', label: 'Data Classification', metricName: 'Data Classification' }
            ].map(item => (
              <div key={item.field} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{item.label}</span>
                  <div className="flex items-center gap-1">
                    {scores && !data[item.naField] && (() => {
                      const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName))
                      return metricScore && (
                        <div className="text-right mr-1">
                          <div className="text-xs text-gray-500">Score</div>
                          <div className="text-xs font-semibold text-blue-600">{metricScore.weighted_score?.toFixed(2)}</div>
                        </div>
                      )
                    })()}
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data[item.naField]}
                        onChange={(e) => { updateField('table34_enhancements', item.naField, e.target.checked); onBlurSave() }}
                        className="w-3 h-3 text-blue-600 rounded"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">N/A</span>
                    </label>
                  </div>
                </div>
                {!data[item.naField] && scores && (() => {
                  const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes(item.metricName))
                  const isImplemented = data[item.field] === 1
                  return metricScore && (
                    <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <div>Status: {isImplemented ? 'Yes' : 'No'} | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                      <div className="italic">Formula: {isImplemented ? '1' : '0'} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                    </div>
                  )
                })()}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data[item.field] === 1}
                    disabled={data[item.naField]}
                    onChange={(e) => { updateField('table34_enhancements', item.field, e.target.checked ? 1 : 0); onBlurSave() }}
                    className={`w-4 h-4 text-blue-600 rounded ${data[item.naField] ? 'opacity-50' : ''}`}
                  />
                  <span className={`text-xs ${data[item.naField] ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {data[item.field] === 1 ? 'Yes' : 'No'}
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
            <span className="text-lg font-semibold text-gray-900 dark:text-white">(Domain 5) Total Score</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scores.score.toFixed(2)}/75</span>
          </div>
        </div>
      )}
    </div>
  )
}
