import { Plus, Trash2 } from 'lucide-react'
import type { Qualification } from '../../../types'

interface Props {
  data: Qualification[]
  onChange: (data: Qualification[]) => void
}

export default function QualificationsStep({ data, onChange }: Props) {
  const addQualification = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        degree: '',
        field: '',
        institution: '',
        country: '',
        year: new Date().getFullYear(),
        hec_attested: false,
      },
    ])
  }

  const updateItem = (index: number, field: keyof Qualification, value: unknown) => {
    const updated = data.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    onChange(updated)
  }

  const removeItem = (index: number) => {
    onChange(data.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Qualifications</h3>
        <p className="text-sm text-text-secondary">
          Add all academic qualifications starting with the highest degree.
        </p>
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <p className="text-sm text-text-secondary mb-3">No qualifications added yet.</p>
          <button type="button" onClick={addQualification} className="btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" />
            Add Qualification
          </button>
        </div>
      )}

      {data.map((q, index) => (
        <div key={q.id} className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-text">Qualification {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-1.5 rounded hover:bg-danger-light text-text-dim hover:text-danger"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Degree</label>
              <select value={q.degree} onChange={(e) => updateItem(index, 'degree', e.target.value)}>
                <option value="">Select degree</option>
                <option value="PhD">PhD</option>
                <option value="MPhil">MPhil / MS</option>
                <option value="Masters">Masters (International)</option>
                <option value="Bachelors">Bachelors</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Field of Study</label>
              <input
                type="text"
                value={q.field}
                onChange={(e) => updateItem(index, 'field', e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Institution</label>
              <input
                type="text"
                value={q.institution}
                onChange={(e) => updateItem(index, 'institution', e.target.value)}
                placeholder="University name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Country</label>
              <input
                type="text"
                value={q.country}
                onChange={(e) => updateItem(index, 'country', e.target.value)}
                placeholder="e.g., Pakistan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Year of Completion</label>
              <input
                type="number"
                value={q.year}
                onChange={(e) => updateItem(index, 'year', parseInt(e.target.value) || 0)}
                min={1960}
                max={new Date().getFullYear()}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id={`hec-${q.id}`}
                checked={q.hec_attested}
                onChange={(e) => updateItem(index, 'hec_attested', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor={`hec-${q.id}`} className="text-sm text-text">
                HEC Attested
              </label>
            </div>
          </div>
        </div>
      ))}

      {data.length > 0 && (
        <button type="button" onClick={addQualification} className="btn-secondary w-full">
          <Plus className="w-4 h-4" />
          Add Another Qualification
        </button>
      )}
    </div>
  )
}
