import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Application } from '../types'
import {
  emptyPersonalInfo,
  emptyTeachingEffectiveness,
  emptyEffortsToImprove,
  emptyScholarship,
  emptyServices,
  emptyDocuments,
} from '../types'

const COLLECTION = 'applications'

export function createEmptyApplication(
  uid: string,
  name: string,
  email: string,
  applicationType: Application['applicationType'] = 'promotion',
): Omit<Application, 'id'> {
  const personalInfo = { ...emptyPersonalInfo(), fullName: name, email, applicationType }
  return {
    applicantUid: uid,
    applicantName: name,
    applicantEmail: email,
    applicationType,
    promotionType: 'associate_professor',
    status: 'draft',
    personalInfo,
    qualifications: [],
    experience: [],
    publications: [],
    teachingEffectiveness: emptyTeachingEffectiveness(),
    effortsToImprove: emptyEffortsToImprove(),
    scholarship: emptyScholarship(),
    researchStatement: '',
    services: emptyServices(),
    documents: emptyDocuments(),
    declaration: false,
    vetPassed: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
}

export async function saveApplication(application: Application): Promise<void> {
  const ref = doc(db, COLLECTION, application.id)
  await setDoc(ref, {
    ...application,
    applicationType: application.personalInfo.applicationType || application.applicationType,
    updatedAt: Timestamp.now(),
  })
}

export async function createApplication(
  uid: string,
  name: string,
  email: string,
  applicationType: Application['applicationType'] = 'promotion',
): Promise<Application> {
  const ref = doc(collection(db, COLLECTION))
  const app: Application = {
    id: ref.id,
    ...createEmptyApplication(uid, name, email, applicationType),
  }
  await setDoc(ref, app)
  return app
}

export async function getApplication(id: string): Promise<Application | null> {
  const snap = await getDoc(doc(db, COLLECTION, id))
  return snap.exists() ? (snap.data() as Application) : null
}

export async function getMyApplications(uid: string): Promise<Application[]> {
  const q = query(
    collection(db, COLLECTION),
    where('applicantUid', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Application)
}

export async function getAllApplications(): Promise<Application[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Application)
}

export async function getSubmittedApplications(): Promise<Application[]> {
  const q = query(
    collection(db, COLLECTION),
    where('status', 'in', ['submitted', 'under_review', 'reviewed', 'decision_made']),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Application)
}

export async function submitApplication(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'submitted',
    submittedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
}

export async function updateApplicationStatus(id: string, status: Application['status']): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status, updatedAt: Timestamp.now() })
}

export async function deleteApplication(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
