import type { Application } from '@/types'
import { formatApplicationTypeLabel } from '@/types'

interface Props {
  application: Application
  onAccept: (declaration: boolean) => void
}

export default function DeclarationStep({ application, onAccept }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Declaration</h3>
        <p className="text-sm text-text-secondary">
          Confirm the information provided is accurate before final submission.
        </p>
        <p className="text-xs text-text-dim mt-1">Workflow: {formatApplicationTypeLabel(application.applicationType)}</p>
      </div>

      {/* Declaration */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="declaration"
            checked={application.declaration}
            onChange={(e) => onAccept(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="declaration" className="text-sm text-text leading-relaxed">
            I, <strong>{application.personalInfo.fullName}</strong>, hereby declare that all the
            information provided in this application is true and accurate to the best of my knowledge.
            I understand that any false or misleading information may result in the rejection of this
            submission.
          </label>
        </div>
      </div>
    </div>
  )
}
