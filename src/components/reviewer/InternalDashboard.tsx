import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Eye } from 'lucide-react'
import { getSubmittedApplications } from '../../services/applications'
import StatusBadge from '../shared/StatusBadge'
import { marksTotal } from './ReviewerMarking'
import { getMyInternalReview } from '../../services/reviews'
import { useAuth } from '../../contexts/AuthContext'
import { checkEligibility } from '../../utils/eligibility'
import { formatApplicationTypeLabel, formatPromotionLabel, type Application } from '../../types'

export default function InternalDashboard() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [totals, setTotals] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const loadApplications = async () => {
      try {
        const apps = await getSubmittedApplications()
        if (active) setApplications(apps)
        const reviews = await Promise.all(apps.map((app) => getMyInternalReview(app.id, user?.uid ?? '').catch(() => null)))
        if (active) setTotals(Object.fromEntries(apps.map((app, index) => [app.id, marksTotal(reviews[index]?.sectionMarks)])))
      } catch (err) {
        console.error('Failed to load internal reviewer applications:', err)
        if (active) {
          setApplications([])
          setError(err instanceof Error ? err.message : 'Failed to load applications.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadApplications()

    return () => {
      active = false
    }
  }, [user?.uid])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light border border-red-200 text-danger text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Internal Reviewer Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Review submitted promotion, contract renewal and self-evaluation applications.
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
                    {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={checkEligibility(app).status} />
                  <span className="text-sm font-semibold text-primary">
                    {totals[app.id] === undefined || totals[app.id] === null ? 'Not marked' : `${totals[app.id]}/100`}
                  </span>
                  <button className="btn-secondary btn-sm">
                    <Eye className="w-3.5 h-3.5" />
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
