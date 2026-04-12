import type { TeachingEffectiveness, RatingLevel } from '../../../types'

interface Props {
  data: TeachingEffectiveness
  onChange: (data: TeachingEffectiveness) => void
}

const RATING_OPTIONS: { value: RatingLevel; label: string; score: number }[] = [
  { value: 'exceeds', label: 'Exceeds Expectations', score: 45 },
  { value: 'meets', label: 'Meets Expectations', score: 36 },
  { value: 'minimal', label: 'Minimally Acceptable', score: 27 },
  { value: 'deficient', label: 'Deficient', score: 18 },
]

export default function TeachingStep({ data, onChange }: Props) {
  const update = (field: keyof TeachingEffectiveness, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const currentScore = RATING_OPTIONS.find((r) => r.value === data.overallRating)?.score || 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Teaching Effectiveness</h3>
        <p className="text-sm text-text-secondary">
          Maximum 45 marks. Current score:{' '}
          <span className="font-semibold text-primary">{currentScore}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Fink's Taxonomy Alignment
          </label>
          <textarea
            value={data.finkAlignment}
            onChange={(e) => update('finkAlignment', e.target.value)}
            placeholder="Describe how your teaching aligns with Fink's Taxonomy of Significant Learning..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Higher-Order Thinking Assessments
          </label>
          <textarea
            value={data.higherOrderThinking}
            onChange={(e) => update('higherOrderThinking', e.target.value)}
            placeholder="Describe your assessment strategies that promote higher-order thinking..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Student Rating (out of 5)
            </label>
            <input
              type="number"
              value={data.studentRating}
              onChange={(e) => update('studentRating', Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))}
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
