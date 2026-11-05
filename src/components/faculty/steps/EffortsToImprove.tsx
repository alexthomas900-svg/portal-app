import type { EffortsToImprove } from '../../../types'

interface Props {
  data: EffortsToImprove
  onChange: (data: EffortsToImprove) => void
}

export default function EffortsToImproveStep({ data, onChange }: Props) {
  const update = (field: keyof EffortsToImprove, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Efforts to Improve as a Teacher</h3>
        <p className="text-sm text-text-secondary">Describe your professional development activities and CPD hours.</p>
      </div>

      <div className="space-y-4">
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
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">CPD Hours Completed</label>
          <input
            type="number"
            min={0}
            value={data.cpdHours}
            onChange={(e) => update('cpdHours', Number(e.target.value || 0))}
            placeholder="e.g., 42"
          />
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
        </div>
      </div>
    </div>
  )
}
