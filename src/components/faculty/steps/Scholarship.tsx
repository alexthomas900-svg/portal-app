import type { ScholarshipData } from '../../../types'

interface Props {
  data: ScholarshipData
  onChange: (data: ScholarshipData) => void
}

export default function ScholarshipStep({ data, onChange }: Props) {
  const update = (field: keyof ScholarshipData, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Scholarship</h3>
        <p className="text-sm text-text-secondary">Describe your scholarly activity. Ratings and evidence review are confidential.</p>
      </div>

      <div className="p-3 rounded-lg bg-warning-light border border-yellow-200 text-sm text-warning">
        <strong>Note:</strong> Describe your research and scholarly contributions, including publications, conference presentations, grants, editorial work, awards, and student supervision. Add publications in the Publications section and upload supporting evidence in Document Upload. Ratings and evidence assessments are confidential.
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

      </div>
    </div>
  )
}
