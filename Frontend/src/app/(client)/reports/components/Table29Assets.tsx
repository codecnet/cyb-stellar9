import { FieldLabel } from './FieldLabel'
import { FIELD_DESCRIPTIONS } from './fieldDescriptions'

interface Table29Props {
  data: any
  updateField: (table: string, field: string, value: any) => void
  onBlurSave: () => void
}

export function Table29Assets({ data, updateField, onBlurSave }: Table29Props) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        CSCRF Annexure N - Table 29 - IT Asset Distribution
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <FieldLabel label="Network Devices (S1)" description={FIELD_DESCRIPTIONS.network_devices} />
          <input
            type="number"
            min="0"
            value={data.network_devices === '' ? '' : data.network_devices}
            onChange={(e) => updateField('table29_assets', 'network_devices', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => {
              if (e.target.value === '') {
                updateField('table29_assets', 'network_devices', 0)
              }
              onBlurSave()
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <FieldLabel label="Security Solutions (S2)" description={FIELD_DESCRIPTIONS.security_solutions} />
          <input
            type="number"
            min="0"
            value={data.security_solutions === '' ? '' : data.security_solutions}
            onChange={(e) => updateField('table29_assets', 'security_solutions', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => {
              if (e.target.value === '') {
                updateField('table29_assets', 'security_solutions', 0)
              }
              onBlurSave()
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <FieldLabel label="End-Points (S3)" description={FIELD_DESCRIPTIONS.endpoints} />
          <input
            type="number"
            min="0"
            value={data.endpoints === '' ? '' : data.endpoints}
            onChange={(e) => updateField('table29_assets', 'endpoints', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => {
              if (e.target.value === '') {
                updateField('table29_assets', 'endpoints', 0)
              }
              onBlurSave()
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <FieldLabel label="Applications (S4)" description={FIELD_DESCRIPTIONS.applications} />
          <input
            type="number"
            min="0"
            value={data.applications === '' ? '' : data.applications}
            onChange={(e) => updateField('table29_assets', 'applications', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => {
              if (e.target.value === '') {
                updateField('table29_assets', 'applications', 0)
              }
              onBlurSave()
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <FieldLabel label="Databases (S5)" description={FIELD_DESCRIPTIONS.databases} />
          <input
            type="number"
            min="0"
            value={data.databases === '' ? '' : data.databases}
            onChange={(e) => updateField('table29_assets', 'databases', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => {
              if (e.target.value === '') {
                updateField('table29_assets', 'databases', 0)
              }
              onBlurSave()
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <FieldLabel label="Servers (S6)" description={FIELD_DESCRIPTIONS.servers} />
          <input
            type="number"
            min="0"
            value={data.servers === '' ? '' : data.servers}
            onChange={(e) => updateField('table29_assets', 'servers', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => {
              if (e.target.value === '') {
                updateField('table29_assets', 'servers', 0)
              }
              onBlurSave()
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  )
}
