import { Router } from 'express'
import { db } from '../firebase-admin.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyPublication } from '../services/publicationVerification.js'
import { evaluateApplication } from '../services/rubricScoring.js'
import { createNotification, recordAudit } from '../services/activityLog.js'

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
  promotionType = 'associate_professor',
) {
  return {
    applicantUid: uid,
    applicantName: name,
    applicantEmail: email,
    applicationType,
    promotionType,
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
      promotionType,
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

// POST /api/applications — create new application
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { applicationType, promotionType, cycleId } = req.body as {
      applicationType?: string
      promotionType?: string
      cycleId?: string
    }
    const type = applicationType || 'promotion'
    const promotion = promotionType === 'full_professor' ? 'full_professor' : 'associate_professor'

    if (!['promotion', 'contract_renewal', 'self_evaluation'].includes(type)) {
      res.status(400).json({ error: 'Invalid application type' })
      return
    }

    let activeCycleId: string | undefined
    if (cycleId) {
      const cycle = await db.collection('applicationCycles').doc(cycleId).get()
      const cycleData = cycle.data()
      if (!cycle.exists || !cycleData?.isOpen || cycleData.applicationType !== type ||
        (type === 'promotion' && cycleData.promotionType !== promotion) ||
        Date.now() < Date.parse(String(cycleData.opensAt)) ||
        Date.now() > Date.parse(String(cycleData.closesAt))) {
        res.status(400).json({ error: 'This application cycle is not currently open' })
        return
      }
      activeCycleId = cycleId
    }

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
      ...buildEmptyApplication(req.uid!, profile.displayName, profile.email, type, promotion),
      ...(activeCycleId ? { cycleId: activeCycleId } : {}),
      ...(type === 'self_evaluation'
        ? {
            annualEvaluation: {
              evaluationYear: String(new Date().getFullYear()),
              employmentDetails: '',
              coursesTaught: '',
              teachingStrategies: '',
              assessmentMethods: '',
              teachingInnovations: '',
              teachingAchievements: '',
              teachingReflection: '',
              researchActivities: '',
              researchProjects: '',
              conferencePresentations: '',
              researchCollaborations: '',
              researchAchievements: '',
              professionalDevelopment: '',
              cpdHours: 0,
              booksAndChapters: '',
              academicContributions: '',
              departmentalResponsibilities: '',
              universityCommittees: '',
              studentAdvisingAndActivities: '',
              leadershipAndCommunityService: '',
              institutionalEngagement: '',
              majorAchievements: '',
              challenges: '',
              areasForImprovement: '',
              futureGoals: '',
              supportRequired: '',
              supportingDocuments: [],
            },
          }
        : {}),
    }
    await ref.set(app)
    await recordAudit(req.uid!, 'application_created', ref.id, { applicationType: type, promotionType: promotion })
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
    const applications = snap.docs.map((d) => d.data())
    const visible = role === 'admin'
      ? applications
      : applications.filter((application) => {
          const assignments = application.assignments as Record<string, unknown> | undefined
          return role === 'internal_reviewer'
            ? assignments?.internalReviewer1Uid === req.uid || assignments?.internalReviewer2Uid === req.uid
            : application.applicationType === 'promotion' &&
                application.promotionType === 'full_professor' &&
                assignments?.externalReviewerUid === req.uid
        })
    res.json(sortByCreatedAtDesc(visible))
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
    const isOwner = data.applicantUid === req.uid && role === 'faculty'
    const assignments = data.assignments as Record<string, unknown> | undefined
    const isAssignedReviewer = (role === 'internal_reviewer' && (
      assignments?.internalReviewer1Uid === req.uid || assignments?.internalReviewer2Uid === req.uid
    )) || (role === 'external_reviewer' && data.applicationType === 'promotion' &&
      data.promotionType === 'full_professor' && assignments?.externalReviewerUid === req.uid)
    const isReviewer = isAssignedReviewer
    const isAdmin = role === 'admin'

    if (!isOwner && !isReviewer && !isAdmin) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Strip reviewer-only fields for applicant responses
    if (isOwner && !isAdmin && !isReviewer) {
      const { evaluationReport, ...applicantData } = data as Record<string, unknown> & { evaluationReport?: unknown }
      void evaluationReport
      // Also strip per-section rubricScores
      const sanitized = stripReviewerOnlyFields(applicantData)
      res.json(sanitized)
      return
    }

    if (role === 'external_reviewer' && isAssignedReviewer) {
      const personalInfo = data.personalInfo as Record<string, unknown> | undefined
      res.json({
        id: data.id,
        applicantName: data.applicantName,
        applicantEmail: data.applicantEmail,
        applicationType: data.applicationType,
        promotionType: data.promotionType,
        status: data.status,
        personalInfo: {
          fullName: personalInfo?.fullName,
          department: personalInfo?.department,
          currentDesignation: personalInfo?.currentDesignation,
        },
        documents: { updatedCV: (data.documents as Record<string, unknown> | undefined)?.updatedCV },
      })
      return
    }
    if (role === 'internal_reviewer') await recordAudit(req.uid!, 'confidential_application_accessed', req.params.id)
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
    const isApplicant = isOwner && role === 'faculty'

    if (!isApplicant && !isAdmin) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    const body = req.body as Record<string, unknown>
    if (isApplicant && existing.status !== 'draft') {
      res.status(403).json({ error: 'Submitted applications are read-only' })
      return
    }
    const safeBody = { ...body }
    delete safeBody.evaluationReport
    delete safeBody.assignments
    delete safeBody.finalDecision
    delete safeBody.snapshotId
    delete safeBody.conflictDeclared
    delete safeBody.conflictExplanation
    for (const section of ['teachingEffectiveness', 'effortsToImprove', 'scholarship', 'services']) {
      const sectionData = safeBody[section]
      if (sectionData && typeof sectionData === 'object') {
        delete (sectionData as Record<string, unknown>).rubricScores
      }
    }
    // Merge with server timestamp
    await db.collection('applications').doc(req.params.id).set(
      {
        ...safeBody,
        id: req.params.id,
        applicantUid: existing.applicantUid,
        applicantName: existing.applicantName,
        applicantEmail: existing.applicantEmail,
        applicationType: existing.applicationType,
        promotionType: existing.applicationType === 'promotion' &&
          ['associate_professor', 'full_professor'].includes(String(body.promotionType))
          ? body.promotionType
          : existing.promotionType,
        status: existing.status,
        submittedAt: existing.submittedAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: false },
    )
    await recordAudit(req.uid!, 'application_edited', req.params.id)
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
    if (snap.data()!.status !== 'draft') {
      res.status(403).json({ error: 'Application has already been submitted' })
      return
    }
    const submittedAt = new Date().toISOString()
    const applicationRef = db.collection('applications').doc(req.params.id)
    const snapshotRef = applicationRef.collection('snapshots').doc()
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(applicationRef)
      if (!current.exists || current.data()?.status !== 'draft' || current.data()?.applicantUid !== req.uid) {
        throw new Error('Application is no longer an editable draft')
      }
      const frozenApplication = {
        ...current.data(),
        status: 'submitted',
        submittedAt,
        snapshotId: snapshotRef.id,
      }
      transaction.set(snapshotRef, {
        ...frozenApplication,
        snapshotId: snapshotRef.id,
        submittedAt,
      })
      transaction.update(applicationRef, {
        status: 'submitted',
        submittedAt,
        snapshotId: snapshotRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      })
    })
    await recordAudit(req.uid!, 'application_submitted', req.params.id, { snapshotId: snapshotRef.id })
    await createNotification(req.uid!, 'submission_confirmation', 'Your application was submitted successfully.', req.params.id)
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
    if (!['draft', 'submitted', 'under_review', 'reviewed', 'decision_made'].includes(status)) {
      res.status(400).json({ error: 'Invalid application status' })
      return
    }
    await db.collection('applications').doc(req.params.id).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    })
    await recordAudit(req.uid!, 'application_status_changed', req.params.id, { status })
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
    await recordAudit(req.uid!, 'application_deleted', req.params.id)
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/applications/:id error:', err)
    res.status(500).json({ error: 'Failed to delete application' })
  }
})

// POST /api/applications/:id/publications/:pubId/verify — verify a single publication
router.post('/:id/publications/:pubId/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    const snap = await db.collection('applications').doc(req.params.id).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }
    const data = snap.data()!

    // Applicant can trigger on own draft; reviewers and admins always allowed
    const isOwner = data.applicantUid === req.uid
    const isReviewer = role === 'internal_reviewer' || role === 'external_reviewer'
    const isAdmin = role === 'admin'
    if (!isOwner && !isReviewer && !isAdmin) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    const publications: Array<Record<string, unknown>> = Array.isArray(data.publications)
      ? [...(data.publications as Array<Record<string, unknown>>)]
      : []

    const pubIndex = publications.findIndex((p) => p.id === req.params.pubId)
    if (pubIndex === -1) {
      res.status(404).json({ error: 'Publication not found' })
      return
    }

    const pub = publications[pubIndex]!
    const verification = await verifyPublication(
      String(pub.journalName ?? ''),
      String(pub.indexing ?? ''),
    )

    publications[pubIndex] = { ...pub, verification }
    await db.collection('applications').doc(req.params.id).update({
      publications,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.info(`Publication ${req.params.pubId} verified by ${req.uid} at ${new Date().toISOString()}`)
    res.json({ verification })
  } catch (err) {
    console.error('POST /api/applications/:id/publications/:pubId/verify error:', err)
    res.status(500).json({ error: 'Verification failed' })
  }
})

// POST /api/applications/:id/evaluate — run/re-run rubric evaluation (reviewers/admin)
router.post('/:id/evaluate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    if (!role || !['internal_reviewer', 'admin'].includes(role)) {
      res.status(403).json({ error: 'Reviewer or admin access required' })
      return
    }

    const snap = await db.collection('applications').doc(req.params.id).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }

    const appData = snap.data()! as Record<string, unknown>
    const report = evaluateApplication(req.params.id, appData, req.uid!)

    await db.collection('applications').doc(req.params.id).update({
      evaluationReport: report,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.info(`Evaluation run for application ${req.params.id} by ${req.uid} at ${report.generatedAt}`)
    res.json(report)
  } catch (err) {
    console.error('POST /api/applications/:id/evaluate error:', err)
    res.status(500).json({ error: 'Evaluation failed' })
  }
})

// GET /api/applications/:id/reviewer-report — fetch full evaluation report (reviewers/admin only)
router.get('/:id/reviewer-report', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    if (!role || !['internal_reviewer', 'external_reviewer', 'admin'].includes(role)) {
      res.status(403).json({ error: 'Reviewer or admin access required' })
      return
    }

    const snap = await db.collection('applications').doc(req.params.id).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }

    const data = snap.data()!
    res.json(data.evaluationReport ?? null)
  } catch (err) {
    console.error('GET /api/applications/:id/reviewer-report error:', err)
    res.status(500).json({ error: 'Failed to fetch reviewer report' })
  }
})

// POST /api/applications/:id/reviewer-comments — add criterion-linked comment (reviewers/admin)
router.post('/:id/reviewer-comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    if (!role || !['internal_reviewer', 'external_reviewer', 'admin'].includes(role)) {
      res.status(403).json({ error: 'Reviewer or admin access required' })
      return
    }

    const snap = await db.collection('applications').doc(req.params.id).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }

    const profileSnap = await db.collection('users').doc(req.uid!).get()
    const profile = profileSnap.data() ?? {}

    const { criterion, comment } = req.body as { criterion?: string; comment?: string }
    if (!criterion || !comment?.trim()) {
      res.status(400).json({ error: 'criterion and comment are required' })
      return
    }

    const ref = db
      .collection('applications')
      .doc(req.params.id)
      .collection('reviewerComments')
      .doc()

    const entry = {
      id: ref.id,
      applicationId: req.params.id,
      criterion,
      comment: comment.trim(),
      authorUid: req.uid!,
      authorName: (profile.displayName as string) ?? '',
      authorRole: role,
      createdAt: FieldValue.serverTimestamp(),
    }

    await ref.set(entry)
    res.json(entry)
  } catch (err) {
    console.error('POST /api/applications/:id/reviewer-comments error:', err)
    res.status(500).json({ error: 'Failed to save comment' })
  }
})

// GET /api/applications/:id/reviewer-comments — list all criterion comments (reviewers/admin)
router.get('/:id/reviewer-comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    if (!role || !['internal_reviewer', 'external_reviewer', 'admin'].includes(role)) {
      res.status(403).json({ error: 'Reviewer or admin access required' })
      return
    }

    const snap = await db
      .collection('applications')
      .doc(req.params.id)
      .collection('reviewerComments')
      .orderBy('createdAt', 'asc')
      .get()

    res.json(snap.docs.map((d) => d.data()))
  } catch (err) {
    console.error('GET /api/applications/:id/reviewer-comments error:', err)
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
})

// POST /api/applications/seed — seed demo data for user
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

// ── Helpers ────────────────────────────────────────────────────────────────

/** Remove all reviewer-only scoring fields before sending to applicant. */
function stripReviewerOnlyFields(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data }

  // Remove top-level evaluation report
  delete result.evaluationReport

  // Remove rubricScores nested in each section
  for (const section of ['teachingEffectiveness', 'effortsToImprove', 'scholarship', 'services'] as const) {
    const sectionData = result[section]
    if (sectionData && typeof sectionData === 'object') {
      const { rubricScores, ...rest } = sectionData as Record<string, unknown> & { rubricScores?: unknown }
      void rubricScores
      result[section] = rest
    }
  }

  return result
}

export default router
