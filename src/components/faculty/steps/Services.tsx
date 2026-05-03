import type { ServicesData, RatingLevel, DocumentFile } from '../../../types'
import FileUpload from '../../shared/FileUpload'

interface Props {
  data: ServicesData
  onChange: (data: ServicesData) => void
  applicationId: string
}

const RATING_OPTIONS: { value: RatingLevel; label: string; score: number }[] = [
  { value: 'exceeds', label: 'Exceeds Expectations', score: 20 },
  { value: 'meets', label: 'Meets Expectations', score: 16 },
  { value: 'minimal', label: 'Minimally Acceptable', score: 12 },
  { value: 'deficient', label: 'Deficient', score: 8 },
]

export default function ServicesStep({ data, onChange, applicationId }: Props) {
  const update = (field: keyof ServicesData, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const currentScore = RATING_OPTIONS.find((r) => r.value === data.overallRating)?.score || 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Services</h3>
        <p className="text-sm text-text-secondary">
          Maximum 20 marks. Current score:{' '}
          <span className="font-semibold text-primary">{currentScore}</span>
        </p>
      </div>

      <div className="p-3 rounded-lg bg-warning-light border border-yellow-200 text-sm text-warning">
        <strong>Note:</strong> Service starts as <em>Deficient</em> and is upgraded based on uploaded evidence (committee letters, service proofs).
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Advising</label>
            <textarea
              value={data.advising}
              onChange={(e) => update('advising', e.target.value)}
              placeholder="Describe student advising activities..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Societies</label>
            <textarea
              value={data.societies}
              onChange={(e) => update('societies', e.target.value)}
              placeholder="Professional society memberships and activities..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Committee Memberships
            </label>
            <textarea
              value={data.committees}
              onChange={(e) => update('committees', e.target.value)}
              placeholder="List committee memberships..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Charitable Work</label>
            <textarea
              value={data.charitableWork}
              onChange={(e) => update('charitableWork', e.target.value)}
              placeholder="Describe charitable contributions..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">NGO Involvement</label>
            <textarea
              value={data.ngos}
              onChange={(e) => update('ngos', e.target.value)}
              placeholder="NGO involvement and contributions..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Board Memberships
            </label>
            <textarea
              value={data.boardMemberships}
              onChange={(e) => update('boardMemberships', e.target.value)}
              placeholder="List board memberships..."
              rows={3}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-text mb-1.5">Consulting</label>
            <textarea
              value={data.consulting}
              onChange={(e) => update('consulting', e.target.value)}
              placeholder="Describe consulting activities..."
              rows={3}
            />
          </div>
        </div>

        {/* Section-level evidence uploads */}
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Evidence Documents</p>
          <FileUpload
            applicationId={applicationId}
            category="committeeLetters"
            label="Committee Appointment Letters / Board Memberships"
            multiple
            existingFiles={data.committeeLetters ?? []}
            onUpload={(files: DocumentFile[]) => update('committeeLetters', files)}
          />
          <FileUpload
            applicationId={applicationId}
            category="serviceProofs"
            label="Service Proof Documents (NGO letters, consulting contracts, etc.)"
            multiple
            existingFiles={data.serviceProofs ?? []}
            onUpload={(files: DocumentFile[]) => update('serviceProofs', files)}
          />
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
