import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Application, ApplicationCycle, ApplicationType, PromotionType } from '../../types'
import {
  assignReviewers,
  createApplicationCycle,
  getApplicationCycles,
  getAuditEvents,
  getConflictDeclarations,
  getReviewers,
  sendApplicantNotification,
  updateApplicationCycle,
  type ApplicationAssignment,
  type AuditEvent,
  type ConflictDeclaration,
  type ReviewerAccount,
} from '../../services/workflows'

interface Props {
  applications: Application[]
}

function localDateTime(offsetDays = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

const cycleDocumentDefaults: Record<ApplicationType, string[]> = {
  promotion: [
    'coverLetter', 'researchStatement', 'phdDegree', 'phdTranscript', 'hecAttestation',
    'mastersDegree', 'mastersTranscript', 'selfEvaluationForm', 'chairEvaluation', 'deanEvaluation',
    'courseOutlines', 'assignments', 'teachingSupportDocs', 'abstractsPdf', 'updatedCV',
  ],
  contract_renewal: ['coverLetter', 'updatedCV'],
  self_evaluation: ['annualEvalDocs'],
}

export default function WorkflowManagement({ applications }: Props) {
  const [cycles, setCycles] = useState<ApplicationCycle[]>([])
  const [reviewers, setReviewers] = useState<ReviewerAccount[]>([])
  const [selectedAppId, setSelectedAppId] = useState('')
  const [assignments, setAssignments] = useState<ApplicationAssignment>({
    internalReviewer1Uid: '',
    internalReviewer2Uid: '',
    externalReviewerUid: null,
  })
  const [conflicts, setConflicts] = useState<ConflictDeclaration[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [notificationType, setNotificationType] = useState<'clarification_request' | 'missing_documents' | 'application_update'>('clarification_request')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [cycleType, setCycleType] = useState<ApplicationType>('self_evaluation')
  const [promotionType, setPromotionType] = useState<PromotionType>('associate_professor')
  const [cycleName, setCycleName] = useState('')
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()))
  const [opensAt, setOpensAt] = useState(localDateTime())
  const [closesAt, setClosesAt] = useState(localDateTime(30))
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>(cycleDocumentDefaults.self_evaluation)
  const [error, setError] = useState('')

  const selectedApp = applications.find((application) => application.id === selectedAppId)
  const internalReviewers = useMemo(() => reviewers.filter((reviewer) => reviewer.role === 'internal_reviewer'), [reviewers])
  const externalReviewers = useMemo(() => reviewers.filter((reviewer) => reviewer.role === 'external_reviewer'), [reviewers])

  const loadWorkflows = async () => {
    try {
      const [loadedCycles, loadedReviewers, loadedAudit] = await Promise.all([
        getApplicationCycles(),
        getReviewers(),
        getAuditEvents(),
      ])
      setCycles(loadedCycles)
      setReviewers(loadedReviewers)
      setAuditEvents(loadedAudit)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load workflow settings.')
    }
  }

  useEffect(() => { void loadWorkflows() }, [])

  useEffect(() => {
    const application = applications.find((item) => item.id === selectedAppId)
    const existing = application?.assignments
    setAssignments({
      internalReviewer1Uid: existing?.internalReviewer1Uid ?? '',
      internalReviewer2Uid: existing?.internalReviewer2Uid ?? '',
      externalReviewerUid: existing?.externalReviewerUid ?? null,
    })
    if (selectedAppId) {
      getConflictDeclarations(selectedAppId).then(setConflicts).catch(() => setConflicts([]))
    } else {
      setConflicts([])
    }
  }, [selectedAppId, applications])

  const handleCreateCycle = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await createApplicationCycle({
        name: cycleName,
        applicationType: cycleType,
        ...(cycleType === 'promotion' ? { promotionType } : {}),
        academicYear,
        opensAt: new Date(opensAt).toISOString(),
        closesAt: new Date(closesAt).toISOString(),
        requiredDocuments,
      })
      setCycleName('')
      await loadWorkflows()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create cycle.')
    }
  }

  const handleSaveAssignments = async () => {
    if (!selectedAppId) return
    setError('')
    try {
      await assignReviewers(selectedAppId, assignments)
      setAssignments((current) => ({
        ...current,
        internalReviewer1Status: 'assigned',
        internalReviewer2Status: 'assigned',
        ...(current.externalReviewerUid ? { externalReviewerStatus: 'assigned' as const } : {}),
      }))
      await loadWorkflows()
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Failed to save reviewer assignments.')
    }
  }

  const handleSendNotification = async () => {
    if (!selectedAppId || !notificationMessage.trim()) return
    try {
      await sendApplicantNotification(selectedAppId, notificationType, notificationMessage)
      setNotificationMessage('')
      setError('')
    } catch (notificationError) {
      setError(notificationError instanceof Error ? notificationError.message : 'Failed to send notification.')
    }
  }

  return (
    <section className="space-y-5 mb-8">
      {error && <p role="alert" className="p-3 rounded bg-danger-light text-danger text-sm">{error}</p>}
      <div className="card p-5">
        <h2 className="font-semibold text-text mb-4">Application Cycles</h2>
        <form onSubmit={handleCreateCycle} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-text-secondary">
            Cycle name
            <input value={cycleName} onChange={(event) => setCycleName(event.target.value)} required className="mt-1" placeholder="Annual evaluation 2026" />
          </label>
          <label className="text-sm text-text-secondary">
            Application type
            <select
              value={cycleType}
              onChange={(event) => {
                const type = event.target.value as ApplicationType
                setCycleType(type)
                setRequiredDocuments(cycleDocumentDefaults[type])
              }}
              className="mt-1"
            >
              <option value="self_evaluation">Annual self-evaluation</option>
              <option value="promotion">Promotion</option>
              <option value="contract_renewal">Contract renewal</option>
            </select>
          </label>
          {cycleType === 'promotion' && (
            <label className="text-sm text-text-secondary">
              Promotion level
              <select value={promotionType} onChange={(event) => setPromotionType(event.target.value as PromotionType)} className="mt-1">
                <option value="associate_professor">Associate Professor</option>
                <option value="full_professor">Professor</option>
              </select>
            </label>
          )}
          <label className="text-sm text-text-secondary">
            Academic year
            <input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} required className="mt-1" />
          </label>
          <label className="text-sm text-text-secondary">
            Opens
            <input type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} required className="mt-1" />
          </label>
          <label className="text-sm text-text-secondary">
            Closes
            <input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} required className="mt-1" />
          </label>
          <label className="text-sm text-text-secondary md:col-span-2">
            Required document keys (comma-separated)
            <input value={requiredDocuments.join(', ')} onChange={(event) => setRequiredDocuments(event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} className="mt-1" />
          </label>
          <button type="submit" className="btn-primary btn-sm md:col-span-2">Create Cycle</button>
        </form>
        <div className="divide-y divide-border mt-4">
          {cycles.map((cycle) => (
            <div key={cycle.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">{cycle.name} · {cycle.academicYear}</p>
                <p className="text-xs text-text-secondary">
                  {cycle.applicationType === 'promotion' ? `${cycle.promotionType === 'full_professor' ? 'Professor' : 'Associate Professor'} promotion` : cycle.applicationType.replace(/_/g, ' ')}
                  {' · '}{new Date(cycle.opensAt).toLocaleString()} – {new Date(cycle.closesAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await updateApplicationCycle({ ...cycle, isOpen: !cycle.isOpen })
                    await loadWorkflows()
                  } catch (updateError) {
                    setError(updateError instanceof Error ? updateError.message : 'Failed to update cycle.')
                  }
                }}
                className={cycle.isOpen ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
              >
                {cycle.isOpen ? 'Close Cycle' : 'Open Cycle'}
              </button>
            </div>
          ))}
          {cycles.length === 0 && <p className="py-3 text-sm text-text-dim">No cycles configured.</p>}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-text mb-4">Reviewer Assignment and Conflict Declarations</h2>
        <label className="block text-sm text-text-secondary mb-3">
          Application
          <select value={selectedAppId} onChange={(event) => setSelectedAppId(event.target.value)} className="mt-1">
            <option value="">Select an application</option>
            {applications.filter((application) => application.status !== 'draft').map((application) => (
              <option key={application.id} value={application.id}>
                {application.applicantName} · {application.id}
              </option>
            ))}
          </select>
        </label>
        {selectedApp && (
          <>
            <p className="text-xs text-text-secondary mb-3">
              Progress: Reviewer 1 {assignments.internalReviewer1Status ?? selectedApp.assignments?.internalReviewer1Status ?? 'not assigned'} ·
              Reviewer 2 {assignments.internalReviewer2Status ?? selectedApp.assignments?.internalReviewer2Status ?? 'not assigned'}
              {(assignments.externalReviewerUid || selectedApp.assignments?.externalReviewerUid) &&
                ` · External ${assignments.externalReviewerStatus ?? selectedApp.assignments?.externalReviewerStatus ?? 'assigned'}`}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {[1, 2].map((slot) => (
                <label key={slot} className="text-sm text-text-secondary">
                  Internal Reviewer {slot}
                  <select
                    value={slot === 1 ? assignments.internalReviewer1Uid : assignments.internalReviewer2Uid}
                    onChange={(event) => setAssignments((current) => ({
                      ...current,
                      [slot === 1 ? 'internalReviewer1Uid' : 'internalReviewer2Uid']: event.target.value,
                    }))}
                    className="mt-1"
                  >
                    <option value="">Select reviewer</option>
                    {internalReviewers.map((reviewer) => <option key={reviewer.uid} value={reviewer.uid}>{reviewer.displayName}</option>)}
                  </select>
                </label>
              ))}
              {selectedApp.applicationType === 'promotion' && selectedApp.promotionType === 'full_professor' && (
                <label className="text-sm text-text-secondary">
                  External Reviewer
                  <select value={assignments.externalReviewerUid ?? ''} onChange={(event) => setAssignments((current) => ({ ...current, externalReviewerUid: event.target.value || null }))} className="mt-1">
                    <option value="">None selected</option>
                    {externalReviewers.map((reviewer) => <option key={reviewer.uid} value={reviewer.uid}>{reviewer.displayName}</option>)}
                  </select>
                </label>
              )}
            </div>
            <button onClick={handleSaveAssignments} className="btn-primary btn-sm mt-4">Save Assignments</button>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-text">Conflict declarations</h3>
              {conflicts.length === 0 ? <p className="text-xs text-text-dim mt-1">No conflicts declared.</p> : (
                <ul className="mt-2 space-y-2">
                  {conflicts.map((conflict) => <li key={conflict.id} className="text-xs text-warning">{conflict.id}: {conflict.explanation}</li>)}
                </ul>
              )}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-text mb-2">Applicant communication</h3>
              <select value={notificationType} onChange={(event) => setNotificationType(event.target.value as typeof notificationType)} className="mb-2">
                <option value="clarification_request">Request clarification</option>
                <option value="missing_documents">Request missing documents</option>
                <option value="application_update">Application update</option>
              </select>
              <textarea value={notificationMessage} onChange={(event) => setNotificationMessage(event.target.value)} maxLength={1000} rows={2} placeholder="Message to applicant (no reviewer details or scores)" />
              <button onClick={handleSendNotification} disabled={!notificationMessage.trim()} className="btn-secondary btn-sm mt-2">Send Applicant Notification</button>
            </div>
          </>
        )}
      </div>
      <div className="card p-5">
        <h2 className="font-semibold text-text mb-3">Recent Audit Activity</h2>
        <ul className="divide-y divide-border">
          {auditEvents.slice(0, 20).map((event) => {
            const timestamp = typeof event.createdAt === 'string'
              ? event.createdAt
              : (event.createdAt.seconds ?? event.createdAt._seconds ?? 0) * 1000
            return (
              <li key={event.id} className="py-2 text-xs text-text-secondary">
                {new Date(timestamp).toLocaleString()} · {event.action} · {event.applicationId ?? '—'} · {event.actorUid}
              </li>
            )
          })}
          {auditEvents.length === 0 && <li className="py-2 text-xs text-text-dim">No audit activity recorded.</li>}
        </ul>
      </div>
    </section>
  )
}
