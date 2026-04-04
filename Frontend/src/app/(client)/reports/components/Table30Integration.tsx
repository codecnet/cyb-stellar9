import { FieldLabel } from './FieldLabel'
import { FIELD_DESCRIPTIONS } from './fieldDescriptions'

interface Table30Props {
  data: any
  updateIntegrationField: (tech: string, field: 'to_be_integrated' | 'actually_integrated' | 'na', value: number | boolean | '') => void
  scores?: any
  onBlurSave: () => void
}

export function Table30Integration({ data, updateIntegrationField, scores , onBlurSave}: Table30Props) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          CSCRF Annexure N - Table 30 - Asset Integration with SOC Technologies
        </h3>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Note: "To Be Integrated" is auto-calculated from Table 29 based on applicable systems.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data).map(([tech, techData]: [string, any]) => {
          const techScore = scores?.breakdown?.find((b: any) =>
            b.technology?.toLowerCase().replace(/[^a-z]/g, '').includes(tech.replace(/_/g, ''))
          )
          const coverage = techData.to_be_integrated > 0 ? ((techData.actually_integrated / techData.to_be_integrated) * 100) : 0

          return (
          <div key={tech} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-gray-900 dark:text-white capitalize">
                {tech.replace(/_/g, ' ')}
              </div>
              <div className="flex items-center gap-3">
                {techScore && !techData.na && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-blue-600">{techScore.weighted_score?.toFixed(2)}</div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={techData.na || false}
                    onChange={(e) => { updateIntegrationField(tech, 'na', e.target.checked); onBlurSave() }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span>N/A</span>
                </label>
              </div>
            </div>
            {!techData.na && techScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Coverage: {coverage.toFixed(1)}% | Weight: {techScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: ({techData.actually_integrated}/{techData.to_be_integrated}) × {techScore.adjusted_weight?.toFixed(1)}% = {techScore.weighted_score?.toFixed(2)}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel
                  label="To Be Integrated (Auto)"
                  description={FIELD_DESCRIPTIONS[`${tech}_to_be`] || 'Assets that should be integrated with this technology (auto-calculated from Table 29)'}
                />
                <input
                  type="number"
                  value={techData.to_be_integrated}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-500 dark:text-gray-500"
                />
              </div>
              <div>
                <FieldLabel
                  label="Actually Integrated"
                  description={FIELD_DESCRIPTIONS[`${tech}_actually`] || 'Number of assets currently integrated with this technology'}
                />
                <input
                  type="number"
                  min="0"
                  value={techData.actually_integrated}
                  disabled={techData.na || false}
                  onChange={(e) => updateIntegrationField(tech, 'actually_integrated', e.target.value === '' ? '' : parseInt(e.target.value))}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      updateIntegrationField(tech, 'actually_integrated', 0)
                    }
                    onBlurSave()
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                    techData.na
                      ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                />
              </div>
            </div>
          </div>
        )})}
      </div>
      {scores && (
        <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border-2 border-blue-500">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">(Domain 1) Total Score</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scores.score.toFixed(2)}/100</span>
          </div>
        </div>
      )}
    </div>
  )
}
