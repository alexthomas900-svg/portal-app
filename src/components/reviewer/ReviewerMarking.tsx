import { CheckCircle2, Loader2, Save } from 'lucide-react'
import { SECTION_MAX_MARKS, type Application, type MarkedSection, type SectionMarks } from '../../types'
import { systemMarks } from './AssessmentSummary'

const SECTIONS: { section: MarkedSection; label: string }[] = [
  { section: 'teaching', label: 'Teaching Effectiveness' },
  { section: 'efforts', label: 'Efforts to Improve' },
  { section: 'scholarship', label: 'Scholarship' },
  { section: 'services', label: 'Services' },
]

const EMPTY_MARKS: SectionMarks = { teaching: null, efforts: null, scholarship: null, services: null }

/** The reviewer's total, or null until at least one section is marked. */
export function marksTotal(marks?: SectionMarks): number | null {
  const entered = SECTIONS.map(({ section }) => marks?.[section]).filter((mark): mark is number => typeof mark === 'number')
  return entered.length ? entered.reduce((sum, mark) => sum + mark, 0) : null
}

interface Props {
  app: Application
  marks?: SectionMarks
  locked: boolean
  saving: boolean
  saved: boolean
  onChange: (marks: SectionMarks) => void
  onSave: () => void
}

export default function ReviewerMarking({ app, marks = EMPTY_MARKS, locked, saving, saved, onChange, onSave }: Props) {
  const system = systemMarks(app)
  const acquired = marksTotal(marks)
  const eligibilityTotal = SECTIONS.reduce((sum, { section }) => sum + system[section], 0)

  return (
    <div className="card p-5 mb-6" data-testid="reviewer-marking">
      <h2 className="text-sm font-semibold text-text mb-3">Reviewers Marking</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-secondary">
              <th className="py-2 font-medium">Section</th>
              <th className="py-2 font-medium">Total marks</th>
              <th className="py-2 font-medium">Eligibility score</th>
              <th className="py-2 font-medium">Acquired marks</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(({ section, label }) => (
              <tr key={section} className="border-b border-border">
                <td className="py-2 text-text">{label}</td>
                <td className="py-2 text-text-secondary">{SECTION_MAX_MARKS[section]}</td>
                <td className="py-2 text-text-secondary">{system[section]}</td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    max={SECTION_MAX_MARKS[section]}
                    step="0.5"
                    aria-label={`${label} marks`}
                    value={marks[section] ?? ''}
                    disabled={locked}
                    onChange={(e) => onChange({ ...marks, [section]: e.target.value === '' ? null : Number(e.target.value) })}
                    style={{ width: '6rem' }}
                  />
                </td>
              </tr>
            ))}
            <tr className="font-semibold text-text">
              <td className="py-2">Total</td>
              <td className="py-2">100</td>
              <td className="py-2">{eligibilityTotal}</td>
              <td className="py-2 text-primary" data-testid="acquired-total">{acquired === null ? 'Not marked' : `${acquired}/100`}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {!locked && (
        <div className="flex justify-end mt-3">
          <button type="button" onClick={onSave} disabled={saving} className="btn-secondary btn-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : 'Save marks'}
          </button>
        </div>
      )}
    </div>
  )
}
