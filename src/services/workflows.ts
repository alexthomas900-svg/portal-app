import { apiGet, apiPost, apiPut } from '../lib/api'
import type { ApplicationCycle, Application, CommitteeDecision, PromotionType } from '../types'

export interface ReviewerAccount {
  uid: string
  displayName: string
  email: string
  role: 'internal_reviewer' | 'external_reviewer'
}

export interface WorkflowNotification {
  id: string
  type: string
  message: string
  applicationId?: string
  createdAt: string
  read: boolean
}

export interface AuditEvent {
  id: string
  actorUid: string
  action: string
  applicationId?: string
  createdAt: string | { seconds?: number; _seconds?: number }
  details: Record<string, unknown>
}

export interface ApplicationAssignment {
  internalReviewer1Uid: string
  internalReviewer2Uid: string
  externalReviewerUid: string | null
  internalReviewer1Status?: 'assigned' | 'in_progress' | 'submitted'
  internalReviewer2Status?: 'assigned' | 'in_progress' | 'submitted'
  externalReviewerStatus?: 'assigned' | 'in_progress' | 'submitted'
}

export interface CommitteeApplication {
  id: string
  applicantName: string
  applicationType: Application['applicationType']
  promotionType: PromotionType
  status: Application['status']
  submittedAt?: string
}

export interface CommitteeRecord {
  application: Application
  internalReviews: {
    reviewerName: string
    overallComments: string
    recommendation: string
  }[]
  externalReviews: {
    reviewerName: string
    researchProductivity: string
    overallEvaluation: string
  }[]
  decision: null | {
    decision: CommitteeDecision
    justification: string
    meetingDate: string
    observations: string
    authorized: boolean
  }
}

export interface ConflictDeclaration {
  id: string
  explanation: string
  declaredAt: string
  resolved: boolean
}

export function getApplicationCycles(): Promise<ApplicationCycle[]> {
  return apiGet('/api/workflows/cycles')
}

export function createApplicationCycle(cycle: Omit<ApplicationCycle, 'id' | 'createdAt' | 'updatedAt' | 'isOpen'>): Promise<ApplicationCycle> {
  return apiPost('/api/workflows/cycles', cycle)
}

export function updateApplicationCycle(cycle: ApplicationCycle): Promise<{ success: boolean }> {
  return apiPut(`/api/workflows/cycles/${cycle.id}`, cycle)
}

export function getReviewers(): Promise<ReviewerAccount[]> {
  return apiGet('/api/workflows/reviewers')
}

export function assignReviewers(applicationId: string, assignments: ApplicationAssignment): Promise<{ assignments: ApplicationAssignment }> {
  return apiPut(`/api/workflows/applications/${applicationId}/assignments`, assignments)
}

export function getConflictDeclarations(applicationId: string): Promise<ConflictDeclaration[]> {
  return apiGet(`/api/workflows/applications/${applicationId}/conflicts`)
}

export function declareConflict(applicationId: string, explanation: string): Promise<{ success: boolean }> {
  return apiPost(`/api/workflows/applications/${applicationId}/conflicts`, { explanation })
}

export function getCommitteeApplications(): Promise<CommitteeApplication[]> {
  return apiGet('/api/workflows/committee/applications')
}

export function getCommitteeRecord(applicationId: string): Promise<CommitteeRecord> {
  return apiGet(`/api/workflows/applications/${applicationId}/committee`)
}

export function recordCommitteeDecision(
  applicationId: string,
  decision: CommitteeDecision,
  justification: string,
  meetingDate: string,
  observations: string,
): Promise<unknown> {
  return apiPost(`/api/workflows/applications/${applicationId}/committee-decision`, {
    decision,
    justification,
    meetingDate,
    observations,
  })
}

export function authorizeCommitteeDecision(applicationId: string): Promise<{ success: boolean }> {
  return apiPost(`/api/workflows/applications/${applicationId}/committee-decision/authorize`, {})
}

export function getNotifications(): Promise<WorkflowNotification[]> {
  return apiGet('/api/workflows/notifications')
}

export function recordDocumentUpload(applicationId: string, category: string, fileName: string): Promise<{ success: boolean }> {
  return apiPost('/api/workflows/documents/audit', { applicationId, category, fileName })
}

export function sendApplicantNotification(
  applicationId: string,
  type: 'clarification_request' | 'missing_documents' | 'application_update',
  message: string,
): Promise<{ success: boolean }> {
  return apiPost(`/api/workflows/applications/${applicationId}/notifications`, { type, message })
}

export function getAuditEvents(): Promise<AuditEvent[]> {
  return apiGet('/api/workflows/audit')
}
