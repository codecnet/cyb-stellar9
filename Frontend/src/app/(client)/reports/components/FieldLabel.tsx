import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

export const FieldLabel = ({ label, description }: { label: string; description?: string }) => {
  if (!description) {
    return <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
  }

  return (
    <div className="flex items-center gap-1 mb-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="group relative">
        <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
        <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
          {description}
        </div>
      </div>
    </div>
  )
}
