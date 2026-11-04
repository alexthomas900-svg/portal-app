import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getMyApplications, createApplication } from '../../services/applications'
import { getApplicationCycles, getNotifications, type WorkflowNotification } from '../../services/workflows'
import StatusBadge from '../shared/StatusBadge'
import {
  formatApplicationTypeLabel,
  formatPromotionLabel,
  type Application,
  type ApplicationCycle,
  type ApplicationType,
  type PromotionType,
} from '../../types'

const defaultDocuments: Record<ApplicationType, { key: string; label: string }[]> = {
  promotion: [
    { key: 'coverLetter', label: 'Cover letter' },
    { key: 'researchStatement', label: 'Research statement' },
    { key: 'phdDegree', label: 'PhD degree' },
    { key: 'phdTranscript', label: 'PhD transcript' },
    { key: 'hecAttestation', label: 'HEC attestation' },
    { key: 'updatedCV', label: 'Updated CV' },
  ],
  contract_renewal: [
    { key: 'coverLetter', label: 'Cover letter' },
    { key: 'updatedCV', label: 'Updated CV' },
  ],
  self_evaluation: [
    { key: 'annualEvalDocs', label: 'Supporting evidence' },
  ],
}

function isComplete(application: Application, key: string): boolean {
  if (key === 'annualEvalDocs') return Boolean(application.annualEvaluation?.supportingDocuments?.length)
  const documents = application.documents ?? {}
  const value = (documents as unknown as Record<string, unknown>)[key]
  return Array.isArray(value) ? value.length > 0 : Boolean(value)
}

function getCompletion(application: Application, requiredDocs: { key: string; label: string }[]): number {
  const sectionChecks = [
    Boolean(application.personalInfo?.fullName && application.personalInfo?.department),
    (application.qualifications?.length ?? 0) > 0,
    (application.experience?.length ?? 0) > 0,
    application.applicationType !== 'promotion' || (application.publications?.length ?? 0) > 0,
    Boolean(application.teachingEffectiveness?.bloomAlignment || application.teachingEffectiveness?.syllabi?.length),
    Boolean(application.effortsToImprove?.cpdsUndertaken || application.effortsToImprove?.trainingCertificates?.length),
    Boolean(application.scholarship?.summary || application.scholarship?.publicationProofs?.length),
    Boolean(application.services?.committees || application.services?.serviceProofs?.length),
    application.applicationType !== 'self_evaluation' || Boolean(application.annualEvaluation?.coursesTaught),
    Boolean(application.declaration),
  ]
  const completed = sectionChecks.filter(Boolean).length + requiredDocs.filter(({ key }) => isComplete(application, key)).length
  return Math.round((completed / (sectionChecks.length + requiredDocs.length)) * 100)
}

export default function FacultyDashboard() {
  const { user, profile } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [cycles, setCycles] = useState<ApplicationCycle[]>([])
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    const loadDashboard = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      const results = await Promise.allSettled([
        getMyApplications(user.uid),
        getApplicationCycles(),
        getNotifications(),
      ])
      if (!active) return
      if (results[0].status === 'fulfilled') setApplications(results[0].value)
      else {
        setApplications([])
        setError(results[0].reason instanceof Error ? results[0].reason.message : 'Failed to load applications.')
      }
      if (results[1].status === 'fulfilled') setCycles(results[1].value)
      if (results[2].status === 'fulfilled') setNotifications(results[2].value.slice(0, 3))
      setLoading(false)
    }
    void loadDashboard()
    return () => { active = false }
  }, [user])

  const stats = {
    total: applications.length,
    drafts: applications.filter((a) => a.status === 'draft').length,
    submitted: applications.filter((a) => a.status !== 'draft').length,
    reviewed: applications.filter((a) => a.status === 'reviewed' || a.status === 'decision_made').length,
  }
  const cards = useMemo(() => [
    { key: 'annual', title: 'Annual Faculty Self-Evaluation', applicationType: 'self_evaluation' as const },
    { key: 'associate', title: 'Promotion to Associate Professor', applicationType: 'promotion' as const, promotionType: 'associate_professor' as const },
    { key: 'professor', title: 'Promotion to Professor', applicationType: 'promotion' as const, promotionType: 'full_professor' as const },
  ], [])
  const matchingApps = (applicationType: ApplicationType, promotionType?: PromotionType) =>
    applications.filter((app) => app.applicationType === applicationType &&
      (applicationType !== 'promotion' || app.promotionType === promotionType))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const matchingCycle = (applicationType: ApplicationType, promotionType?: PromotionType) =>
    cycles.find((cycle) => cycle.applicationType === applicationType &&
      (applicationType !== 'promotion' || cycle.promotionType === promotionType))
  const handleNewApplication = async (
    applicationType: ApplicationType,
    promotionType: PromotionType,
    cycleId: string,
  ) => {
    if (!user || !profile) return
    try {
      const app = await createApplication(user.uid, profile.displayName, profile.email, applicationType, promotionType, cycleId)
      navigate(`/applications/${app.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create an application.')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      {!profile && (
        <div className="mb-4 p-3 rounded-lg bg-warning-light border border-yellow-200 text-warning text-sm">
          Your user profile could not be loaded. Some features may not work.
        </div>
      )}
      {error && <div className="mb-4 p-3 rounded-lg bg-danger-light border border-red-200 text-danger text-sm">{error}</div>}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Welcome, {profile?.displayName?.split(' ')[0]}</h1>
        <p className="text-text-secondary mt-1">Manage your annual self-evaluation and promotion applications.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-primary' },
          { label: 'Drafts', value: stats.drafts, icon: Clock, color: 'text-warning' },
          { label: 'Submitted', value: stats.submitted, icon: CheckCircle2, color: 'text-info' },
          { label: 'Reviewed', value: stats.reviewed, icon: AlertCircle, color: 'text-success' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div><p className="text-2xl font-bold text-text">{stat.value}</p><p className="text-xs text-text-secondary">{stat.label}</p></div>
          </div>
        ))}
      </div>

      {notifications.length > 0 && (
        <section className="card p-4 mb-6" aria-label="Recent notifications">
          <h2 className="text-sm font-semibold text-text mb-2">Recent updates</h2>
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <li key={notification.id} className="text-sm text-text-secondary">{notification.message}</li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="text-lg font-semibold text-text mb-4">Application Portals</h2>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {cards.map((card) => {
          const cycle = matchingCycle(card.applicationType, card.promotionType)
          const latest = matchingApps(card.applicationType, card.promotionType)[0]
          const knownDocumentLabels: Record<string, string> = Object.fromEntries(
            Object.entries({
              coverLetter: 'Cover letter',
              researchStatement: 'Research statement',
              phdDegree: 'PhD degree',
              phdTranscript: 'PhD transcript',
              hecAttestation: 'HEC attestation',
              mastersDegree: 'MPhil/MS degree',
              mastersTranscript: 'MPhil/MS transcript',
              selfEvaluationForm: 'Self-evaluation form',
              chairEvaluation: "Chair's evaluation",
              deanEvaluation: "Dean's evaluation",
              updatedCV: 'Updated CV',
              annualEvalDocs: 'Supporting evidence',
            }),
          )
          const documents = cycle?.requiredDocuments?.length
            ? cycle.requiredDocuments.map((key) => ({
                label: knownDocumentLabels[key] ?? key,
                key,
              }))
            : defaultDocuments[card.applicationType]
          const required = documents.map(({ key, label }) => ({ key, label }))
          const open = Boolean(cycle?.isOpen &&
            Date.now() >= Date.parse(cycle.opensAt) && Date.now() <= Date.parse(cycle.closesAt))
          return (
            <article key={card.key} className="card p-4 flex flex-col">
              <h3 className="font-semibold text-text min-h-12">{card.title}</h3>
              <div className="text-xs text-text-secondary space-y-1 mt-2">
                <p>Opens: {cycle ? new Date(cycle.opensAt).toLocaleDateString() : 'Not scheduled'}</p>
                <p>Closes: {cycle ? new Date(cycle.closesAt).toLocaleDateString() : 'Not scheduled'}</p>
              </div>
              {latest ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between"><span className="text-xs text-text-secondary">Status</span><StatusBadge status={latest.status} /></div>
                  <p className="text-xs text-text-secondary">Reference: {latest.id}</p>
                  <p className="text-xs text-text-secondary">Completion: {getCompletion(latest, required)}%</p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary">Required documents</summary>
                    <ul className="mt-2 space-y-1">
                      {required.map(({ key, label }) => (
                        <li key={key} className={isComplete(latest, key) ? 'text-success' : 'text-text-secondary'}>
                          {isComplete(latest, key) ? '✓' : '○'} {label}
                        </li>
                      ))}
                    </ul>
                  </details>
                  {latest.status === 'draft' ? (
                    <button onClick={() => navigate(`/applications/${latest.id}/edit`)} className="btn-primary btn-sm w-full">Continue Application</button>
                  ) : (
                    <button onClick={() => navigate(`/applications/${latest.id}`)} className="btn-secondary btn-sm w-full">View Submitted Application</button>
                  )}
                  {matchingApps(card.applicationType, card.promotionType).length > 1 && (
                    <p className="text-[11px] text-text-dim">Previous applications: {matchingApps(card.applicationType, card.promotionType).length - 1}</p>
                  )}
                </div>
              ) : (
                <div className="mt-auto pt-4">
                  <p className={`text-xs mb-3 ${open ? 'text-success' : 'text-warning'}`}>
                    {open ? `Open: ${cycle?.academicYear}` : 'Applications are currently closed.'}
                  </p>
                  <button
                    onClick={() => cycle && handleNewApplication(card.applicationType, card.promotionType ?? 'associate_professor', cycle.id)}
                    disabled={!open || !cycle}
                    className="btn-primary btn-sm w-full disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Start Application
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text">Application History</h2>
      </div>
      {applications.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-secondary">No previous applications.</div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text">
                  {app.applicationType === 'promotion' ? `${formatPromotionLabel(app.promotionType)} Promotion` : formatApplicationTypeLabel(app.applicationType)}
                </h3>
                <p className="text-xs text-text-secondary">
                  {app.personalInfo.department || 'Department not set'} · Created {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={app.status} />
                <button onClick={() => navigate(app.status === 'draft' ? `/applications/${app.id}/edit` : `/applications/${app.id}`)} className="btn-secondary btn-sm">
                  {app.status === 'draft' ? 'Continue' : 'View'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
