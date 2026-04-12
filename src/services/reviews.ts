import { apiGet, apiPost, apiPut } from '../lib/api'
import type { InternalReview, ExternalReview } from '../types'

// ── Internal Reviews ──

export async function saveInternalReview(review: InternalReview): Promise<void> {
  await apiPut(`/api/reviews/internal/${review.applicationId}/${review.id}`, review)
}

export async function createInternalReview(
  applicationId: string,
  _reviewerUid: string,
  _reviewerName: string,
): Promise<InternalReview> {
  return apiPost<InternalReview>(`/api/reviews/internal/${applicationId}`, {})
}

export async function getInternalReviews(applicationId: string): Promise<InternalReview[]> {
  return apiGet<InternalReview[]>(`/api/reviews/internal/${applicationId}`)
}

export async function getMyInternalReview(
  applicationId: string,
  _reviewerUid: string,
): Promise<InternalReview | null> {
  return apiGet<InternalReview | null>(`/api/reviews/internal/${applicationId}/mine`)
}

// ── External Reviews ──

export async function saveExternalReview(review: ExternalReview): Promise<void> {
  await apiPut(`/api/reviews/external/${review.applicationId}/${review.id}`, review)
}

export async function createExternalReview(
  applicationId: string,
  _reviewerUid: string,
  _reviewerName: string,
): Promise<ExternalReview> {
  return apiPost<ExternalReview>(`/api/reviews/external/${applicationId}`, {})
}

export async function getExternalReviews(applicationId: string): Promise<ExternalReview[]> {
  return apiGet<ExternalReview[]>(`/api/reviews/external/${applicationId}`)
}
