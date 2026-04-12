import { collection, doc, getDocs, limit, query, setDoc, Timestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { UserProfile } from '../types'
import { createEmptyApplication } from './applications'
import { DEMO_SEED_APPLICATIONS } from '../data/demoSeed'

const SEEDED_FLAG_PREFIX = 'fcc-demo-seeded:'

function shouldSeed() {
  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_SEED === 'true'
}

export async function seedDemoDataIfNeeded(profile: UserProfile): Promise<void> {
  if (!shouldSeed()) return

  const seededKey = `${SEEDED_FLAG_PREFIX}${profile.uid}`
  if (window.localStorage.getItem(seededKey) === '1') return

  const existing = await getDocs(
    query(collection(db, 'applications'), where('applicantUid', '==', profile.uid), limit(1)),
  )

  if (!existing.empty) {
    window.localStorage.setItem(seededKey, '1')
    return
  }

  for (const template of DEMO_SEED_APPLICATIONS) {
    const ref = doc(collection(db, 'applications'))
    const base = createEmptyApplication(
      profile.uid,
      profile.displayName,
      profile.email,
      template.applicationType,
    )

    const now = Timestamp.now()

    await setDoc(ref, {
      id: ref.id,
      ...base,
      applicationType: template.applicationType,
      promotionType: template.promotionType,
      status: template.status,
      vetPassed: template.vetPassed,
      personalInfo: {
        ...base.personalInfo,
        applicationType: template.applicationType,
        promotionType: template.promotionType,
        department: template.department,
      },
      researchStatement: template.title,
      submittedAt: template.status === 'draft' ? undefined : now,
      createdAt: now,
      updatedAt: now,
    })
  }

  window.localStorage.setItem(seededKey, '1')
}
