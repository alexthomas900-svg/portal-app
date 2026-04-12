import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { InternalReview, ExternalReview, ReviewRecommendation, ExternalRecommendation } from '../types'

// ── Internal Reviews ──

export async function saveInternalReview(review: InternalReview): Promise<void> {
  const ref = doc(db, 'applications', review.applicationId, 'internalReviews', review.id)
  await setDoc(ref, { ...review, updatedAt: Timestamp.now() })
}

export async function createInternalReview(
  applicationId: string,
  reviewerUid: string,
  reviewerName: string,
): Promise<InternalReview> {
  const ref = doc(collection(db, 'applications', applicationId, 'internalReviews'))
  const review: InternalReview = {
    id: ref.id,
    applicationId,
    reviewerUid,
    reviewerName,
    personalInfoComments: '',
    qualificationsComments: '',
    experienceComments: '',
    publicationsComments: '',
    teachingComments: '',
    effortsComments: '',
    scholarshipComments: '',
    servicesComments: '',
    researchComments: '',
    overallComments: '',
    recommendation: 'recommended' as ReviewRecommendation,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
  await setDoc(ref, review)
  return review
}

export async function getInternalReviews(applicationId: string): Promise<InternalReview[]> {
  const q = query(collection(db, 'applications', applicationId, 'internalReviews'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as InternalReview)
}

export async function getMyInternalReview(
  applicationId: string,
  reviewerUid: string,
): Promise<InternalReview | null> {
  const q = query(
    collection(db, 'applications', applicationId, 'internalReviews'),
    where('reviewerUid', '==', reviewerUid),
  )
  const snap = await getDocs(q)
  return snap.empty ? null : (snap.docs[0]!.data() as InternalReview)
}

// ── External Reviews ──

export async function saveExternalReview(review: ExternalReview): Promise<void> {
  const ref = doc(db, 'applications', review.applicationId, 'externalReviews', review.id)
  await setDoc(ref, { ...review, updatedAt: Timestamp.now() })
}

export async function createExternalReview(
  applicationId: string,
  reviewerUid: string,
  reviewerName: string,
): Promise<ExternalReview> {
  const ref = doc(collection(db, 'applications', applicationId, 'externalReviews'))
  const review: ExternalReview = {
    id: ref.id,
    applicationId,
    reviewerUid,
    reviewerName,
    academicStanding: '',
    researchProductivity: '',
    visibilityContribution: '',
    overallEvaluation: 'recommended' as ExternalRecommendation,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
  await setDoc(ref, review)
  return review
}

export async function getExternalReviews(applicationId: string): Promise<ExternalReview[]> {
  const q = query(collection(db, 'applications', applicationId, 'externalReviews'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as ExternalReview)
}
