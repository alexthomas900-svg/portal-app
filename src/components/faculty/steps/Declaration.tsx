import type { Application, EligibilityResult } from '@/types'
import { checkEligibility } from '@/utils/eligibility'
import { formatApplicationTypeLabel } from '@/types'

import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface Props {
  application: Application
  onAccept: (declaration: boolean) => void
}

export default function DeclarationStep({ application, onAccept }: Props) {
  const eligibility: EligibilityResult = checkEligibility(application)

  const StatusIcon = eligibility.status === 'eligible'
    ? CheckCircle2
    : eligibility.status === 'conditionally_eligible'
      ? AlertTriangle
      : XCircle

  const statusColor = eligibility.status === 'eligible'
    ? 'text-success'
    : eligibility.status === 'conditionally_eligible'
      ? 'text-warning'
      : 'text-danger'

  const statusBg = eligibility.status === 'eligible'
    ? 'bg-success-light'
    : eligibility.status === 'conditionally_eligible'
      ? 'bg-warning-light'
      : 'bg-danger-light'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Declaration</h3>
        <p className="text-sm text-text-secondary">
          Confirm the information provided is accurate before final submission.
        </p>
        <p className="text-xs text-text-dim mt-1">Workflow: {formatApplicationTypeLabel(application.applicationType)}</p>
      </div>

      {/* Eligibility */}
      <div className={`p-4 rounded-xl ${statusBg}`}>
        <div className="flex items-center gap-3 mb-3">
          <StatusIcon className={`w-6 h-6 ${statusColor}`} />
          <h4 className={`text-base font-semibold ${statusColor}`}>
            {eligibility.status === 'eligible'
              ? 'Eligible'
              : eligibility.status === 'conditionally_eligible'
                ? 'Conditionally Eligible'
                : 'Not Eligible'}
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-text-secondary">VET Passed</p>
            <p className={`font-medium ${eligibility.vetPassed ? 'text-success' : 'text-danger'}`}>
              {eligibility.vetPassed ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">PhD</p>
            <p className={`font-medium ${eligibility.phdCompleted ? 'text-success' : 'text-danger'}`}>
              {eligibility.phdCompleted ? 'Completed' : 'Not Found'}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Experience</p>
            <p className={`font-medium ${eligibility.experienceMet ? 'text-success' : 'text-danger'}`}>
              {eligibility.totalExperienceYears} years (Post-PhD: {eligibility.postPhdYears})
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Publications</p>
            <p className={`font-medium ${eligibility.publicationsMet ? 'text-success' : 'text-danger'}`}>
              {eligibility.recognizedPublications}/{eligibility.requiredPublications} recognized
            </p>
          </div>
        </div>

        {eligibility.reasons.length > 0 && (
          <ul className="mt-3 space-y-1">
            {eligibility.reasons.map((reason, i) => (
              <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                <span className="text-danger mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        )}
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
