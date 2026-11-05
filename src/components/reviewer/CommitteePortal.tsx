import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  authorizeCommitteeDecision,
  getCommitteeApplications,
  getCommitteeRecord,
  recordCommitteeDecision,
  type CommitteeApplication,
  type CommitteeRecord,
} from '../../services/workflows'
import { formatApplicationTypeLabel, formatPromotionLabel, type CommitteeDecision } from '../../types'

const decisions: { value: CommitteeDecision; label: string }[] = [
  { value: 'approved', label: 'Approved' },
  { value: 'not_approved', label: 'Not Approved' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'returned_for_information', label: 'Returned for Further Information' },
]

export default function CommitteePortal() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [applications, setApplications] = useState<CommitteeApplication[]>([])
  const [record, setRecord] = useState<CommitteeRecord | null>(null)
  const [decision, setDecision] = useState<CommitteeDecision>('deferred')
  const [justification, setJustification] = useState('')
  const [observations, setObservations] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (id) {
          const item = await getCommitteeRecord(id)
          if (active) {
            setRecord(item)
            if (item.decision) {
              setDecision(item.decision.decision)
              setJustification(item.decision.justification)
              setObservations(item.decision.observations)
              setMeetingDate(item.decision.meetingDate.slice(0, 10))
            }
          }
        } else {
          const items = await getCommitteeApplications()
          if (active) setApplications(items)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load committee records.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id])

  const saveDecision = async (event: FormEvent) => {
    event.preventDefault()
    if (!id) return
    setSaving(true)
    setError('')
    try {
      await recordCommitteeDecision(id, decision, justification, meetingDate, observations)
      setRecord(await getCommitteeRecord(id))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to record committee decision.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  if (!id) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Academic Standards Committee</h1>
          <p className="text-sm text-text-secondary mt-1">Confidential cases awaiting committee consideration.</p>
        </div>
        {error && <p role="alert" className="mb-4 p-3 rounded bg-danger-light text-danger text-sm">{error}</p>}
        {applications.length === 0 ? (
          <div className="card p-10 text-center">
            <ClipboardCheck className="w-10 h-10 text-text-dim mx-auto mb-3" />
            <p className="text-text-secondary">No applications are awaiting committee consideration.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((application) => (
              <button key={application.id} onClick={() => navigate(`/committee/${application.id}`)} className="card w-full p-4 text-left hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-text">{application.applicantName}</p>
                    <p className="text-xs text-text-secondary">
                      {application.applicationType === 'promotion'
                        ? `${formatPromotionLabel(application.promotionType)} Promotion`
                        : formatApplicationTypeLabel(application.applicationType)}
                      {' · '}Reference {application.id}
                    </p>
                  </div>
                  <span className="text-xs text-primary">Open confidential record →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!record) return <div className="text-center py-16 text-text-secondary">Committee record not found.</div>
  const application = record.application
  const typeLabel = application.applicationType === 'promotion'
    ? `${formatPromotionLabel(application.promotionType)} Promotion`
    : formatApplicationTypeLabel(application.applicationType)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <button onClick={() => navigate('/committee')} className="btn-ghost btn-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Committee Portal
      </button>
      <div className="card p-5">
        <h1 className="text-xl font-bold text-text">Confidential Committee Record</h1>
        <p className="text-sm text-text-secondary mt-2">{application.applicantName} · {typeLabel}</p>
        <p className="text-xs text-text-dim">Reference {application.id} · Submitted {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : '—'}</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-text mb-3">Application and Eligibility</h2>
        <p className="text-sm text-text-secondary">Department: {application.personalInfo.department || '—'}</p>
        <p className="text-sm text-text-secondary">Designation: {application.personalInfo.currentDesignation || '—'}</p>
        <p className="text-sm text-text-secondary">Eligibility: {application.eligibilityResult?.status ?? 'Not recorded'}</p>
        {application.evaluationReport && (
          <p className="text-sm text-text-secondary mt-2">
            Automated rubric analysis generated {new Date(application.evaluationReport.generatedAt).toLocaleString()}.
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-text mb-3">Internal Assessments</h2>
        {record.internalReviews.length ? record.internalReviews.map((review, index) => (
          <div key={index} className="border-t border-border py-3">
            <p className="text-sm font-medium text-text">{review.reviewerName}: {review.recommendation.replace(/_/g, ' ')}</p>
            <p className="text-sm text-text-secondary mt-1">{review.overallComments || 'No overall comments recorded.'}</p>
          </div>
        )) : <p className="text-sm text-text-dim">No internal assessments recorded.</p>}
        {application.promotionType === 'full_professor' && (
          <div className="mt-4 border-t border-border pt-3">
            <h3 className="text-sm font-medium text-text">External Assessments</h3>
            {record.externalReviews.length ? record.externalReviews.map((review, index) => (
              <p key={index} className="text-sm text-text-secondary mt-2">
                {review.reviewerName}: {review.overallEvaluation.replace(/_/g, ' ')} · {review.researchProductivity}
              </p>
            )) : <p className="text-sm text-text-dim mt-1">No external assessment recorded.</p>}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-text mb-3">Committee Decision</h2>
        {record.decision?.authorized ? (
          <div className="p-3 rounded bg-success-light text-success text-sm">
            Authorized final decision: {record.decision.decision.replace(/_/g, ' ')}
          </div>
        ) : (
          <form onSubmit={saveDecision} className="space-y-3">
            <label className="block text-sm text-text-secondary">
              Decision
              <select value={decision} onChange={(event) => setDecision(event.target.value as CommitteeDecision)} className="mt-1">
                {decisions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-sm text-text-secondary">
              Written justification (required)
              <textarea value={justification} onChange={(event) => setJustification(event.target.value)} minLength={10} required rows={4} className="mt-1" />
            </label>
            <label className="block text-sm text-text-secondary">
              Meeting date
              <input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required className="mt-1" />
            </label>
            <label className="block text-sm text-text-secondary">
              Committee observations
              <textarea value={observations} onChange={(event) => setObservations(event.target.value)} rows={3} className="mt-1" />
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <button disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving…' : 'Record Committee Decision'}</button>
          </form>
        )}
        {record.decision && !record.decision.authorized && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-warning">Pending separate administrative authorization.</p>
            {role === 'admin' && (
              <button
                onClick={async () => {
                  try {
                    await authorizeCommitteeDecision(application.id)
                    setRecord(await getCommitteeRecord(application.id))
                  } catch (authorizeError) {
                    setError(authorizeError instanceof Error ? authorizeError.message : 'Authorization failed.')
                  }
                }}
                className="btn-primary btn-sm mt-2"
              >
                Authorize and Notify Applicant
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
