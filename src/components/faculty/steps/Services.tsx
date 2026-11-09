import type { ServicesData } from '../../../types'

interface Props {
  data: ServicesData
  onChange: (data: ServicesData) => void
}

export default function ServicesStep({ data, onChange }: Props) {
  const update = (field: keyof ServicesData, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Services</h3>
        <p className="text-sm text-text-secondary">Describe your service contributions.</p>
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

      </div>
    </div>
  )
}
