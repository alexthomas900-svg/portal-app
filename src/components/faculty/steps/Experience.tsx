import { Plus, Trash2 } from 'lucide-react'
import type { ExperienceEntry } from '../../../types'

interface Props {
  data: ExperienceEntry[]
  onChange: (data: ExperienceEntry[]) => void
}

export default function ExperienceStep({ data, onChange }: Props) {
  const addEntry = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        institution: '',
        designation: '',
        from: '',
        to: '',
        isCurrent: false,
        type: 'teaching',
      },
    ])
  }

  const updateItem = (index: number, field: keyof ExperienceEntry, value: unknown) => {
    const updated = data.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    onChange(updated)
  }

  const removeItem = (index: number) => {
    onChange(data.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Experience</h3>
        <p className="text-sm text-text-secondary">
          Add all teaching, research, and professional experience entries.
        </p>
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <p className="text-sm text-text-secondary mb-3">No experience added yet.</p>
          <button type="button" onClick={addEntry} className="btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" />
            Add Experience
          </button>
        </div>
      )}

      {data.map((entry, index) => (
        <div key={entry.id} className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-text">Experience {index + 1}</h4>
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
              <label className="block text-sm font-medium text-text mb-1.5">Institution</label>
              <input
                type="text"
                value={entry.institution}
                onChange={(e) => updateItem(index, 'institution', e.target.value)}
                placeholder="University / Organization"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Designation</label>
              <input
                type="text"
                value={entry.designation}
                onChange={(e) => updateItem(index, 'designation', e.target.value)}
                placeholder="e.g., Assistant Professor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Type</label>
              <select
                value={entry.type}
                onChange={(e) => updateItem(index, 'type', e.target.value)}
              >
                <option value="teaching">Teaching</option>
                <option value="research">Research</option>
                <option value="industry">Industry</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id={`current-${entry.id}`}
                checked={entry.isCurrent}
                onChange={(e) => updateItem(index, 'isCurrent', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor={`current-${entry.id}`} className="text-sm text-text">
                Currently working here
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">From</label>
              <input
                type="date"
                value={entry.from}
                onChange={(e) => updateItem(index, 'from', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">To</label>
              <input
                type="date"
                value={entry.to}
                onChange={(e) => updateItem(index, 'to', e.target.value)}
                disabled={entry.isCurrent}
              />
            </div>
          </div>
        </div>
      ))}

      {data.length > 0 && (
        <button type="button" onClick={addEntry} className="btn-secondary w-full">
          <Plus className="w-4 h-4" />
          Add Another Experience
        </button>
      )}
    </div>
  )
}
