import type { ScholarshipData, RatingLevel } from '../../../types'

interface Props {
  data: ScholarshipData
  onChange: (data: ScholarshipData) => void
}

const RATING_OPTIONS: { value: RatingLevel; label: string; score: number }[] = [
  { value: 'exceeds', label: 'Excellent', score: 25 },
  { value: 'meets', label: 'Meets Expectations', score: 20 },
  { value: 'minimal', label: 'Minimally Acceptable', score: 15 },
  { value: 'deficient', label: 'Deficient', score: 10 },
]

export default function ScholarshipStep({ data, onChange }: Props) {
  const update = (field: keyof ScholarshipData, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const currentScore = RATING_OPTIONS.find((r) => r.value === data.overallRating)?.score || 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Scholarship</h3>
        <p className="text-sm text-text-secondary">
          Maximum 25 marks. Current score:{' '}
          <span className="font-semibold text-primary">{currentScore}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Summary</label>
          <textarea
            value={data.summary}
            onChange={(e) => update('summary', e.target.value)}
            placeholder="Provide a summary of your scholarly contributions..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Grants</label>
            <textarea
              value={data.grants}
              onChange={(e) => update('grants', e.target.value)}
              placeholder="List research grants received..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Conferences</label>
            <textarea
              value={data.conferences}
              onChange={(e) => update('conferences', e.target.value)}
              placeholder="List conference presentations..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Editorial Work</label>
            <textarea
              value={data.editorialWork}
              onChange={(e) => update('editorialWork', e.target.value)}
              placeholder="Describe editorial and reviewing work..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Awards</label>
            <textarea
              value={data.awards}
              onChange={(e) => update('awards', e.target.value)}
              placeholder="List academic awards and recognitions..."
              rows={3}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-text mb-1.5">
              Supervision (MS/PhD students)
            </label>
            <textarea
              value={data.supervision}
              onChange={(e) => update('supervision', e.target.value)}
              placeholder="List supervision of research students..."
              rows={3}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Chair Rating (out of 5)
            </label>
            <input
              type="number"
              value={data.chairRating}
              onChange={(e) => update('chairRating', Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))}
              min={0}
              max={5}
              step={0.1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Dean Rating (out of 5)
            </label>
            <input
              type="number"
              value={data.deanRating}
              onChange={(e) => update('deanRating', Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))}
              min={0}
              max={5}
              step={0.1}
            />
          </div>
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
