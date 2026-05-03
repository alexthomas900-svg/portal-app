import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { auth, db } from '../firebase'
import type { Application, EvaluationReport, PublicationVerification, ReviewerComment } from '../types'

function toIsoString(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value !== null) {
    const maybeTimestamp = value as {
      toDate?: () => Date
      seconds?: number
      nanoseconds?: number
      _seconds?: number
      _nanoseconds?: number
    }

    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().toISOString()
    }

    const seconds = maybeTimestamp.seconds ?? maybeTimestamp._seconds
    const nanoseconds = maybeTimestamp.nanoseconds ?? maybeTimestamp._nanoseconds ?? 0
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000 + nanoseconds / 1_000_000).toISOString()
    }
  }

  return new Date().toISOString()
}

function normalizeApplication(id: string, raw: Record<string, unknown>): Application {
  return {
    ...(raw as unknown as Application),
    id,
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
    submittedAt: raw.submittedAt ? toIsoString(raw.submittedAt) : undefined,
  }
}

function buildEmptyApplication(
  id: string,
  uid: string,
  name: string,
  email: string,
  applicationType: Application['applicationType'],
): Application {
  const now = new Date().toISOString()

  return {
    id,
    applicantUid: uid,
    applicantName: name,
    applicantEmail: email,
    applicationType,
    promotionType: 'associate_professor',
    status: 'draft',
    personalInfo: {
      fullName: name,
      fatherName: '',
      cnic: '',
      email,
      phone: '',
      department: '',
      currentDesignation: '',
      dateOfBirth: '',
      dateOfJoining: '',
      applicationType,
      promotionType: 'associate_professor',
    },
    qualifications: [],
    experience: [],
    publications: [],
    teachingEffectiveness: {
      bloomAlignment: '',
      finkAlignment: '',
      higherOrderThinking: '',
      chairRating: 0,
      deanRating: 0,
      studentRating: 0,
      overallRating: 'deficient',
    },
    effortsToImprove: {
      innovations: '',
      pedagogicalImprovement: '',
      curriculumDevelopment: '',
      reflectivePractice: '',
      cpdsUndertaken: '',
      cpdHours: 0,
      overallRating: 'deficient',
    },
    scholarship: {
      summary: '',
      grants: '',
      conferences: '',
      editorialWork: '',
      awards: '',
      supervision: '',
      chairRating: 0,
      deanRating: 0,
      overallRating: 'deficient',
    },
    researchStatement: '',
    services: {
      advising: '',
      societies: '',
      committees: '',
      charitableWork: '',
      ngos: '',
      boardMemberships: '',
      consulting: '',
      chairRating: 0,
      deanRating: 0,
      overallRating: 'deficient',
    },
    documents: {
      experienceLetters: [],
      courseOutlines: [],
      assignments: [],
      teachingSupportDocs: [],
    },
    declaration: false,
    vetPassed: false,
    createdAt: now,
    updatedAt: now,
  }
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefined(entryValue)])
    return Object.fromEntries(entries) as T
  }

  return value
}

export async function saveApplication(application: Application): Promise<void> {
  try {
    await apiPut(`/api/applications/${application.id}`, application)
  } catch {
    await setDoc(
      doc(db, 'applications', application.id),
      stripUndefined({
        ...application,
        updatedAt: serverTimestamp(),
      }),
    )
  }
}

export async function createApplication(
  uid: string,
  name: string,
  email: string,
  applicationType: Application['applicationType'] = 'promotion',
): Promise<Application> {
  try {
    return await apiPost('/api/applications', { applicationType })
  } catch {
    const ref = doc(collection(db, 'applications'))
    const application = buildEmptyApplication(ref.id, uid, name, email, applicationType)
    await setDoc(
      ref,
      stripUndefined({
        ...application,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    return application
  }
}

export async function getApplication(id: string): Promise<Application | null> {
  try {
    return await apiGet<Application>(`/api/applications/${id}`)
  } catch {
    try {
      const snap = await getDoc(doc(db, 'applications', id))
      if (!snap.exists()) return null
      return normalizeApplication(snap.id, snap.data() as Record<string, unknown>)
    } catch {
      return null
    }
  }
}

export async function getMyApplications(uid: string): Promise<Application[]> {
  try {
    return await apiGet<Application[]>('/api/applications/mine')
  } catch {
    const snap = await getDocs(
      query(
        collection(db, 'applications'),
        where('applicantUid', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
    )

    return snap.docs.map((item) => normalizeApplication(item.id, item.data() as Record<string, unknown>))
  }
}

export async function getAllApplications(): Promise<Application[]> {
  return apiGet<Application[]>('/api/applications/all')
}

export async function getSubmittedApplications(): Promise<Application[]> {
  return apiGet<Application[]>('/api/applications/submitted')
}

export async function submitApplication(id: string): Promise<void> {
  try {
    await apiPost(`/api/applications/${id}/submit`, {})
  } catch {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('You must be signed in to submit an application.')
    }

    const ref = doc(db, 'applications', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Application not found')
    }

    const data = snap.data() as Record<string, unknown>
    if (data.applicantUid !== currentUser.uid) {
      throw new Error('Access denied')
    }

    await updateDoc(ref, {
      status: 'submitted',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

export async function updateApplicationStatus(id: string, status: Application['status']): Promise<void> {
  await apiPut(`/api/applications/${id}/status`, { status })
}

export async function deleteApplication(id: string): Promise<void> {
  await apiDelete(`/api/applications/${id}`)
}

export async function verifyPublication(
  applicationId: string,
  pubId: string,
): Promise<PublicationVerification> {
  return apiPost<PublicationVerification>(`/api/applications/${applicationId}/publications/${pubId}/verify`, {})
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
