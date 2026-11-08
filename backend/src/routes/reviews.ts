import { Router } from 'express'
import { db } from '../firebase-admin.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { FieldValue } from 'firebase-admin/firestore'
import { createNotification, recordAudit } from '../services/activityLog.js'

const router = Router()

const SECTION_MAX_MARKS = { teaching: 45, efforts: 10, scholarship: 25, services: 20 } as const
type MarkedSection = keyof typeof SECTION_MAX_MARKS
const MARKED_SECTIONS = Object.keys(SECTION_MAX_MARKS) as MarkedSection[]

// Returns cleaned marks, or null if any mark is outside its section's range.
function parseSectionMarks(value: unknown): Record<MarkedSection, number | null> | null {
  const input = (value ?? {}) as Record<string, unknown>
  const marks = {} as Record<MarkedSection, number | null>
  for (const section of MARKED_SECTIONS) {
    const mark = input[section] ?? null
    if (mark !== null && (typeof mark !== 'number' || !Number.isFinite(mark) || mark < 0 || mark > SECTION_MAX_MARKS[section])) return null
    marks[section] = mark as number | null
  }
  return marks
}

async function roleOf(uid: string): Promise<string | null> {
  const profile = await db.collection('users').doc(uid).get()
  return profile.exists ? String(profile.data()?.role ?? '') : null
}

async function isAssigned(applicationId: string, uid: string, role: string): Promise<boolean> {
  const ref = db.collection('applications').doc(applicationId)
  const snapshot = await ref.get()
  if (!snapshot.exists) return false
  const application = snapshot.data()!
  const assignments = application.assignments as Record<string, unknown> | undefined
  const assigned = role === 'internal_reviewer'
    ? assignments?.internalReviewer1Uid === uid || assignments?.internalReviewer2Uid === uid
    : role === 'external_reviewer' && application.applicationType === 'promotion' &&
      application.promotionType === 'full_professor' && assignments?.externalReviewerUid === uid
  if (!assigned) return false
  const conflict = await ref.collection('conflicts').doc(uid).get()
  return !conflict.exists || conflict.data()?.resolved === true
}

async function advanceIfAssessmentsComplete(applicationId: string): Promise<void> {
  const applicationRef = db.collection('applications').doc(applicationId)
  const snapshot = await applicationRef.get()
  if (!snapshot.exists) return
  const application = snapshot.data()!
  const assignments = application.assignments as Record<string, unknown> | undefined
  if (
    !assignments ||
    assignments.internalReviewer1Status !== 'submitted' ||
    assignments.internalReviewer2Status !== 'submitted'
  ) return
  const externalRequired = application.applicationType === 'promotion' && application.promotionType === 'full_professor'
  if (externalRequired && assignments.externalReviewerStatus !== 'submitted') return
  if (application.status === 'reviewed' || application.status === 'decision_made') return

  await applicationRef.update({ status: 'reviewed', updatedAt: FieldValue.serverTimestamp() })
  await recordAudit('system', 'assessments_completed', applicationId)
  if (application.applicationType === 'promotion') {
    const committeeMembers = await db.collection('users').where('role', '==', 'committee_member').get()
    await Promise.all(committeeMembers.docs.map((member) =>
      createNotification(member.id, 'committee_case_ready', 'A confidential application is ready for committee consideration.', applicationId),
    ))
  }
}

// ── Internal Reviews ──

// POST /api/reviews/internal/:applicationId — create internal review
router.post('/internal/:applicationId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profileSnap = await db.collection('users').doc(req.uid!).get()
    if (!profileSnap.exists || profileSnap.data()?.role !== 'internal_reviewer') {
      res.status(403).json({ error: 'Internal reviewer access required' })
      return
    }

    const { applicationId } = req.params
    if (!(await isAssigned(applicationId, req.uid!, 'internal_reviewer'))) {
      res.status(403).json({ error: 'Application assignment required' })
      return
    }
    const existing = await db.collection('applications').doc(applicationId)
      .collection('internalReviews').where('reviewerUid', '==', req.uid!).limit(1).get()
    if (!existing.empty) {
      res.json(existing.docs[0]!.data())
      return
    }
    const profile = profileSnap.data()!
    const ref = db.collection('applications').doc(applicationId).collection('internalReviews').doc(req.uid!)

    const review = {
      id: ref.id,
      applicationId,
      reviewerUid: req.uid!,
      reviewerName: profile.displayName,
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
      recommendation: 'recommended',
      sectionMarks: { teaching: null, efforts: null, scholarship: null, services: null },
      status: 'draft',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await ref.set(review)
    await recordAudit(req.uid!, 'reviewer_assessment_created', applicationId)
    res.json(review)
  } catch (err) {
    console.error('POST /api/reviews/internal error:', err)
    res.status(500).json({ error: 'Failed to create review' })
  }
})

// PUT /api/reviews/internal/:applicationId/:reviewId — save internal review
router.put('/internal/:applicationId/:reviewId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { applicationId, reviewId } = req.params
    const body = req.body as Record<string, unknown>
    const role = await roleOf(req.uid!)
    if (role !== 'internal_reviewer' || !(await isAssigned(applicationId, req.uid!, role))) {
      res.status(403).json({ error: 'Assigned internal reviewer access required' })
      return
    }
    const ref = db
      .collection('applications')
      .doc(applicationId)
      .collection('internalReviews')
      .doc(reviewId)
    const current = await ref.get()
    if (!current.exists || current.data()?.reviewerUid !== req.uid!) {
      res.status(403).json({ error: 'Review ownership required' })
      return
    }
    if (current.data()?.status === 'submitted') {
      res.status(403).json({ error: 'Submitted assessments are locked' })
      return
    }
    const fields = [
      'personalInfoComments',
      'qualificationsComments',
      'experienceComments',
      'publicationsComments',
      'teachingComments',
      'effortsComments',
      'scholarshipComments',
      'servicesComments',
      'researchComments',
      'overallComments',
    ]
    if (fields.some((key) => typeof body[key] !== 'string' || (body[key] as string).length > 10000) ||
      !['strongly_recommended', 'recommended', 'conditionally_recommended', 'not_recommended'].includes(String(body.recommendation))) {
      res.status(400).json({ error: 'Review comments and recommendation are invalid' })
      return
    }
    const sectionMarks = parseSectionMarks(body.sectionMarks)
    if (!sectionMarks) {
      res.status(400).json({ error: 'Marks must be between 0 and the maximum for each section' })
      return
    }
    const updates = Object.fromEntries(fields.map((key) => [key, body[key]]))
    updates.recommendation = body.recommendation
    updates.sectionMarks = sectionMarks
    await ref.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

    await recordAudit(req.uid!, 'reviewer_assessment_saved', applicationId)
    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/reviews/internal error:', err)
    res.status(500).json({ error: 'Failed to save review' })
  }
})

router.post('/internal/:applicationId/:reviewId/submit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { applicationId, reviewId } = req.params
    if ((await roleOf(req.uid!)) !== 'internal_reviewer' ||
      !(await isAssigned(applicationId, req.uid!, 'internal_reviewer')) || reviewId !== req.uid) {
      res.status(403).json({ error: 'Assigned internal reviewer access required' })
      return
    }
    const reviewRef = db.collection('applications').doc(applicationId).collection('internalReviews').doc(reviewId)
    const review = await reviewRef.get()
    if (!review.exists || review.data()?.status === 'submitted') {
      res.status(403).json({ error: 'Assessment is missing or already submitted' })
      return
    }
    const application = (await db.collection('applications').doc(applicationId).get()).data()!
    const fields = application.applicationType === 'promotion'
      ? [
          'qualificationsComments', 'experienceComments', 'publicationsComments', 'teachingComments',
          'effortsComments', 'scholarshipComments', 'servicesComments', 'researchComments', 'overallComments',
        ]
      : [
          'personalInfoComments', 'qualificationsComments', 'experienceComments', 'teachingComments',
          'effortsComments', 'scholarshipComments', 'servicesComments', 'overallComments',
        ]
    const content = review.data()!
    const incomplete = fields.some((key) => {
      const value = typeof content[key] === 'string' ? content[key].trim() : ''
      return !value || value.split(/\s+/).length > 200
    })
    if (incomplete) {
      res.status(400).json({ error: 'Complete every required comment in 200 words or fewer before submitting' })
      return
    }
    const marks = parseSectionMarks(content.sectionMarks)
    if (!marks || MARKED_SECTIONS.some((section) => marks[section] === null)) {
      res.status(400).json({ error: 'Enter marks for Teaching, Efforts, Scholarship and Services before submitting' })
      return
    }
    await reviewRef.update({ status: 'submitted', submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
    const applicationRef = db.collection('applications').doc(applicationId)
    const assignments = application.assignments as Record<string, unknown>
    const slot = assignments.internalReviewer1Uid === req.uid ? 'internalReviewer1Status' : 'internalReviewer2Status'
    await applicationRef.update({ [`assignments.${slot}`]: 'submitted', updatedAt: FieldValue.serverTimestamp() })
    await recordAudit(req.uid!, 'reviewer_assessment_submitted', applicationId)
    await advanceIfAssessmentsComplete(applicationId)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to submit assessment' })
  }
})

// GET /api/reviews/internal/:applicationId — get all internal reviews for an app
router.get('/internal/:applicationId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await roleOf(req.uid!)
    if (!['internal_reviewer', 'admin'].includes(String(role)) ||
      (role === 'internal_reviewer' && !(await isAssigned(req.params.applicationId, req.uid!, role)))) {
      res.status(403).json({ error: 'Assigned internal reviewer access required' })
      return
    }
    const reviewsRef = db
      .collection('applications')
      .doc(req.params.applicationId)
      .collection('internalReviews')
    const snap = role === 'admin'
      ? await reviewsRef.get()
      : await reviewsRef.where('reviewerUid', '==', req.uid!).get()
    res.json(snap.docs.map((d) => d.data()))
  } catch (err) {
    console.error('GET /api/reviews/internal error:', err)
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

// GET /api/reviews/internal/:applicationId/mine — get my review for an application
router.get('/internal/:applicationId/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'internal_reviewer' ||
      !(await isAssigned(req.params.applicationId, req.uid!, 'internal_reviewer'))) {
      res.status(403).json({ error: 'Assigned internal reviewer access required' })
      return
    }
    const snap = await db
      .collection('applications')
      .doc(req.params.applicationId)
      .collection('internalReviews')
      .where('reviewerUid', '==', req.uid!)
      .get()

    if (snap.empty) {
      res.json(null)
    } else {
      res.json(snap.docs[0]!.data())
    }
  } catch (err) {
    console.error('GET /api/reviews/internal/mine error:', err)
    res.status(500).json({ error: 'Failed to fetch review' })
  }
})

// ── External Reviews ──

// POST /api/reviews/external/:applicationId — create external review
router.post('/external/:applicationId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profileSnap = await db.collection('users').doc(req.uid!).get()
    if (!profileSnap.exists || profileSnap.data()?.role !== 'external_reviewer') {
      res.status(403).json({ error: 'External reviewer access required' })
      return
    }

    const { applicationId } = req.params
    if (!(await isAssigned(applicationId, req.uid!, 'external_reviewer'))) {
      res.status(403).json({ error: 'Assigned Professor application required' })
      return
    }
    const existing = await db.collection('applications').doc(applicationId)
      .collection('externalReviews').where('reviewerUid', '==', req.uid!).limit(1).get()
    if (!existing.empty) {
      res.json(existing.docs[0]!.data())
      return
    }
    const profile = profileSnap.data()!
    const ref = db.collection('applications').doc(applicationId).collection('externalReviews').doc(req.uid!)

    const review = {
      id: ref.id,
      applicationId,
      reviewerUid: req.uid!,
      reviewerName: profile.displayName,
      academicStanding: '',
      researchProductivity: '',
      visibilityContribution: '',
      overallEvaluation: 'recommended',
      status: 'draft',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await ref.set(review)
    await recordAudit(req.uid!, 'external_assessment_created', applicationId)
    res.json(review)
  } catch (err) {
    console.error('POST /api/reviews/external error:', err)
    res.status(500).json({ error: 'Failed to create review' })
  }
})

// PUT /api/reviews/external/:applicationId/:reviewId — save external review
router.put('/external/:applicationId/:reviewId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { applicationId, reviewId } = req.params
    const body = req.body as Record<string, unknown>
    if ((await roleOf(req.uid!)) !== 'external_reviewer' ||
      !(await isAssigned(applicationId, req.uid!, 'external_reviewer'))) {
      res.status(403).json({ error: 'Assigned external reviewer access required' })
      return
    }
    const ref = db
      .collection('applications')
      .doc(applicationId)
      .collection('externalReviews')
      .doc(reviewId)
    const current = await ref.get()
    if (!current.exists || current.data()?.reviewerUid !== req.uid!) {
      res.status(403).json({ error: 'Review ownership required' })
      return
    }
    if (current.data()?.status === 'submitted') {
      res.status(403).json({ error: 'Submitted assessments are locked' })
      return
    }
    const safeUpdates = Object.fromEntries(
      ['academicStanding', 'researchProductivity', 'visibilityContribution', 'overallEvaluation']
        .filter((key) => key in body)
        .map((key) => [key, body[key]]),
    )
    await ref
      .set({ ...safeUpdates, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

    await recordAudit(req.uid!, 'external_assessment_saved', applicationId)

    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/reviews/external error:', err)
    res.status(500).json({ error: 'Failed to save review' })
  }
})

router.post('/external/:applicationId/:reviewId/submit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { applicationId, reviewId } = req.params
    if ((await roleOf(req.uid!)) !== 'external_reviewer' ||
      !(await isAssigned(applicationId, req.uid!, 'external_reviewer')) || reviewId !== req.uid) {
      res.status(403).json({ error: 'Assigned external reviewer access required' })
      return
    }
    const reviewRef = db.collection('applications').doc(applicationId).collection('externalReviews').doc(reviewId)
    const review = await reviewRef.get()
    if (!review.exists || review.data()?.status === 'submitted') {
      res.status(403).json({ error: 'Assessment is missing or already submitted' })
      return
    }
    const content = review.data()!
    const fields = ['academicStanding', 'researchProductivity', 'visibilityContribution']
    if (fields.some((key) => typeof content[key] !== 'string' || !String(content[key]).trim() ||
      String(content[key]).trim().split(/\s+/).length > 200)) {
      res.status(400).json({ error: 'Complete each evaluation section in 200 words or fewer before submitting' })
      return
    }
    await reviewRef.update({ status: 'submitted', submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
    await db.collection('applications').doc(applicationId).update({
      'assignments.externalReviewerStatus': 'submitted',
      updatedAt: FieldValue.serverTimestamp(),
    })
    await recordAudit(req.uid!, 'external_assessment_submitted', applicationId)
    await advanceIfAssessmentsComplete(applicationId)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to submit external assessment' })
  }
})

// GET /api/reviews/external/:applicationId — get all external reviews
router.get('/external/:applicationId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await roleOf(req.uid!)
    if (!['external_reviewer', 'admin'].includes(String(role)) ||
      (role === 'external_reviewer' && !(await isAssigned(req.params.applicationId, req.uid!, role)))) {
      res.status(403).json({ error: 'Assigned reviewer access required' })
      return
    }
    const ref = db
      .collection('applications')
      .doc(req.params.applicationId)
      .collection('externalReviews')
    const snap = role === 'admin'
      ? await ref.get()
      : await ref.where('reviewerUid', '==', req.uid!).get()
    res.json(snap.docs.map((d) => d.data()))
  } catch (err) {
    console.error('GET /api/reviews/external error:', err)
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

export default router
