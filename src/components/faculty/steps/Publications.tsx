import { Plus, Trash2 } from 'lucide-react'
import type { Publication, JournalIndexing, JournalQuartile } from '../../../types'
import { generateAPA } from '../../../utils/apa'

interface Props {
  data: Publication[]
  onChange: (data: Publication[]) => void
}

const INDEXING_OPTIONS: JournalIndexing[] = ['HEC', 'Scopus', 'WoS', 'DOAJ', 'CNKI', 'Other']
const QUARTILE_OPTIONS: JournalQuartile[] = ['Q1', 'Q2', 'Q3', 'Unranked']
const AUTHOR_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function PublicationsStep({ data, onChange }: Props) {
  const addPublication = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        journalName: '',
        year: new Date().getFullYear(),
        volume: '',
        issue: '',
        articleTitle: '',
        numberOfAuthors: 1,
        authorNames: [''],
        indexing: 'HEC',
        recognized: true,
        quartile: 'Unranked',
        apaReference: '',
      },
    ])
  }

  const updateItem = (index: number, field: keyof Publication, value: unknown) => {
    const updated = data.map((p, i) => {
      if (i !== index) return p
      const next = { ...p, [field]: value }

      // Auto-recognize based on indexing
      if (field === 'indexing') {
        next.recognized = value !== 'Other'
      }

      // Update author names array when count changes
      if (field === 'numberOfAuthors') {
        const count = value as number
        const names = [...next.authorNames]
        while (names.length < count) names.push('')
        next.authorNames = names.slice(0, count)
      }

      // Auto-generate APA
      next.apaReference = generateAPA(next)
      return next
    })
    onChange(updated)
  }

  const updateAuthorName = (pubIndex: number, authorIndex: number, name: string) => {
    const updated = data.map((p, i) => {
      if (i !== pubIndex) return p
      const names = [...p.authorNames]
      names[authorIndex] = name
      const next = { ...p, authorNames: names }
      next.apaReference = generateAPA(next)
      return next
    })
    onChange(updated)
  }

  const removeItem = (index: number) => {
    onChange(data.filter((_, i) => i !== index))
  }

  const recognizedCount = data.filter((p) => p.recognized).length

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Publications</h3>
        <p className="text-sm text-text-secondary">
          Add all journal publications. Recognized publications:{' '}
          <span className="font-semibold text-primary">{recognizedCount}</span>
        </p>
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <p className="text-sm text-text-secondary mb-3">No publications added yet.</p>
          <button type="button" onClick={addPublication} className="btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" />
            Add Publication
          </button>
        </div>
      )}

      {data.map((pub, index) => (
        <div key={pub.id} className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-text">Publication {index + 1}</h4>
              {pub.recognized ? (
                <span className="badge-success">Recognized</span>
              ) : (
                <span className="badge-danger">Unrecognized</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-1.5 rounded hover:bg-danger-light text-text-dim hover:text-danger"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Article Title</label>
              <input
                type="text"
                value={pub.articleTitle}
                onChange={(e) => updateItem(index, 'articleTitle', e.target.value)}
                placeholder="Title of the article"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Journal Name</label>
              <input
                type="text"
                value={pub.journalName}
                onChange={(e) => updateItem(index, 'journalName', e.target.value)}
                placeholder="Name of the journal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Year</label>
              <input
                type="number"
                value={pub.year}
                onChange={(e) => updateItem(index, 'year', parseInt(e.target.value) || 0)}
                min={1980}
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Volume</label>
              <input
                type="text"
                value={pub.volume}
                onChange={(e) => updateItem(index, 'volume', e.target.value)}
                placeholder="e.g., 12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Issue</label>
              <input
                type="text"
                value={pub.issue}
                onChange={(e) => updateItem(index, 'issue', e.target.value)}
                placeholder="e.g., 3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Indexing</label>
              <select
                value={pub.indexing}
                onChange={(e) => updateItem(index, 'indexing', e.target.value as JournalIndexing)}
              >
                {INDEXING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Quartile</label>
              <select
                value={pub.quartile}
                onChange={(e) => updateItem(index, 'quartile', e.target.value as JournalQuartile)}
              >
                {QUARTILE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Q1'
                      ? 'Q1 (W) — SCIE, SSCI, AHCI'
                      : opt === 'Q2'
                        ? 'Q2 (X) — ESCI, Scopus, OJS'
                        : opt === 'Q3'
                          ? 'Q3 (Y) — HEC, MEDLINE, CNKI, DOAJ'
                          : 'Unranked'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Number of Authors</label>
              <select
                value={pub.numberOfAuthors}
                onChange={(e) =>
                  updateItem(index, 'numberOfAuthors', parseInt(e.target.value))
                }
              >
                {AUTHOR_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Author names */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Author Names</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pub.authorNames.map((name, ai) => (
                <input
                  key={ai}
                  type="text"
                  value={name}
                  onChange={(e) => updateAuthorName(index, ai, e.target.value)}
                  placeholder={`Author ${ai + 1}`}
                />
              ))}
            </div>
          </div>

          {/* APA Reference */}
          {pub.apaReference && (
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-100">
              <p className="text-xs font-medium text-primary mb-1">APA 7 Reference</p>
              <p className="text-sm text-text italic">{pub.apaReference}</p>
            </div>
          )}
        </div>
      ))}

      {data.length > 0 && (
        <button type="button" onClick={addPublication} className="btn-secondary w-full">
          <Plus className="w-4 h-4" />
          Add Another Publication
        </button>
      )}
    </div>
  )
}
