import type { PersonalInfo } from '../../../types'

interface Props {
  data: PersonalInfo
  onChange: (data: PersonalInfo) => void
}

export default function PersonalInfoStep({ data, onChange }: Props) {
  const update = (field: keyof PersonalInfo, value: string) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Personal Information</h3>
        <p className="text-sm text-text-secondary">Basic details about the applicant.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 p-3 rounded-lg bg-surface-alt text-sm text-text-secondary">
          Workflow: <strong className="text-text">{data.applicationType.replace(/_/g, ' ')}</strong>
          {data.applicationType === 'promotion' && (
            <> · Applying for <strong className="text-text">{data.promotionType.replace(/_/g, ' ')}</strong></>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Full Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            placeholder="Dr. Muhammad Ali"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Father's Name</label>
          <input
            type="text"
            value={data.fatherName}
            onChange={(e) => update('fatherName', e.target.value)}
            placeholder="Enter father's name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            CNIC <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={data.cnic}
            onChange={(e) => update('cnic', e.target.value)}
            placeholder="35201-1234567-8"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Email <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@fccollege.edu.pk"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Phone</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+92 300 1234567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Department <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={data.department}
            onChange={(e) => update('department', e.target.value)}
            placeholder="e.g., Computer Science"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Current Designation</label>
          <input
            type="text"
            value={data.currentDesignation}
            onChange={(e) => update('currentDesignation', e.target.value)}
            placeholder="e.g., Assistant Professor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Date of Birth</label>
          <input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => update('dateOfBirth', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Date of Joining</label>
          <input
            type="date"
            value={data.dateOfJoining}
            onChange={(e) => update('dateOfJoining', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
