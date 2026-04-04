import React from 'react';
import { FieldLabel } from './FieldLabel';
import { FIELD_DESCRIPTIONS } from './fieldDescriptions';

interface Table32PersonnelProps {
  data: any;
  updateField: (table: string, field: string, value: any) => void;
  scores?: any;
  onBlurSave: () => void
}

export function Table32Personnel({ data, updateField, scores , onBlurSave}: Table32PersonnelProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          CSCRF Annexure N - Table 32 - Personnel Competency
        </h3>
      </div>
      <div className="space-y-4">
        {/* L1 Engineers */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">L1 Engineers (CEH Certified)</h4>
            <div className="flex items-center gap-3">
              {scores && !data.category_l1_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('L1 Engineers'))
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
                  checked={data.category_l1_na}
                  onChange={(e) => { updateField('table32_personnel', 'category_l1_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>N/A</span>
              </label>
            </div>
          </div>
          {!data.category_l1_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.category?.includes('L1 Engineers'))
            if (!metricScore) return null

            const tiers = metricScore.tiers || []
            const sumX = tiers.reduce((sum: number, t: any) => sum + t.count, 0)
            const sumZ = tiers.reduce((sum: number, t: any) => sum + (t.count * t.weight), 0)
            const categoryScore = metricScore.category_score || 0

            return (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded space-y-1">
                <div className="font-semibold">Individual Tier Breakdown:</div>
                {tiers.map((t: any) => (
                  <div key={t.years} className="ml-2">
                    {t.years} YoE: {t.count} engineers × {t.weight} = {(t.count * t.weight).toFixed(2)} [z]
                  </div>
                ))}
                <div className="border-t border-gray-300 dark:border-gray-600 pt-1 mt-1">
                  <div>Total Engineers (Sum[x]): {sumX}</div>
                  <div>Sum of Sub-scores (Sum[z]): {sumZ.toFixed(2)}</div>
                  <div>Category Score [A] = Sum[z] / Sum[x] = {categoryScore.toFixed(4)}</div>
                  <div>Category Weight [C]: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                  <div className="font-semibold mt-1">Weighted Score [B] = [A] × [C] = {categoryScore.toFixed(4)} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                </div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <FieldLabel label="2 Years" description={FIELD_DESCRIPTIONS.l1_2years} />
              <input
                type="number"
                min="0"
                value={data.l1_2years === '' ? '' : data.l1_2years}
                disabled={data.category_l1_na}
                onChange={(e) => updateField('table32_personnel', 'l1_2years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l1_2years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l1_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="3 Years" description={FIELD_DESCRIPTIONS.l1_3years} />
              <input
                type="number"
                min="0"
                value={data.l1_3years === '' ? '' : data.l1_3years}
                disabled={data.category_l1_na}
                onChange={(e) => updateField('table32_personnel', 'l1_3years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l1_3years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l1_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="4 Years" description={FIELD_DESCRIPTIONS.l1_4years} />
              <input
                type="number"
                min="0"
                value={data.l1_4years === '' ? '' : data.l1_4years}
                disabled={data.category_l1_na}
                onChange={(e) => updateField('table32_personnel', 'l1_4years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l1_4years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l1_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="5 Years" description={FIELD_DESCRIPTIONS.l1_5years} />
              <input
                type="number"
                min="0"
                value={data.l1_5years === '' ? '' : data.l1_5years}
                disabled={data.category_l1_na}
                onChange={(e) => updateField('table32_personnel', 'l1_5years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l1_5years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l1_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* L2 Engineers */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">L2 Engineers (CEH + OEM Certified)</h4>
            <div className="flex items-center gap-3">
              {scores && !data.category_l2_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('L2 Engineers'))
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
                  checked={data.category_l2_na}
                  onChange={(e) => { updateField('table32_personnel', 'category_l2_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>N/A</span>
              </label>
            </div>
          </div>
          {!data.category_l2_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.category?.includes('L2 Engineers'))
            if (!metricScore) return null

            const tiers = metricScore.tiers || []
            const sumX = tiers.reduce((sum: number, t: any) => sum + t.count, 0)
            const sumZ = tiers.reduce((sum: number, t: any) => sum + (t.count * t.weight), 0)
            const categoryScore = metricScore.category_score || 0

            return (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded space-y-1">
                <div className="font-semibold">Individual Tier Breakdown:</div>
                {tiers.map((t: any) => (
                  <div key={t.years} className="ml-2">
                    {t.years} YoE: {t.count} engineers × {t.weight} = {(t.count * t.weight).toFixed(2)} [z]
                  </div>
                ))}
                <div className="border-t border-gray-300 dark:border-gray-600 pt-1 mt-1">
                  <div>Total Engineers (Sum[x]): {sumX}</div>
                  <div>Sum of Sub-scores (Sum[z]): {sumZ.toFixed(2)}</div>
                  <div>Category Score [A] = Sum[z] / Sum[x] = {categoryScore.toFixed(4)}</div>
                  <div>Category Weight [C]: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                  <div className="font-semibold mt-1">Weighted Score [B] = [A] × [C] = {categoryScore.toFixed(4)} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                </div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel label="6 Years" description={FIELD_DESCRIPTIONS.l2_6years} />
              <input
                type="number"
                min="0"
                value={data.l2_6years === '' ? '' : data.l2_6years}
                disabled={data.category_l2_na}
                onChange={(e) => updateField('table32_personnel', 'l2_6years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l2_6years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l2_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="7 Years" description={FIELD_DESCRIPTIONS.l2_7years} />
              <input
                type="number"
                min="0"
                value={data.l2_7years === '' ? '' : data.l2_7years}
                disabled={data.category_l2_na}
                onChange={(e) => updateField('table32_personnel', 'l2_7years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l2_7years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l2_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="8 Years" description={FIELD_DESCRIPTIONS.l2_8years} />
              <input
                type="number"
                min="0"
                value={data.l2_8years === '' ? '' : data.l2_8years}
                disabled={data.category_l2_na}
                onChange={(e) => updateField('table32_personnel', 'l2_8years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l2_8years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l2_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* L3 Engineers */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">L3 Engineers (CEH + CISM Certified)</h4>
            <div className="flex items-center gap-3">
              {scores && !data.category_l3_na && (() => {
                const metricScore = scores.breakdown?.find((m: any) => m.metric?.includes('L3 Engineers'))
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
                  checked={data.category_l3_na}
                  onChange={(e) => { updateField('table32_personnel', 'category_l3_na', e.target.checked); onBlurSave() }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>N/A</span>
              </label>
            </div>
          </div>
          {!data.category_l3_na && scores && (() => {
            const metricScore = scores.breakdown?.find((m: any) => m.category?.includes('L3 Engineers'))
            if (!metricScore) return null

            const tiers = metricScore.tiers || []
            const sumX = tiers.reduce((sum: number, t: any) => sum + t.count, 0)
            const sumZ = tiers.reduce((sum: number, t: any) => sum + (t.count * t.weight), 0)
            const categoryScore = metricScore.category_score || 0

            return (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded space-y-1">
                <div className="font-semibold">Individual Tier Breakdown:</div>
                {tiers.map((t: any) => (
                  <div key={t.years} className="ml-2">
                    {t.years} YoE: {t.count} engineers × {t.weight} = {(t.count * t.weight).toFixed(2)} [z]
                  </div>
                ))}
                <div className="border-t border-gray-300 dark:border-gray-600 pt-1 mt-1">
                  <div>Total Engineers (Sum[x]): {sumX}</div>
                  <div>Sum of Sub-scores (Sum[z]): {sumZ.toFixed(2)}</div>
                  <div>Category Score [A] = Sum[z] / Sum[x] = {categoryScore.toFixed(4)}</div>
                  <div>Category Weight [C]: {metricScore.adjusted_weight?.toFixed(1)}%</div>
                  <div className="font-semibold mt-1">Weighted Score [B] = [A] × [C] = {categoryScore.toFixed(4)} × {metricScore.adjusted_weight?.toFixed(1)}% = {metricScore.weighted_score?.toFixed(2)}</div>
                </div>
              </div>
            )
          })()}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <FieldLabel label="9 Years" description={FIELD_DESCRIPTIONS.l3_9years} />
              <input
                type="number"
                min="0"
                value={data.l3_9years === '' ? '' : data.l3_9years}
                disabled={data.category_l3_na}
                onChange={(e) => updateField('table32_personnel', 'l3_9years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l3_9years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l3_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="10 Years" description={FIELD_DESCRIPTIONS.l3_10years} />
              <input
                type="number"
                min="0"
                value={data.l3_10years === '' ? '' : data.l3_10years}
                disabled={data.category_l3_na}
                onChange={(e) => updateField('table32_personnel', 'l3_10years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l3_10years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l3_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="11 Years" description={FIELD_DESCRIPTIONS.l3_11years} />
              <input
                type="number"
                min="0"
                value={data.l3_11years === '' ? '' : data.l3_11years}
                disabled={data.category_l3_na}
                onChange={(e) => updateField('table32_personnel', 'l3_11years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l3_11years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l3_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <FieldLabel label="12+ Years" description={FIELD_DESCRIPTIONS.l3_12plus_years} />
              <input
                type="number"
                min="0"
                value={data.l3_12plus_years === '' ? '' : data.l3_12plus_years}
                disabled={data.category_l3_na}
                onChange={(e) => updateField('table32_personnel', 'l3_12plus_years', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    updateField('table32_personnel', 'l3_12plus_years', 0)
                  }
                  onBlurSave()
                }}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded ${
                  data.category_l3_na
                    ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
      {scores && (
        <>
          {/* Individual Category Scores */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const l1Score = scores.breakdown?.find((m: any) => m.category?.includes('L1 Engineers'))
              const l2Score = scores.breakdown?.find((m: any) => m.category?.includes('L2 Engineers'))
              const l3Score = scores.breakdown?.find((m: any) => m.category?.includes('L3 Engineers'))
              return (
                <>
                  {l1Score && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-600">
                      <div className="text-xs text-gray-600 dark:text-gray-400">L1 Engineers Score</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{l1Score.weighted_score?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Weight: {l1Score.adjusted_weight?.toFixed(1)}%</div>
                    </div>
                  )}
                  {l2Score && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-600">
                      <div className="text-xs text-gray-600 dark:text-gray-400">L2 Engineers Score</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{l2Score.weighted_score?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Weight: {l2Score.adjusted_weight?.toFixed(1)}%</div>
                    </div>
                  )}
                  {l3Score && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-600">
                      <div className="text-xs text-gray-600 dark:text-gray-400">L3 Engineers Score</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{l3Score.weighted_score?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Weight: {l3Score.adjusted_weight?.toFixed(1)}%</div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          {/* Total Score */}
          <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border-2 border-blue-500">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">(Domain 3) Total Score</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scores.score.toFixed(2)}/100</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
