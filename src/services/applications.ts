import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import type { Application, EvaluationReport, Publication, ReviewerComment } from '../types'

export async function saveApplication(application: Application): Promise<void> {
  await apiPut(`/api/applications/${application.id}`, application)
}

export async function createApplication(
  applicationType: Application['applicationType'] = 'promotion',
  promotionType: Application['promotionType'] = 'associate_professor',
  cycleId?: string,
): Promise<Application> {
  return apiPost('/api/applications', { applicationType, promotionType, cycleId })
}

export async function getApplication(id: string): Promise<Application | null> {
  return apiGet<Application>(`/api/applications/${id}`)
}

export async function getMyApplications(_uid: string): Promise<Application[]> {
  return apiGet<Application[]>('/api/applications/mine')
}

export async function getAllApplications(): Promise<Application[]> {
  return apiGet<Application[]>('/api/applications/all')
}

export async function getSubmittedApplications(): Promise<Application[]> {
  return apiGet<Application[]>('/api/applications/submitted')
}

export async function submitApplication(id: string): Promise<void> {
  await apiPost(`/api/applications/${id}/submit`, {})
}

export async function updateApplicationStatus(id: string, status: Application['status']): Promise<void> {
  await apiPut(`/api/applications/${id}/status`, { status })
}

export async function deleteApplication(id: string): Promise<void> {
  await apiDelete(`/api/applications/${id}`)
}

export async function verifyAllPublications(applicationId: string): Promise<Publication[]> {
  const result = await apiPost<{ publications: Publication[] }>(`/api/applications/${applicationId}/publications/verify-all`, {})
  return result.publications
}

export async function runEvaluation(applicationId: string): Promise<EvaluationReport> {
  return apiPost<EvaluationReport>(`/api/applications/${applicationId}/evaluate`, {})
}

export async function getReviewerReport(applicationId: string): Promise<EvaluationReport | null> {
  return apiGet<EvaluationReport | null>(`/api/applications/${applicationId}/reviewer-report`)
}

export async function getReviewerComments(applicationId: string): Promise<ReviewerComment[]> {
  return apiGet<ReviewerComment[]>(`/api/applications/${applicationId}/reviewer-comments`)
}

export async function addReviewerComment(
  applicationId: string,
  criterion: string,
  comment: string,
): Promise<ReviewerComment> {
  return apiPost<ReviewerComment>(`/api/applications/${applicationId}/reviewer-comments`, { criterion, comment })
}
