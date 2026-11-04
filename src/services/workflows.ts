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

export interface ApplicationAssignment {
  internalReviewer1Uid: string
  internalReviewer2Uid: string
  externalReviewerUid: string | null
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
  decision: null | {
    decision: CommitteeDecision
    justification: string
    meetingDate: string
    observations: string
    authorized: boolean
  }
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
