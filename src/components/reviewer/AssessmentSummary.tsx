import StatusBadge from '../shared/StatusBadge'
import { checkEligibility } from '../../utils/eligibility'
import {
  EFFORTS_SCORES,
  SCHOLARSHIP_SCORES,
  SERVICES_SCORES,
  TEACHING_SCORES,
  type Application,
  type EvaluationReport,
  type MarkedSection,
} from '../../types'

const RATING_LABELS = { exceeds: 'Exceeds Expectations', meets: 'Meets Expectations', minimal: 'Minimally Accepted', deficient: 'Deficient' }

const rating = (value: number) => (value ? `${value}/5` : 'Not entered')

/** The system's marks for each section, from the application's current ratings. */
export function systemMarks(app: Application): Record<MarkedSection, number> {
  return {
    teaching: TEACHING_SCORES[app.teachingEffectiveness.overallRating],
    efforts: EFFORTS_SCORES[app.effortsToImprove.overallRating],
    scholarship: SCHOLARSHIP_SCORES[app.scholarship.overallRating],
    services: SERVICES_SCORES[app.services.overallRating],
  }
}

export default function AssessmentSummary({ app, report }: { app: Application; report: EvaluationReport | null }) {
  const eligibility = checkEligibility(app)
  const { teachingEffectiveness: teaching, effortsToImprove: efforts, scholarship, services } = app
  const marks = systemMarks(app)
  const rows = [
    { label: 'Teaching Effectiveness', marks: marks.teaching, max: 45, level: teaching.overallRating, evidence: report?.teaching.preliminaryScore },
    { label: 'Efforts to Improve', marks: marks.efforts, max: 10, level: efforts.overallRating, evidence: report?.efforts.preliminaryScore },
    { label: 'Scholarship', marks: marks.scholarship, max: 25, level: scholarship.overallRating, evidence: report?.scholarly.preliminaryScore },
    { label: 'Services', marks: marks.services, max: 20, level: services.overallRating, evidence: report?.service.preliminaryScore },
  ]

  return (
    <div className="card p-5 mb-6" data-testid="assessment-summary">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-sm font-semibold text-text">Eligibility Score</h2>
        <div className="flex items-center gap-2">
          <StatusBadge status={eligibility.status} />
          <span className="text-sm text-text-secondary">
            Total: <strong className="text-primary">{rows.reduce((sum, row) => sum + row.marks, 0)}/100</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
        <div>
          <p className="text-text-dim">VET</p>
          <p className={`font-medium ${eligibility.vetPassed ? 'text-success' : 'text-danger'}`}>{eligibility.vetPassed ? 'Passed' : 'Not passed'}</p>
        </div>
        <div>
          <p className="text-text-dim">PhD</p>
          <p className={`font-medium ${eligibility.phdCompleted ? 'text-success' : 'text-danger'}`}>{eligibility.phdCompleted ? 'Completed' : 'Not found'}</p>
        </div>
        <div>
          <p className="text-text-dim">Experience</p>
          <p className={`font-medium ${eligibility.experienceMet ? 'text-success' : 'text-danger'}`}>{eligibility.totalExperienceYears} yrs (post-PhD {eligibility.postPhdYears})</p>
        </div>
        <div>
          <p className="text-text-dim">Publications</p>
          <p className={`font-medium ${eligibility.publicationsMet ? 'text-success' : 'text-danger'}`}>{eligibility.recognizedPublications}/{eligibility.requiredPublications} recognized</p>
        </div>
      </div>

      {eligibility.reasons.length > 0 && (
        <ul className="mb-4 space-y-1">
          {eligibility.reasons.map((reason) => (
            <li key={reason} className="text-xs text-text-secondary">• {reason}</li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-secondary">
              <th className="py-2 font-medium">Section</th>
              <th className="py-2 font-medium">Marks</th>
              <th className="py-2 font-medium">Rating</th>
              <th className="py-2 font-medium">Automated evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border">
                <td className="py-2 text-text">{row.label}</td>
                <td className="py-2 font-medium text-text">{row.marks}/{row.max}</td>
                <td className="py-2 text-text-secondary">{RATING_LABELS[row.level]}</td>
                <td className="py-2 text-text-secondary">{row.evidence === undefined ? '—' : `${row.evidence}/100`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs text-text-secondary">
        <p>Teaching: Chair {rating(teaching.chairRating)} · Dean {rating(teaching.deanRating)} · Students {rating(teaching.studentRating)}</p>
        <p>Scholarship: Chair {rating(scholarship.chairRating)} · Dean {rating(scholarship.deanRating)}</p>
        <p>Services: Chair {rating(services.chairRating)} · Dean {rating(services.deanRating)}</p>
      </div>
    </div>
  )
}
