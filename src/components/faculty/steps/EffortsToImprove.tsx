import type { EffortsToImprove, RatingLevel, DocumentFile } from '../../../types'
import FileUpload from '../../shared/FileUpload'

interface Props {
  data: EffortsToImprove
  onChange: (data: EffortsToImprove) => void
  applicationId: string
}

const RATING_OPTIONS: { value: RatingLevel; label: string; score: number }[] = [
  { value: 'exceeds', label: 'Exceeds Expectations', score: 10 },
  { value: 'meets', label: 'Meets Expectations', score: 8 },
  { value: 'minimal', label: 'Minimally Acceptable', score: 6 },
  { value: 'deficient', label: 'Deficient', score: 4 },
]

function ratingFromHours(hours: number): RatingLevel {
  if (hours >= 50) return 'exceeds'
  if (hours >= 36) return 'meets'
  if (hours >= 11) return 'minimal'
  return 'deficient'
}

export default function EffortsToImproveStep({ data, onChange, applicationId }: Props) {
  const update = (field: keyof EffortsToImprove, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const currentScore = RATING_OPTIONS.find((r) => r.value === data.overallRating)?.score || 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Efforts to Improve as a Teacher</h3>
        <p className="text-sm text-text-secondary">
          Maximum 10 marks. Current score:{' '}
          <span className="font-semibold text-primary">{currentScore}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-warning-light border border-yellow-200 text-sm text-warning">
          <strong>Note:</strong> Professional development starts as <em>Deficient</em>. Upload evidence in each subsection — criteria-based scoring replaces narrative-only evaluation.
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Teaching Innovation</label>
          <textarea
            value={data.innovations}
            onChange={(e) => update('innovations', e.target.value)}
            placeholder="Describe innovative teaching methods you have adopted..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Pedagogical Improvement
          </label>
          <textarea
            value={data.pedagogicalImprovement}
            onChange={(e) => update('pedagogicalImprovement', e.target.value)}
            placeholder="Describe steps taken to improve pedagogical skills..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Curriculum Development
          </label>
          <textarea
            value={data.curriculumDevelopment}
            onChange={(e) => update('curriculumDevelopment', e.target.value)}
            placeholder="Describe contributions to curriculum development..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Reflective Teaching Practice
          </label>
          <textarea
            value={data.reflectivePractice}
            onChange={(e) => update('reflectivePractice', e.target.value)}
            placeholder="Describe your reflective teaching practices..."
            rows={3}
          />
          <div className="mt-2">
            <FileUpload
              applicationId={applicationId}
              category="reflectiveEssays"
              label="Reflective Practice Artifacts (essays, journals, self-assessments)"
              multiple
              existingFiles={data.reflectiveEssays ?? []}
              onUpload={(files: DocumentFile[]) => update('reflectiveEssays', files)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">CPD Hours Completed</label>
          <input
            type="number"
            min={0}
            value={data.cpdHours}
            onChange={(e) => {
              const cpdHours = Number(e.target.value || 0)
              onChange({
                ...data,
                cpdHours,
                overallRating: ratingFromHours(cpdHours),
              })
            }}
            placeholder="e.g., 42"
          />
          <p className="text-xs text-text-dim mt-1">
            Auto rubric: 50+ = 10, 36-49 = 8, 11-35 = 6, below 11 = 4
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            CPDs Undertaken
          </label>
          <textarea
            value={data.cpdsUndertaken}
            onChange={(e) => update('cpdsUndertaken', e.target.value)}
            placeholder="List continuing professional development activities..."
            rows={3}
          />
          <div className="mt-2">
            <FileUpload
              applicationId={applicationId}
              category="workshopAttendance"
              label="Workshop / Training Attendance Records"
              multiple
              existingFiles={data.workshopAttendance ?? []}
              onUpload={(files: DocumentFile[]) => update('workshopAttendance', files)}
            />
          </div>
        </div>

        <div>
          <FileUpload
            applicationId={applicationId}
            category="trainingCertificates"
            label="Training Certificates and Credentials"
            multiple
            existingFiles={data.trainingCertificates ?? []}
            onUpload={(files: DocumentFile[]) => update('trainingCertificates', files)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Overall Rating</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('overallRating', opt.value)}
                className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${
                  data.overallRating === opt.value
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-border text-text-secondary hover:border-primary-light'
                }`}
              >
                <p>{opt.label}</p>
                <p className="text-xs mt-0.5 opacity-70">{opt.score} marks</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
