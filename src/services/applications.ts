import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import type { Application } from '../types'

export async function saveApplication(application: Application): Promise<void> {
  await apiPut(`/api/applications/${application.id}`, application)
}

export async function createApplication(
  _uid: string,
  _name: string,
  _email: string,
  applicationType: Application['applicationType'] = 'promotion',
): Promise<Application> {
  return apiPost('/api/applications', { applicationType })
}

export async function getApplication(id: string): Promise<Application | null> {
  try {
    return await apiGet<Application>(`/api/applications/${id}`)
  } catch {
    return null
  }
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
