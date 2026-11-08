// One-off script that seeds the four demo accounts (with their non-default
// roles) directly into the Firebase Emulator Suite, bypassing the
// faculty-only restriction on POST /api/auth/register.
//
// Run with the emulators already started:
//   npm run seed:demo-users
//
// Safe to re-run — existing users/profiles are updated in place.
import { adminAuth, db } from '../firebase-admin.js'
import { FieldValue } from 'firebase-admin/firestore'

const DEMO_PASSWORD = 'Demo@12345'

type DemoRole = 'faculty' | 'internal_reviewer' | 'external_reviewer' | 'committee_member' | 'admin'

interface DemoUserSeed {
  email: string
  displayName: string
  role: DemoRole
  department: string
}

const DEMO_USERS: DemoUserSeed[] = [
  {
    email: 'demo.faculty@fccollege.edu.pk',
    displayName: 'Demo Faculty',
    role: 'faculty',
    department: 'Computer Science',
  },
  {
    email: 'demo.internal@fccollege.edu.pk',
    displayName: 'Demo Internal Reviewer',
    role: 'internal_reviewer',
    department: 'Faculty Review Committee',
  },
  {
    email: 'demo.external@fccollege.edu.pk',
    displayName: 'Demo External Reviewer',
    role: 'external_reviewer',
    department: 'External Committee',
  },
  {
    email: 'demo.admin@fccollege.edu.pk',
    displayName: 'Demo Admin',
    role: 'admin',
    department: 'Administration',
  },
  {
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
    department: 'Administration',
  },
  // Extra accounts needed to exercise the full review/committee workflow —
  // assignments require two *distinct* internal reviewers, and committee
  // decisions require a committee_member (or admin) account.
  {
    email: 'demo.internal2@fccollege.edu.pk',
    displayName: 'Dr. Hina Riaz',
    role: 'internal_reviewer',
    department: 'Faculty Review Committee',
  },
  {
    email: 'demo.committee@fccollege.edu.pk',
    displayName: 'Dr. Farhan Yousuf',
    role: 'committee_member',
    department: 'Promotion Committee',
  },
]

async function seedUser(seed: DemoUserSeed): Promise<void> {
  let uid: string
  try {
    const existing = await adminAuth.getUserByEmail(seed.email)
    uid = existing.uid
    console.log(`Auth user already exists: ${seed.email} (${uid})`)
  } catch {
    const created = await adminAuth.createUser({
      email: seed.email,
      password: DEMO_PASSWORD,
      displayName: seed.displayName,
      emailVerified: true,
    })
    uid = created.uid
    console.log(`Created auth user: ${seed.email} (${uid})`)
  }

  await db.collection('users').doc(uid).set(
    {
      uid,
      email: seed.email,
      displayName: seed.displayName,
      role: seed.role,
      department: seed.department,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  console.log(`  -> profile role set to "${seed.role}"`)
}

async function main() {
  for (const seed of DEMO_USERS) {
    await seedUser(seed)
  }
  console.log(`\nAll demo users ready. Password for every account: ${DEMO_PASSWORD}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Failed to seed demo users:', err)
  process.exit(1)
})
