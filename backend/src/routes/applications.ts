import { Router } from 'express'
import { db } from '../firebase-admin.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { FieldValue } from 'firebase-admin/firestore'

const router = Router()

function toMillis(value: unknown): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTimestamp = value as {
      toDate?: () => Date
      seconds?: number
      nanoseconds?: number
      _seconds?: number
      _nanoseconds?: number
    }

    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().getTime()
    }

    const seconds = maybeTimestamp.seconds ?? maybeTimestamp._seconds
    const nanoseconds = maybeTimestamp.nanoseconds ?? maybeTimestamp._nanoseconds ?? 0
    if (typeof seconds === 'number') {
      return seconds * 1000 + nanoseconds / 1_000_000
    }
  }

  return 0
}

function sortByCreatedAtDesc<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt))
}

// Helper: get caller role
async function getCallerRole(uid: string): Promise<string | null> {
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? (snap.data()?.role as string) : null
}

// Helper: build empty application template
function buildEmptyApplication(
  uid: string,
  name: string,
  email: string,
  applicationType: string,
) {
  return {
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
      finkAlignment: '',
      higherOrderThinking: '',
      chairRating: 0,
      deanRating: 0,
      studentRating: 0,
      overallRating: 'meets',
    },
    effortsToImprove: {
      innovations: '',
      pedagogicalImprovement: '',
      curriculumDevelopment: '',
      reflectivePractice: '',
      cpdsUndertaken: '',
      cpdHours: 0,
      overallRating: 'meets',
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
      overallRating: 'meets',
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
      overallRating: 'meets',
    },
    documents: {
      experienceLetters: [],
      courseOutlines: [],
      assignments: [],
      teachingSupportDocs: [],
    },
    declaration: false,
    vetPassed: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

// POST /api/applications — create new application
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { applicationType } = req.body as { applicationType?: string }
    const type = applicationType || 'promotion'

    // Get user profile for name/email
    const profileSnap = await db.collection('users').doc(req.uid!).get()
    if (!profileSnap.exists) {
      res.status(400).json({ error: 'User profile not found. Complete registration first.' })
      return
    }
    const profile = profileSnap.data()!

    const ref = db.collection('applications').doc()
    const app = {
      id: ref.id,
      ...buildEmptyApplication(req.uid!, profile.displayName, profile.email, type),
    }
    await ref.set(app)
    res.json(app)
  } catch (err) {
    console.error('POST /api/applications error:', err)
    res.status(500).json({ error: 'Failed to create application' })
  }
})

// GET /api/applications/mine — get current user's applications
router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db.collection('applications').where('applicantUid', '==', req.uid!).get()
    res.json(sortByCreatedAtDesc(snap.docs.map((d) => d.data())))
  } catch (err) {
    console.error('GET /api/applications/mine error:', err)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

// GET /api/applications/submitted — get non-draft applications (for reviewers)
router.get('/submitted', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    if (!role || !['internal_reviewer', 'external_reviewer', 'admin'].includes(role)) {
      res.status(403).json({ error: 'Reviewer or admin access required' })
      return
    }

    const snap = await db
      .collection('applications')
      .where('status', 'in', ['submitted', 'under_review', 'reviewed', 'decision_made'])
      .get()
    res.json(sortByCreatedAtDesc(snap.docs.map((d) => d.data())))
  } catch (err) {
    console.error('GET /api/applications/submitted error:', err)
    res.status(500).json({ error: 'Failed to fetch submitted applications' })
  }
})

// GET /api/applications/all — admin: get all applications
router.get('/all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    if (role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const snap = await db.collection('applications').get()
    res.json(sortByCreatedAtDesc(snap.docs.map((d) => d.data())))
  } catch (err) {
    console.error('GET /api/applications/all error:', err)
    res.status(500).json({ error: 'Failed to fetch all applications' })
  }
})

// GET /api/applications/:id — get single application
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db.collection('applications').doc(req.params.id).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }
    const data = snap.data()!

    // Access control: owner, reviewer, or admin
    const role = await getCallerRole(req.uid!)
    const isOwner = data.applicantUid === req.uid
    const isReviewer = role === 'internal_reviewer' || role === 'external_reviewer'
    const isAdmin = role === 'admin'

    if (!isOwner && !isReviewer && !isAdmin) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    res.json(data)
  } catch (err) {
    console.error('GET /api/applications/:id error:', err)
    res.status(500).json({ error: 'Failed to fetch application' })
  }
})

// PUT /api/applications/:id — save/update application
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db.collection('applications').doc(req.params.id).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }

    const existing = snap.data()!
    const role = await getCallerRole(req.uid!)
    const isOwner = existing.applicantUid === req.uid
    const isAdmin = role === 'admin'

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    const body = req.body as Record<string, unknown>
    // Merge with server timestamp
    await db.collection('applications').doc(req.params.id).set(
      {
        ...body,
        id: req.params.id,
        applicationType: (body.personalInfo as Record<string, unknown>)?.applicationType || body.applicationType || existing.applicationType,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: false },
    )
    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/applications/:id error:', err)
    res.status(500).json({ error: 'Failed to save application' })
  }
})

// POST /api/applications/:id/submit — submit application
router.post('/:id/submit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db.collection('applications').doc(req.params.id).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }
    if (snap.data()!.applicantUid !== req.uid) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    await db.collection('applications').doc(req.params.id).update({
      status: 'submitted',
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    res.json({ success: true })
  } catch (err) {
    console.error('POST /api/applications/:id/submit error:', err)
    res.status(500).json({ error: 'Failed to submit application' })
  }
})

// PUT /api/applications/:id/status — admin: change status
router.put('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    if (role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const { status } = req.body as { status: string }
    await db.collection('applications').doc(req.params.id).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    })
    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/applications/:id/status error:', err)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

// DELETE /api/applications/:id — admin: delete application
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    if (role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    await db.collection('applications').doc(req.params.id).delete()
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/applications/:id error:', err)
    res.status(500).json({ error: 'Failed to delete application' })
  }
})

// POST /api/applications/:id/seed — seed demo data for user
router.post('/seed', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profileSnap = await db.collection('users').doc(req.uid!).get()
    if (!profileSnap.exists) {
      res.status(400).json({ error: 'Profile not found' })
      return
    }
    const profile = profileSnap.data()!

    // Check if already has applications
    const existing = await db
      .collection('applications')
      .where('applicantUid', '==', req.uid!)
      .limit(1)
      .get()

    if (!existing.empty) {
      res.json({ seeded: false, message: 'Already has applications' })
      return
    }

    const templates = [
      { applicationType: 'promotion', promotionType: 'associate_professor', status: 'submitted', department: 'Computer Science', title: 'AI-driven Assessment in Undergraduate Courses', vetPassed: true },
      { applicationType: 'contract_renewal', promotionType: 'associate_professor', status: 'draft', department: 'Computer Science', title: 'Contract Renewal Report 2026', vetPassed: true },
      { applicationType: 'self_evaluation', promotionType: 'associate_professor', status: 'submitted', department: 'Computer Science', title: 'Annual Self-Evaluation Report 2026', vetPassed: true },
    ]

    for (const template of templates) {
      const ref = db.collection('applications').doc()
      const base = buildEmptyApplication(req.uid!, profile.displayName, profile.email, template.applicationType)
      await ref.set({
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
        submittedAt: template.status === 'draft' ? null : FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    res.json({ seeded: true })
  } catch (err) {
    console.error('POST /api/applications/seed error:', err)
    res.status(500).json({ error: 'Failed to seed demo data' })
  }
})

export default router
