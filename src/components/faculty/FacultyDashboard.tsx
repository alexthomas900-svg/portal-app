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
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const loadApplications = async () => {
      if (!user) {
        if (active) setLoading(false)
        return
      }

      try {
        const apps = await getMyApplications(user.uid)
        if (active) setApplications(apps)
      } catch (err) {
        console.error('Failed to load faculty applications:', err)
        if (active) {
          setApplications([])
          setError(err instanceof Error ? err.message : 'Failed to load applications. Check browser console for details.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadApplications()

    return () => {
      active = false
    }
  }, [user])

  const handleNewApplication = async (
    applicationType: Application['applicationType'],
    promotionType: Application['promotionType'] = 'associate_professor',
  ) => {
    if (!user || !profile) return
    const app = await createApplication(user.uid, profile.displayName, profile.email, applicationType, promotionType)
    navigate(`/applications/${app.id}/edit`)
  }

  const cards: {
    key: string
    title: string
    purpose: string
    applicationType: Application['applicationType']
    promotionType: Application['promotionType']
  }[] = [
    {
      key: 'annual',
      title: 'Annual Faculty Self-Evaluation',
      purpose: 'Annual reporting of teaching, research, professional development, scholarship and institutional contributions.',
      applicationType: 'self_evaluation',
      promotionType: 'associate_professor',
    },
    {
      key: 'associate',
      title: 'Promotion to Associate Professor',
      purpose: "Application for promotion from your current designation to Associate Professor.",
      applicationType: 'promotion',
      promotionType: 'associate_professor',
    },
    {
      key: 'professor',
      title: 'Promotion to Professor',
      purpose: 'Application for promotion to Professor.',
      applicationType: 'promotion',
      promotionType: 'full_professor',
    },
  ]

  const appsForCard = (c: (typeof cards)[number]) =>
    applications
      .filter(
        (a) =>
          a.applicationType === c.applicationType &&
          (c.applicationType !== 'promotion' || a.promotionType === c.promotionType),
      )
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

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
      {/* Profile warning */}
      {!profile && (
        <div className="mb-4 p-3 rounded-lg bg-warning-light border border-yellow-200 text-warning text-sm">
          <strong>Warning:</strong> Your user profile could not be loaded from Firestore. Some features may not work.
          Check that Firestore is enabled in your Firebase project and that security rules are deployed.
        </div>
      )}

      {/* Data load error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light border border-red-200 text-danger text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">
          Welcome, {profile?.displayName?.split(' ')[0]}
        </h1>
        <p className="text-text-secondary mt-1">
          Manage your annual self-evaluation and promotion applications.
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

      {/* Application cards */}
      <h2 className="text-lg font-semibold text-text mb-4">My Applications</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => {
          const history = appsForCard(c)
          const current = history[0]
          const isDraft = current?.status === 'draft'
          return (
            <div key={c.key} className="card p-5 flex flex-col">
              <h3 className="text-base font-semibold text-text mb-1">{c.title}</h3>
              <p className="text-xs text-text-secondary mb-4">{c.purpose}</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-text-secondary">Status:</span>
                {current ? <StatusBadge status={current.status} /> : <span className="text-xs text-text-dim">Not started</span>}
              </div>
              <p className="text-xs text-text-secondary mb-1">
                Reference: {current ? current.id.slice(0, 8).toUpperCase() : '—'}
              </p>
              <p className="text-xs text-text-secondary mb-4">Previous applications: {Math.max(history.length - 1, 0)}</p>
              <div className="mt-auto flex gap-2 flex-wrap">
                {(!current || (!isDraft && current.status === 'decision_made')) && (
                  <button onClick={() => handleNewApplication(c.applicationType, c.promotionType)} className="btn-primary btn-sm">
                    <Plus className="w-4 h-4" />
                    Start Application
                  </button>
                )}
                {isDraft && (
                  <button onClick={() => navigate(`/applications/${current.id}/edit`)} className="btn-primary btn-sm">
                    Continue Application
                  </button>
                )}
                {current && !isDraft && (
                  <button onClick={() => navigate(`/applications/${current.id}`)} className="btn-secondary btn-sm">
                    View Submitted Application
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="text-lg font-semibold text-text mb-4">Application History</h2>

      {/* Applications list */}
      {applications.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">No applications yet</h3>
          <p className="text-text-secondary mb-6">
            Start one of the applications above.
          </p>
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
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
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
