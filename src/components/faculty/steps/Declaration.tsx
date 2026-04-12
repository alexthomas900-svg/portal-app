import type { Application, EligibilityResult } from '@/types'
import { checkEligibility } from '@/utils/eligibility'
import {
  TEACHING_SCORES,
  EFFORTS_SCORES,
  SCHOLARSHIP_SCORES,
  SERVICES_SCORES,
  formatApplicationTypeLabel,
} from '@/types'

import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface Props {
  application: Application
  onAccept: (declaration: boolean) => void
}

export default function DeclarationStep({ application, onAccept }: Props) {
  const eligibility: EligibilityResult = checkEligibility(application)

  const teachingScore = TEACHING_SCORES[application.teachingEffectiveness.overallRating]
  const effortsScore = EFFORTS_SCORES[application.effortsToImprove.overallRating]
  const scholarshipScore = SCHOLARSHIP_SCORES[application.scholarship.overallRating]
  const servicesScore = SERVICES_SCORES[application.services.overallRating]
  const totalScore = teachingScore + effortsScore + scholarshipScore + servicesScore

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
        <h3 className="text-lg font-semibold text-text mb-1">Review & Declaration</h3>
        <p className="text-sm text-text-secondary">
          Review your eligibility status and scores before final submission.
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

      {/* Scores Summary */}
      <div className="card p-4">
        <h4 className="text-sm font-semibold text-text mb-3">Scoring Summary</h4>
        <div className="space-y-2">
          {[
            { label: 'Teaching Effectiveness', score: teachingScore, max: 45 },
            { label: 'Efforts to Improve', score: effortsScore, max: 10 },
            { label: 'Scholarship', score: scholarshipScore, max: 25 },
            { label: 'Services', score: servicesScore, max: 20 },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
                <span className="text-text font-medium w-14 text-right">
                  {item.score}/{item.max}
                </span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="text-text font-semibold">Total</span>
            <span className="text-primary font-bold">{totalScore}/100</span>
          </div>
        </div>
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
