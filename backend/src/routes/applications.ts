import { Router } from 'express'
import { db } from '../firebase-admin.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { FieldValue } from 'firebase-admin/firestore'
import { isIndexed, verifyPublication } from '../services/publicationVerification.js'
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

function serializeTimestamps(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serializeTimestamps)
  if (!value || typeof value !== 'object') return value

  const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number }
  if (typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString()
  const seconds = timestamp.seconds ?? timestamp._seconds
  if (typeof seconds === 'number' && Object.keys(value).some((key) => key === 'nanoseconds' || key === '_nanoseconds')) {
    const nanoseconds = (value as { nanoseconds?: number; _nanoseconds?: number }).nanoseconds ??
      (value as { _nanoseconds?: number })._nanoseconds ?? 0
    return new Date(seconds * 1000 + nanoseconds / 1_000_000).toISOString()
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serializeTimestamps(item)]),
  )
}

function sortByCreatedAtDesc<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt))
}

function externalCvOnly(application: Record<string, unknown>) {
  const documents = application.documents as Record<string, unknown> | undefined
  return {
    id: application.id,
    applicantName: '',
    applicantEmail: '',
    applicationType: application.applicationType,
    promotionType: application.promotionType,
    personalInfo: {
      fullName: '',
      department: '',
      currentDesignation: '',
    },
    documents: { updatedCV: documents?.updatedCV },
  }
}

// Helper: get caller role
async function getCallerRole(uid: string): Promise<string | null> {
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? (snap.data()?.role as string) : null
}

async function isReviewerAssigned(applicationId: string, uid: string, role: string | null): Promise<boolean> {
  const snapshot = await db.collection('applications').doc(applicationId).get()
  if (!snapshot.exists) return false
  const application = snapshot.data()!
  const assignments = application.assignments as Record<string, unknown> | undefined
  const isAssigned = role === 'internal_reviewer'
    ? assignments?.internalReviewer1Uid === uid || assignments?.internalReviewer2Uid === uid
    : role === 'external_reviewer' &&
      application.applicationType === 'promotion' &&
      application.promotionType === 'full_professor' &&
      assignments?.externalReviewerUid === uid
  if (!isAssigned) return false
  const conflict = await db.collection('applications').doc(applicationId).collection('conflicts').doc(uid).get()
  return !conflict.exists || conflict.data()?.resolved === true
}

// Checks every publication on an application and stores the results.
async function verifyAllPublications(applicationId: string): Promise<Array<Record<string, unknown>> | null> {
  const ref = db.collection('applications').doc(applicationId)
  const snapshot = await ref.get()
  if (!snapshot.exists) return null
  const publications = (snapshot.data()!.publications as Array<Record<string, unknown>> | undefined) ?? []
  if (publications.length === 0) return []

  const checked: Array<Record<string, unknown>> = []
  // A few at a time, to stay polite to the free public APIs.
  for (let start = 0; start < publications.length; start += 3) {
    checked.push(...await Promise.all(publications.slice(start, start + 3).map(async (publication) => {
      const verification = await verifyPublication({
        articleTitle: String(publication.articleTitle ?? ''),
        journalName: String(publication.journalName ?? ''),
        year: Number(publication.year) || undefined,
        authorNames: Array.isArray(publication.authorNames) ? publication.authorNames.map(String) : [],
      })
      return { ...publication, verification, recognized: isIndexed(verification) }
    })))
  }
  await ref.update({ publications: checked, updatedAt: FieldValue.serverTimestamp() })
  return checked
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
    if ((await getCallerRole(req.uid!)) !== 'faculty') {
      res.status(403).json({ error: 'Faculty applicant access required' })
      return
    }

    if (!cycleId) {
      res.status(400).json({ error: 'An active application cycle is required' })
      return
    }
    const cycle = await db.collection('applicationCycles').doc(cycleId).get()
    const cycleData = cycle.data()
    if (!cycle.exists || !cycleData?.isOpen || cycleData.applicationType !== type ||
      (type === 'promotion' && cycleData.promotionType !== promotion) ||
      Date.now() < Date.parse(String(cycleData.opensAt)) ||
      Date.now() > Date.parse(String(cycleData.closesAt))) {
      res.status(400).json({ error: 'This application cycle is not currently open' })
      return
    }
    const applicantApplications = await db.collection('applications').where('applicantUid', '==', req.uid!).get()
    const alreadyStarted = applicantApplications.docs.some((document) => {
      const current = document.data()
      return current.cycleId === cycleId && current.applicationType === type &&
        (type !== 'promotion' || current.promotionType === promotion)
    })
    if (alreadyStarted) {
      res.status(409).json({ error: 'An application for this cycle already exists' })
      return
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
      cycleId,
      academicYear: cycleData.academicYear,
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
    res.json(serializeTimestamps((await ref.get()).data()))
  } catch (err) {
    console.error('POST /api/applications error:', err)
    res.status(500).json({ error: 'Failed to create application' })
  }
})

// GET /api/applications/mine — get current user's applications
router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await getCallerRole(req.uid!)) !== 'faculty') {
      res.status(403).json({ error: 'Faculty applicant access required' })
      return
    }
    const snap = await db.collection('applications').where('applicantUid', '==', req.uid!).get()
    res.json(serializeTimestamps(sortByCreatedAtDesc(snap.docs.map((d) => stripApplicantOnlyFields(d.data() as Record<string, unknown>)))))
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
    const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const visible = role === 'admin'
      ? applications
      : (await Promise.all(snap.docs.map(async (doc) =>
          await isReviewerAssigned(doc.id, req.uid!, role) ? doc.data() : null,
        ))).filter((application): application is FirebaseFirestore.DocumentData => application !== null)
    const sorted = sortByCreatedAtDesc(visible)
    res.json(serializeTimestamps(role === 'external_reviewer'
      ? sorted.map(externalCvOnly)
      : sorted))
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
    res.json(serializeTimestamps(sortByCreatedAtDesc(snap.docs.map((d) => d.data()))))
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
    const isAssignedReviewer = ['internal_reviewer', 'external_reviewer'].includes(String(role)) &&
      await isReviewerAssigned(req.params.id, req.uid!, role)
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
      res.json(serializeTimestamps(stripApplicantOnlyFields(sanitized)))
      return
    }

    if (role === 'external_reviewer' && isAssignedReviewer) {
      await recordAudit(req.uid!, 'external_cv_accessed', req.params.id)
      res.json(serializeTimestamps(externalCvOnly(data)))
      return
    }
    if (role === 'internal_reviewer') await recordAudit(req.uid!, 'confidential_application_accessed', req.params.id)
    res.json(serializeTimestamps(data))
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
    delete safeBody.eligibilityResult
    delete safeBody.teachingScore
    delete safeBody.effortsScore
    delete safeBody.scholarshipScore
    delete safeBody.servicesScore
    delete safeBody.totalScore
    for (const section of ['teachingEffectiveness', 'effortsToImprove', 'scholarship', 'services']) {
      const sectionData = safeBody[section]
      if (sectionData && typeof sectionData === 'object') {
        const incomingSection = sectionData as Record<string, unknown>
        const existingSection = existing[section] as Record<string, unknown> | undefined
        if (isApplicant) {
          for (const field of ['overallRating', 'chairRating', 'deanRating', 'studentRating', 'rubricScores']) {
            if (existingSection && field in existingSection) {
              incomingSection[field] = existingSection[field]
            } else {
              delete incomingSection[field]
            }
          }
          safeBody[section] = { ...existingSection, ...incomingSection }
        } else {
          delete incomingSection.rubricScores
        }
      }
    }
    if (isApplicant && Array.isArray(safeBody.publications)) {
      const previousPublications = new Map(
        ((existing.publications as Array<Record<string, unknown>> | undefined) ?? [])
          .map((publication) => [String(publication.id), publication]),
      )
      safeBody.publications = (safeBody.publications as Array<Record<string, unknown>>).map((publication) => {
        const previous = previousPublications.get(String(publication.id))
        const unchanged = previous &&
          previous.articleTitle === publication.articleTitle &&
          previous.journalName === publication.journalName &&
          previous.indexing === publication.indexing
        const verification = unchanged ? previous.verification as Record<string, unknown> | undefined : undefined
        const safePublication: Record<string, unknown> = {
          ...publication,
          recognized: verification?.status === 'verified',
        }
        if (verification) safePublication.verification = verification
        else delete safePublication.verification
        return safePublication
      })
    }
    if (safeBody.personalInfo && typeof safeBody.personalInfo === 'object') {
      const personalInfo = safeBody.personalInfo as Record<string, unknown>
      safeBody.personalInfo = {
        ...personalInfo,
        applicationType: existing.applicationType,
        promotionType: existing.promotionType,
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
        promotionType: existing.promotionType,
        // Applications created outside a cycle (e.g. the seeded demo drafts)
        // have neither field, and Firestore rejects `undefined` values.
        cycleId: existing.cycleId ?? null,
        academicYear: existing.academicYear ?? null,
        createdAt: existing.createdAt,
        status: existing.status,
        // `submittedAt` is never initialized when an application is first
        // created (see buildEmptyApplication), so it's `undefined` here for
        // any draft that hasn't been submitted yet. Firestore rejects
        // `undefined` values outright, which broke saving a brand-new
        // draft's very first edit.
        submittedAt: existing.submittedAt ?? null,
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
    if (snap.data()!.applicantUid !== req.uid || (await getCallerRole(req.uid!)) !== 'faculty') {
      res.status(403).json({ error: 'Access denied' })
      return
    }
    if (snap.data()!.status !== 'draft') {
      res.status(403).json({ error: 'Application has already been submitted' })
      return
    }
    const applicationData = snap.data()!
    if (applicationData.declaration !== true) {
      res.status(400).json({ error: 'The application declaration must be confirmed before submission' })
      return
    }
    if (applicationData.applicationType === 'self_evaluation') {
      const annualEvaluation = applicationData.annualEvaluation as Record<string, unknown> | undefined
      if (!annualEvaluation?.evaluationYear || !annualEvaluation.coursesTaught) {
        res.status(400).json({ error: 'Evaluation year and courses taught are required for an annual self-evaluation' })
        return
      }
    }
    if (typeof applicationData.cycleId === 'string') {
      const cycle = await db.collection('applicationCycles').doc(applicationData.cycleId).get()
      const cycleData = cycle.data()
      const now = Date.now()
      if (!cycle.exists || !cycleData?.isOpen ||
        now < Date.parse(String(cycleData.opensAt)) || now > Date.parse(String(cycleData.closesAt))) {
        res.status(403).json({ error: 'The application cycle is closed' })
        return
      }
      const requiredDocuments = Array.isArray(cycleData.requiredDocuments)
        ? cycleData.requiredDocuments as string[]
        : []
      const missing = requiredDocuments.filter((key) => {
        if (key === 'annualEvalDocs') {
          return !((applicationData.annualEvaluation as Record<string, unknown> | undefined)?.supportingDocuments as unknown[] | undefined)?.length
        }
        const document = (applicationData.documents as Record<string, unknown> | undefined)?.[key]
        const minimumCount = ['courseOutlines', 'assignments', 'teachingSupportDocs'].includes(key) ? 2 : 1
        return Array.isArray(document) ? document.length < minimumCount : !document
      })
      if (missing.length) {
        res.status(400).json({ error: `Complete the required documents: ${missing.join(', ')}` })
        return
      }
    }
    if (applicationData.applicationType === 'promotion') {
      const teaching = applicationData.teachingEffectiveness as Record<string, unknown> | undefined
      const documents = applicationData.documents as Record<string, unknown> | undefined
      const sloDocuments = teaching?.sloDocuments as unknown[] | undefined
      const courseOutlines = documents?.courseOutlines as unknown[] | undefined
      if (!sloDocuments?.length || (courseOutlines?.length ?? 0) < 2) {
        res.status(400).json({ error: 'Upload a sample SLO document and at least two course outlines before submitting' })
        return
      }
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
    // Runs after responding so the applicant isn't kept waiting on external sites.
    verifyAllPublications(req.params.id).catch((err) => console.error('Publication check after submit failed:', err))
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

// POST /api/applications/:id/publications/verify-all — check every publication (reviewers/admin)
router.post('/:id/publications/verify-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await getCallerRole(req.uid!)
    const allowed = role === 'admin' ||
      (role === 'internal_reviewer' && await isReviewerAssigned(req.params.id, req.uid!, role))
    if (!allowed) {
      res.status(403).json({ error: 'Assigned reviewer or admin access required' })
      return
    }
    const publications = await verifyAllPublications(req.params.id)
    if (!publications) {
      res.status(404).json({ error: 'Application not found' })
      return
    }
    await recordAudit(req.uid!, 'publications_verified', req.params.id, { count: publications.length })
    res.json({ publications })
  } catch (err) {
    console.error('POST /api/applications/:id/publications/verify-all error:', err)
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
    if (role === 'internal_reviewer' && !(await isReviewerAssigned(req.params.id, req.uid!, role))) {
      res.status(403).json({ error: 'Application assignment required' })
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

    await recordAudit(req.uid!, 'automated_evaluation_completed', req.params.id)
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
    if (!role || !['internal_reviewer', 'admin'].includes(role)) {
      res.status(403).json({ error: 'Reviewer or admin access required' })
      return
    }
    if (role === 'internal_reviewer' && !(await isReviewerAssigned(req.params.id, req.uid!, role))) {
      res.status(403).json({ error: 'Application assignment required' })
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
    if (!role || !['internal_reviewer', 'admin'].includes(role)) {
      res.status(403).json({ error: 'Reviewer or admin access required' })
      return
    }
    if (role === 'internal_reviewer' && !(await isReviewerAssigned(req.params.id, req.uid!, role))) {
      res.status(403).json({ error: 'Application assignment required' })
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
    if (!criterion || !comment?.trim() || comment.length > 5000) {
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
    await recordAudit(req.uid!, 'reviewer_comment_added', req.params.id, { criterion })
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
    if (!role || !['internal_reviewer', 'admin'].includes(role)) {
      res.status(403).json({ error: 'Reviewer or admin access required' })
      return
    }
    if (role === 'internal_reviewer' && !(await isReviewerAssigned(req.params.id, req.uid!, role))) {
      res.status(403).json({ error: 'Application assignment required' })
      return
    }
    await recordAudit(req.uid!, 'reviewer_comments_accessed', req.params.id)

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
  delete result.eligibilityResult
  delete result.teachingScore
  delete result.effortsScore
  delete result.scholarshipScore
  delete result.servicesScore
  delete result.totalScore

  // Remove rubricScores nested in each section
  for (const section of ['teachingEffectiveness', 'effortsToImprove', 'scholarship', 'services'] as const) {
    const sectionData = result[section]
    if (sectionData && typeof sectionData === 'object') {
      const {
        rubricScores,
        overallRating,
        chairRating,
        deanRating,
        studentRating,
        ...rest
      } = sectionData as Record<string, unknown>
      void rubricScores
      void overallRating
      void chairRating
      void deanRating
      void studentRating
      result[section] = rest
    }
  }

  return result
}

function stripApplicantOnlyFields(data: Record<string, unknown>): Record<string, unknown> {
  const result = stripReviewerOnlyFields(data)
  delete result.assignments
  delete result.snapshotId
  delete result.conflictDeclared
  delete result.conflictExplanation
  if (Array.isArray(result.publications)) {
    result.publications = (result.publications as Array<Record<string, unknown>>).map((publication) => {
      const { verification, recognized, ...rest } = publication
      void verification
      void recognized
      return rest
    })
  }
  return result
}

export default router
