import React from 'react';
import { FieldLabel } from './FieldLabel';
import { FIELD_DESCRIPTIONS } from './fieldDescriptions';

interface Table33GovernanceProps {
  data: any;
  updateField: (table: string, field: string, value: any) => void;
  scores?: any;
  onBlurSave: () => void
}

export function Table33Governance({ data, updateField, scores , onBlurSave}: Table33GovernanceProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          CSCRF Annexure N - Table 33 - SOC Governance
        </h3>
      </div>
      <div className="space-y-4">
        {/* Metric 1: SOC Budget Allocation */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 1: SOC Budget Allocation</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric1_budget_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('SOC Budget Allocation') || m.metric?.includes('Budget Allocation'))
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
                  checked={data.metric1_budget_na}
                  onChange={(e) => { updateField('table33_governance', 'metric1_budget_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>N/A</span>
              </label>
            </div>
          </div>
          {!data.metric1_budget_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('SOC Budget Allocation') || m.metric?.includes('Budget Allocation'))
            const allocation = data.total_cybersecurity_budget > 0 ? ((data.soc_budget / data.total_cybersecurity_budget) * 100) : 0
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Allocation: {allocation.toFixed(1)}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: ({data.soc_budget}/{data.total_cybersecurity_budget}) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Total Cybersecurity Budget" description={FIELD_DESCRIPTIONS.total_cybersecurity_budget} />
              <input
                type="number"
                min="0"
                value={data.total_cybersecurity_budget === '' ? '' : data.total_cybersecurity_budget}
                disabled={data.metric1_budget_na}
                onChange={(e) => updateField('table33_governance', 'total_cybersecurity_budget', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table33_governance', 'total_cybersecurity_budget', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  data.metric1_budget_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="SOC Budget" description={FIELD_DESCRIPTIONS.soc_budget} />
              <input
                type="number"
                min="0"
                value={data.soc_budget === '' ? '' : data.soc_budget}
                disabled={data.metric1_budget_na}
                onChange={(e) => updateField('table33_governance', 'soc_budget', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table33_governance', 'soc_budget', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  data.metric1_budget_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Training Budget */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Metric 2: Training Budget</h4>
            <div className="flex items-center gap-3">
              {scores && !data.metric2_training_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Training Budget'))
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
                  checked={data.metric2_training_na}
                  onChange={(e) => { updateField('table33_governance', 'metric2_training_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>N/A</span>
              </label>
            </div>
          </div>
          {!data.metric2_training_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Training Budget'))
            const trainingPct = data.training_budget_percentage || 0
            return metricScore && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div>Training Budget: {trainingPct}% | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                <div className="italic">Formula: ({trainingPct}/100) × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
              </div>
            )
          })()}
          <div>
            <FieldLabel label="Training Budget Percentage (%)" description={FIELD_DESCRIPTIONS.training_budget} />
            <input
              type="number"
              min="0"
              max="100"
              value={data.training_budget_percentage === '' ? '' : data.training_budget_percentage}
              disabled={data.metric2_training_na}
              onChange={(e) => updateField('table33_governance', 'training_budget_percentage', e.target.value === '' ? '' : parseInt(e.target.value))}
              onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table33_governance', 'training_budget_percentage', 0)
                  }
                  onBlurSave()
                }}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                data.metric2_training_na
                  ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            />
          </div>
        </div>

        {/* Metrics 3 & 4: Committee Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metric 3: IT Committee Review */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Metric 3: IT Committee Review</h4>
              <div className="flex items-center gap-3">
                {scores && !data.metric3_it_committee_na && (() => {
                  const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('IT Committee Review'))
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
                    checked={data.metric3_it_committee_na}
                    onChange={(e) => { updateField('table33_governance', 'metric3_it_committee_na', e.target.checked); onBlurSave() }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-600 dark:text-gray-400">N/A</span>
                </label>
              </div>
            </div>
            {!data.metric3_it_committee_na && scores && (() => {
              const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('IT Committee Review'))
              const isCompleted = data.it_committee_review_done === 1
              return metricScore && (
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  <div>Status: {isCompleted ? 'Completed' : 'Not Completed'} | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                  <div className="italic">Formula: {isCompleted ? '1' : '0'} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                </div>
              )
            })()}
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.it_committee_review_done === 1}
                disabled={data.metric3_it_committee_na}
                onChange={(e) => { updateField('table33_governance', 'it_committee_review_done', e.target.checked ? 1 : 0); onBlurSave() }}
                className={`w-5 h-5 text-blue-600 rounded ${
                  data.metric3_it_committee_na
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              />
              <span className={`text-sm ${
                data.metric3_it_committee_na
                  ? 'text-gray-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                IT Committee Review Completed
              </span>
            </label>
          </div>

          {/* Metric 4: Tech Committee Recommendations */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Metric 4: Tech Committee</h4>
              <div className="flex items-center gap-3">
                {scores && !data.metric4_tech_committee_na && (() => {
                  const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Tech Committee') || m.metric?.includes('Technology Committee'))
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
                    checked={data.metric4_tech_committee_na}
                    onChange={(e) => { updateField('table33_governance', 'metric4_tech_committee_na', e.target.checked); onBlurSave() }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-600 dark:text-gray-400">N/A</span>
                </label>
              </div>
            </div>
            {!data.metric4_tech_committee_na && scores && (() => {
              const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('Tech Committee') || m.metric?.includes('Technology Committee'))
              const isSubmitted = data.tech_committee_recommendations_submitted === 1
              return metricScore && (
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  <div>Status: {isSubmitted ? 'Submitted' : 'Not Submitted'} | Weight: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                  <div className="italic">Formula: {isSubmitted ? '1' : '0'} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                </div>
              )
            })()}
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.tech_committee_recommendations_submitted === 1}
                disabled={data.metric4_tech_committee_na}
                onChange={(e) => { updateField('table33_governance', 'tech_committee_recommendations_submitted', e.target.checked ? 1 : 0); onBlurSave() }}
                className={`w-5 h-5 text-blue-600 rounded ${
                  data.metric4_tech_committee_na
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              />
              <span className={`text-sm ${
                data.metric4_tech_committee_na
                  ? 'text-gray-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                Tech Committee Recommendations Submitted
              </span>
            </label>
          </div>
        </div>
      </div>
      {scores && (
        <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border-2 border-blue-500">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">(Domain 4) Total Score</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scores.score.toFixed(2)}/65</span>
          </div>
        </div>
      )}
    </div>
  );
}
