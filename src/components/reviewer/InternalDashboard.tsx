import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Eye } from 'lucide-react'
import { getSubmittedApplications } from '../../services/applications'
import StatusBadge from '../shared/StatusBadge'
import { formatApplicationTypeLabel, formatPromotionLabel, type Application } from '../../types'

export default function InternalDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getSubmittedApplications().then((apps) => {
      setApplications(apps.filter((app) => app.applicationType !== 'self_evaluation'))
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Internal Reviewer Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Review submitted promotion and contract renewal applications.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-2xl font-bold text-text">{applications.length}</p>
          <p className="text-xs text-text-secondary">Total Applications</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-warning">
            {applications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length}
          </p>
          <p className="text-xs text-text-secondary">Pending Review</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-success">
            {applications.filter((a) => a.status === 'reviewed' || a.status === 'decision_made').length}
          </p>
          <p className="text-xs text-text-secondary">Reviewed</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">No submitted applications</h3>
          <p className="text-text-secondary">Applications will appear here once faculty submit them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="card p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/review/applications/${app.id}`)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text">{app.applicantName}</h3>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-text-secondary">
                    {app.applicationType === 'promotion'
                      ? `${formatPromotionLabel(app.promotionType)} Promotion`
                      : formatApplicationTypeLabel(app.applicationType)}
                    {' · '}{app.personalInfo.department} ·{' '}
                    {app.submittedAt?.toDate?.()?.toLocaleDateString() || '—'}
                  </p>
                </div>
                <button className="btn-secondary btn-sm shrink-0">
                  <Eye className="w-3.5 h-3.5" />
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
