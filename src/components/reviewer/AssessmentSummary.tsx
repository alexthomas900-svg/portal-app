import StatusBadge from '../shared/StatusBadge'
import { checkEligibility } from '../../utils/eligibility'
import {
  SECTION_MAX_MARKS,
  type Application,
  type EvaluationReport,
  type MarkedSection,
  type SectionMarks,
} from '../../types'

const SECTIONS: MarkedSection[] = ['teaching', 'efforts', 'scholarship', 'services']

// Mark bands from the institutional marking framework, highest first.
const BANDS: Record<MarkedSection, [number, string][]> = {
  teaching: [[45, 'Exceeds Expectations'], [36, 'Meets Expectations'], [27, 'Minimally Accepted'], [0, 'Deficient']],
  efforts: [[10, 'Exceeds Expectations'], [8, 'Meets Expectations'], [6, 'Minimally Accepted'], [0, 'Deficient']],
  scholarship: [[25, 'Exceeds Expectations'], [15, 'Meets Expectations'], [0, 'Deficient']],
  services: [[20, 'Exceeds Expectations'], [16, 'Meets Expectations'], [12, 'Minimally Accepted'], [0, 'Deficient']],
}

/** The reviewer's total, or null until at least one section is marked. */
export function marksTotal(marks?: SectionMarks): number | null {
  const entered = SECTIONS.map((section) => marks?.[section]).filter((mark): mark is number => typeof mark === 'number')
  return entered.length ? entered.reduce((sum, mark) => sum + mark, 0) : null
}

const rating = (value: number) => (value ? `${value}/5` : 'Not entered')

interface Props {
  app: Application
  report: EvaluationReport | null
  marks?: SectionMarks
}

export default function AssessmentSummary({ app, report, marks }: Props) {
  const eligibility = checkEligibility(app)
  const { teachingEffectiveness: teaching, scholarship, services } = app
  const total = marksTotal(marks)
  const markedCount = SECTIONS.filter((section) => typeof marks?.[section] === 'number').length
  const rows: { section: MarkedSection; label: string; evidence?: number }[] = [
    { section: 'teaching', label: 'Teaching Effectiveness', evidence: report?.teaching.preliminaryScore },
    { section: 'efforts', label: 'Efforts to Improve', evidence: report?.efforts.preliminaryScore },
    { section: 'scholarship', label: 'Scholarship', evidence: report?.scholarly.preliminaryScore },
    { section: 'services', label: 'Services', evidence: report?.service.preliminaryScore },
  ]

  return (
    <div className="card p-5 mb-6" data-testid="assessment-summary">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-sm font-semibold text-text">Eligibility and Scores</h2>
        <div className="flex items-center gap-2">
          <StatusBadge status={eligibility.status} />
          <span className="text-sm text-text-secondary">
            Your total: <strong className="text-primary">{total === null ? 'Not marked' : `${total}/100`}</strong>
            {total !== null && markedCount < SECTIONS.length && ` (${markedCount} of ${SECTIONS.length} marked)`}
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
              <th className="py-2 font-medium">Your marks</th>
              <th className="py-2 font-medium">Rating</th>
              <th className="py-2 font-medium">Automated evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ section, label, evidence }) => {
              const mark = marks?.[section]
              const marked = typeof mark === 'number'
              return (
                <tr key={section} className="border-b border-border">
                  <td className="py-2 text-text">{label}</td>
                  <td className="py-2 font-medium text-text">{marked ? mark : '—'}/{SECTION_MAX_MARKS[section]}</td>
                  <td className="py-2 text-text-secondary">{marked ? BANDS[section].find(([minimum]) => mark >= minimum)![1] : 'Not marked'}</td>
                  <td className="py-2 text-text-secondary">{evidence === undefined ? '—' : `${evidence}/100`}</td>
                </tr>
              )
            })}
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
