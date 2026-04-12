import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getMyApplications, createApplication } from '../../services/applications'
import StatusBadge from '../shared/StatusBadge'
import { formatApplicationTypeLabel, formatPromotionLabel, type Application } from '../../types'

export default function FacultyDashboard() {
  const { user, profile } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      getMyApplications(user.uid).then((apps) => {
        setApplications(apps)
        setLoading(false)
      })
    }
  }, [user])

  const handleNewApplication = async (applicationType: Application['applicationType']) => {
    if (!user || !profile) return
    const app = await createApplication(user.uid, profile.displayName, profile.email, applicationType)
    navigate(`/applications/${app.id}/edit`)
  }

  const stats = {
    total: applications.length,
    drafts: applications.filter((a) => a.status === 'draft').length,
    submitted: applications.filter((a) => a.status !== 'draft').length,
    reviewed: applications.filter((a) => a.status === 'reviewed' || a.status === 'decision_made').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">
          Welcome, {profile?.displayName?.split(' ')[0]}
        </h1>
        <p className="text-text-secondary mt-1">
          Manage your promotion, contract renewal, and self-evaluation workflows.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-primary' },
          { label: 'Drafts', value: stats.drafts, icon: Clock, color: 'text-warning' },
          { label: 'Submitted', value: stats.submitted, icon: CheckCircle2, color: 'text-info' },
          { label: 'Reviewed', value: stats.reviewed, icon: AlertCircle, color: 'text-success' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
                <p className="text-xs text-text-secondary">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text">My Applications</h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => handleNewApplication('promotion')} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            New Promotion
          </button>
          <button onClick={() => handleNewApplication('contract_renewal')} className="btn-secondary btn-sm">
            <Plus className="w-4 h-4" />
            Contract Renewal
          </button>
          <button onClick={() => handleNewApplication('self_evaluation')} className="btn-secondary btn-sm">
            <Plus className="w-4 h-4" />
            Self-Evaluation
          </button>
        </div>
      </div>

      {/* Applications list */}
      {applications.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">No applications yet</h3>
          <p className="text-text-secondary mb-6">
            Start by creating a promotion, contract renewal, or self-evaluation application.
          </p>
          <button onClick={() => handleNewApplication('promotion')} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Promotion Application
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() =>
                app.status === 'draft'
                  ? navigate(`/applications/${app.id}/edit`)
                  : navigate(`/applications/${app.id}`)
              }
              className="card p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text truncate">
                      {app.applicationType === 'promotion'
                        ? `${formatPromotionLabel(app.promotionType)} Promotion`
                        : formatApplicationTypeLabel(app.applicationType)}
                    </h3>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-text-secondary">
                    {app.personalInfo.department || 'Department not set'} · Created{' '}
                    {app.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
                  </p>
                </div>
                <div className="text-text-dim">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
