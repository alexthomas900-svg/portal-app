import { Router } from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebase-admin.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { createNotification, recordAudit } from '../services/activityLog.js'

const router = Router()
const applicationTypes = ['promotion', 'contract_renewal', 'self_evaluation']
const committeeDecisions = ['approved', 'not_approved', 'deferred', 'returned_for_information']

async function roleOf(uid: string): Promise<string | null> {
  const profile = await db.collection('users').doc(uid).get()
  return profile.exists ? String(profile.data()?.role ?? '') : null
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

router.get('/cycles', requireAuth, async (_req, res) => {
  try {
    const snapshot = await db.collection('applicationCycles').get()
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch application cycles' })
  }
})

router.post('/cycles', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const { name, applicationType, promotionType, academicYear, opensAt, closesAt, requiredDocuments } =
      req.body as Record<string, unknown>
    if (
      typeof name !== 'string' ||
      !applicationTypes.includes(String(applicationType)) ||
      typeof academicYear !== 'string' ||
      !isValidDate(opensAt) ||
      !isValidDate(closesAt) ||
      Date.parse(opensAt) >= Date.parse(closesAt) ||
      (applicationType === 'promotion' && !['associate_professor', 'full_professor'].includes(String(promotionType)))
    ) {
      res.status(400).json({ error: 'A valid name, type, year, and opening/closing date range are required' })
      return
    }

    const cycle = {
      name: name.trim(),
      applicationType,
      ...(applicationType === 'promotion' ? { promotionType } : {}),
      academicYear: academicYear.trim(),
      opensAt: new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
      requiredDocuments: Array.isArray(requiredDocuments)
        ? requiredDocuments.filter((item): item is string => typeof item === 'string').slice(0, 50)
        : [],
      isOpen: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    const ref = await db.collection('applicationCycles').add(cycle)
    await recordAudit(req.uid!, 'cycle_created', undefined, { cycleId: ref.id })
    const faculty = await db.collection('users').where('role', '==', 'faculty').get()
    await Promise.all(faculty.docs.map((user) => createNotification(
      user.id,
      'application_opening',
      `${String(applicationType).replaceAll('_', ' ')} applications are scheduled to open ${new Date(opensAt).toLocaleDateString()} for ${academicYear}.`,
    )))
    res.status(201).json({ id: ref.id, ...cycle })
  } catch {
    res.status(500).json({ error: 'Failed to create application cycle' })
  }
})

router.put('/cycles/:cycleId', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const { isOpen, opensAt, closesAt, requiredDocuments } = req.body as Record<string, unknown>
    if (
      typeof isOpen !== 'boolean' ||
      !isValidDate(opensAt) ||
      !isValidDate(closesAt) ||
      Date.parse(opensAt) >= Date.parse(closesAt)
    ) {
      res.status(400).json({ error: 'A valid open state and date range are required' })
      return
    }
    const ref = db.collection('applicationCycles').doc(req.params.cycleId)
    if (!(await ref.get()).exists) {
      res.status(404).json({ error: 'Application cycle not found' })
      return
    }
    await ref.update({
      isOpen,
      opensAt: new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
      ...(Array.isArray(requiredDocuments)
        ? { requiredDocuments: requiredDocuments.filter((item): item is string => typeof item === 'string').slice(0, 50) }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })
    await recordAudit(req.uid!, 'cycle_updated', undefined, { cycleId: ref.id, isOpen })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to update application cycle' })
  }
})

router.get('/reviewers', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    const snapshot = await db.collection('users').where('role', 'in', ['internal_reviewer', 'external_reviewer']).get()
    res.json(snapshot.docs.map((doc) => ({ uid: doc.id, displayName: doc.data().displayName, email: doc.data().email, role: doc.data().role })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch reviewers' })
  }
})

router.put('/applications/:applicationId/assignments', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    const applicationRef = db.collection('applications').doc(req.params.applicationId)
    const applicationSnapshot = await applicationRef.get()
    if (!applicationSnapshot.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }

    const { internalReviewer1Uid, internalReviewer2Uid, externalReviewerUid } =
      req.body as Record<string, unknown>
    if (
      typeof internalReviewer1Uid !== 'string' ||
      typeof internalReviewer2Uid !== 'string' ||
      !internalReviewer1Uid ||
      !internalReviewer2Uid ||
      internalReviewer1Uid === internalReviewer2Uid
    ) {
      res.status(400).json({ error: 'Two different internal reviewers are required' })
      return
    }
    const application = applicationSnapshot.data()!
    if (application.applicationType === 'promotion' && application.promotionType === 'full_professor' &&
      typeof externalReviewerUid !== 'string') {
      res.status(400).json({ error: 'A Professor application requires an external reviewer' })
      return
    }
    if (externalReviewerUid && (application.applicationType !== 'promotion' || application.promotionType !== 'full_professor')) {
      res.status(400).json({ error: 'External reviewers are only available for Professor applications' })
      return
    }
    const [reviewer1Role, reviewer2Role, externalRole] = await Promise.all([
      roleOf(internalReviewer1Uid),
      roleOf(internalReviewer2Uid),
      typeof externalReviewerUid === 'string' && externalReviewerUid ? roleOf(externalReviewerUid) : Promise.resolve(null),
    ])
    if (reviewer1Role !== 'internal_reviewer' || reviewer2Role !== 'internal_reviewer' ||
      (externalReviewerUid && externalRole !== 'external_reviewer')) {
      res.status(400).json({ error: 'Reviewer assignments must match the selected account roles' })
      return
    }
    const conflicts = await applicationRef.collection('conflicts').get()
    const assignedUids = [internalReviewer1Uid, internalReviewer2Uid, externalReviewerUid].filter(
      (uid): uid is string => typeof uid === 'string' && Boolean(uid),
    )
    if (conflicts.docs.some((conflict) =>
      conflict.data().resolved !== true && assignedUids.includes(String(conflict.data().reviewerUid)),
    )) {
      res.status(409).json({ error: 'A reviewer with an unresolved conflict cannot be assigned' })
      return
    }
    const previous = application.assignments as Record<string, unknown> | undefined
    const normalizedExternalUid = typeof externalReviewerUid === 'string' && externalReviewerUid
      ? externalReviewerUid
      : null
    const assignmentChanged = previous?.internalReviewer1Uid !== internalReviewer1Uid ||
      previous?.internalReviewer2Uid !== internalReviewer2Uid ||
      (previous?.externalReviewerUid ?? null) !== normalizedExternalUid
    if (assignmentChanged && application.status === 'decision_made') {
      res.status(409).json({ error: 'Reviewer assignments cannot change after a decision is recorded' })
      return
    }
    const assignments = {
      internalReviewer1Uid,
      internalReviewer2Uid,
      externalReviewerUid: normalizedExternalUid,
      internalReviewer1Status: previous?.internalReviewer1Uid === internalReviewer1Uid
        ? previous?.internalReviewer1Status ?? 'assigned'
        : 'assigned',
      internalReviewer2Status: previous?.internalReviewer2Uid === internalReviewer2Uid
        ? previous?.internalReviewer2Status ?? 'assigned'
        : 'assigned',
      ...(normalizedExternalUid ? {
        externalReviewerStatus: previous?.externalReviewerUid === normalizedExternalUid
          ? previous?.externalReviewerStatus ?? 'assigned'
          : 'assigned',
      } : {}),
      updatedAt: new Date().toISOString(),
    }
    await applicationRef.update({
      assignments,
      ...(application.status === 'submitted' || assignmentChanged && application.status === 'reviewed'
        ? { status: 'under_review' }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })
    await recordAudit(req.uid!, 'reviewers_assigned', req.params.applicationId, {
      internalReviewer1Uid,
      internalReviewer2Uid,
      externalReviewerUid: assignments.externalReviewerUid,
    })
    await Promise.all(
      [internalReviewer1Uid, internalReviewer2Uid, assignments.externalReviewerUid]
        .filter((uid): uid is string => Boolean(uid))
        .map((uid) => createNotification(uid, 'reviewer_assignment', 'You have been assigned an application for review.', req.params.applicationId)),
    )
    res.json({ assignments })
  } catch {
    res.status(500).json({ error: 'Failed to assign reviewers' })
  }
})

router.get('/applications/:applicationId/conflicts', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    const snapshot = await db.collection('applications').doc(req.params.applicationId).collection('conflicts').get()
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch conflict declarations' })
  }
})

router.post('/applications/:applicationId/conflicts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const applicationRef = db.collection('applications').doc(req.params.applicationId)
    const applicationSnapshot = await applicationRef.get()
    if (!applicationSnapshot.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }
    const role = await roleOf(req.uid!)
    const assignments = applicationSnapshot.data()?.assignments as Record<string, unknown> | undefined
    if (
      !['internal_reviewer', 'external_reviewer'].includes(String(role)) ||
      !assignments ||
      !Object.values(assignments).includes(req.uid)
    ) {
      res.status(403).json({ error: 'Only an assigned reviewer may declare a conflict' })
      return
    }
    const { explanation } = req.body as { explanation?: string }
    if (typeof explanation !== 'string' || explanation.trim().length < 10) {
      res.status(400).json({ error: 'Please provide a conflict explanation of at least 10 characters' })
      return
    }
    await applicationRef.collection('conflicts').doc(req.uid!).set({
      reviewerUid: req.uid,
      explanation: explanation.trim(),
      declaredAt: FieldValue.serverTimestamp(),
      resolved: false,
    })
    await recordAudit(req.uid!, 'conflict_declared', req.params.applicationId)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to record conflict declaration' })
  }
})

router.post('/applications/:applicationId/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    const application = await db.collection('applications').doc(req.params.applicationId).get()
    if (!application.exists || typeof application.data()?.applicantUid !== 'string') {
      res.status(404).json({ error: 'Application not found' })
      return
    }
    const { message, type } = req.body as { message?: string; type?: string }
    if (!message?.trim() || message.length > 1000 ||
      !['clarification_request', 'missing_documents', 'application_update'].includes(String(type))) {
      res.status(400).json({ error: 'A supported notification type and message of 1,000 characters or fewer are required' })
      return
    }
    const recipientUid = application.data()!.applicantUid as string
    await createNotification(recipientUid, type!, message.trim(), req.params.applicationId)
    await recordAudit(req.uid!, 'applicant_notification_sent', req.params.applicationId, { type })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to send applicant notification' })
  }
})

router.post('/documents/audit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { applicationId, category, fileName } = req.body as {
      applicationId?: string
      category?: string
      fileName?: string
    }
    if (typeof applicationId !== 'string' || typeof category !== 'string' || typeof fileName !== 'string' ||
      fileName.length > 255 || category.length > 100) {
      res.status(400).json({ error: 'A valid application and document description are required' })
      return
    }
    const application = await db.collection('applications').doc(applicationId).get()
    if (!application.exists || application.data()?.applicantUid !== req.uid ||
      (await roleOf(req.uid!)) !== 'faculty' || application.data()?.status !== 'draft') {
      res.status(403).json({ error: 'Only the owner of a draft application may upload documents' })
      return
    }
    await recordAudit(req.uid!, 'document_uploaded_or_replaced', applicationId, { category, fileName })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to record document upload' })
  }
})

router.get('/applications/:applicationId/committee', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!['admin', 'committee_member'].includes(String(await roleOf(req.uid!)))) {
      res.status(403).json({ error: 'Committee access required' })
      return
    }
    const snapshot = await db.collection('applications').doc(req.params.applicationId).get()
    if (!snapshot.exists) {
      res.status(404).json({ error: 'Application not found' })
      return
    }
    const application = snapshot.data()!
    if (!['reviewed', 'decision_made'].includes(String(application.status))) {
      res.status(404).json({ error: 'Reviewed application not found' })
      return
    }
    const assignments = application.assignments as Record<string, unknown> | undefined
    const decisionSnapshot = await db.collection('committeeDecisions').doc(req.params.applicationId).get()
    const [internalReviews, externalReviews] = await Promise.all([
      db.collection('applications').doc(req.params.applicationId).collection('internalReviews').get(),
      application.applicationType === 'promotion' && application.promotionType === 'full_professor'
        ? db.collection('applications').doc(req.params.applicationId).collection('externalReviews').get()
        : Promise.resolve(null),
    ])
    const internalReviewerUids = [assignments?.internalReviewer1Uid, assignments?.internalReviewer2Uid]
    await recordAudit(req.uid!, 'confidential_application_accessed', req.params.applicationId)
    res.json({
      application,
      decision: decisionSnapshot.exists ? decisionSnapshot.data() : null,
      internalReviews: internalReviews.docs
        .map((doc) => doc.data())
        .filter((review) => review.status === 'submitted' && internalReviewerUids.includes(review.reviewerUid)),
      externalReviews: externalReviews?.docs
        .map((doc) => doc.data())
        .filter((review) => review.status === 'submitted' && review.reviewerUid === assignments?.externalReviewerUid) ?? [],
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch committee record' })
  }
})

router.get('/committee/applications', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!['admin', 'committee_member'].includes(String(await roleOf(req.uid!)))) {
      res.status(403).json({ error: 'Committee access required' })
      return
    }
    const snapshot = await db.collection('applications')
      .where('status', 'in', ['reviewed', 'decision_made'])
      .get()
    res.json(snapshot.docs.map((doc) => {
      const data = doc.data()
      return { id: doc.id, applicantName: data.applicantName, applicationType: data.applicationType, promotionType: data.promotionType, status: data.status, submittedAt: data.submittedAt }
    }))
  } catch {
    res.status(500).json({ error: 'Failed to fetch committee applications' })
  }
})

router.post('/applications/:applicationId/committee-decision', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await roleOf(req.uid!)
    if (!['admin', 'committee_member'].includes(String(role))) {
      res.status(403).json({ error: 'Committee access required' })
      return
    }
    const { decision, justification, meetingDate, observations } = req.body as Record<string, unknown>
    if (!committeeDecisions.includes(String(decision)) || typeof justification !== 'string' || !justification.trim() ||
      !isValidDate(meetingDate)) {
      res.status(400).json({ error: 'A valid decision, written justification, and meeting date are required' })
      return
    }
    const applicationRef = db.collection('applications').doc(req.params.applicationId)
    const applicationSnapshot = await applicationRef.get()
    if (!applicationSnapshot.exists || !['reviewed', 'decision_made'].includes(String(applicationSnapshot.data()?.status))) {
      res.status(404).json({ error: 'Reviewed application not found' })
      return
    }
    const record = {
      applicationId: req.params.applicationId,
      decision,
      justification: justification.trim(),
      meetingDate: new Date(meetingDate).toISOString(),
      observations: typeof observations === 'string' ? observations.trim() : '',
      recordedBy: req.uid,
      recordedAt: FieldValue.serverTimestamp(),
      authorized: false,
    }
    await db.collection('committeeDecisions').doc(req.params.applicationId).set(record)
    await recordAudit(req.uid!, 'committee_decision_recorded', req.params.applicationId, { decision })
    res.json({ ...record, recordedAt: new Date().toISOString() })
  } catch {
    res.status(500).json({ error: 'Failed to save committee decision' })
  }
})

router.post('/applications/:applicationId/committee-decision/authorize', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'admin') {
      res.status(403).json({ error: 'Admin authorization required' })
      return
    }
    const decisionRef = db.collection('committeeDecisions').doc(req.params.applicationId)
    const decision = await decisionRef.get()
    if (!decision.exists) {
      res.status(404).json({ error: 'Committee decision not found' })
      return
    }
    const finalDecision = String(decision.data()?.decision)
    await decisionRef.update({ authorized: true, authorizedBy: req.uid, authorizedAt: FieldValue.serverTimestamp() })
    await db.collection('applications').doc(req.params.applicationId).update({
      status: 'decision_made',
      finalDecision,
      updatedAt: FieldValue.serverTimestamp(),
    })
    const application = (await db.collection('applications').doc(req.params.applicationId).get()).data()
    if (typeof application?.applicantUid === 'string') {
      await createNotification(
        application.applicantUid,
        'final_decision',
        `An official decision has been recorded: ${finalDecision.replaceAll('_', ' ')}.`,
        req.params.applicationId,
      )
    }
    await recordAudit(req.uid!, 'final_decision_authorized', req.params.applicationId, { decision: finalDecision })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to authorize final decision' })
  }
})

router.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snapshot = await db.collection('users').doc(req.uid!).collection('notifications').orderBy('createdAt', 'desc').limit(50).get()
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

router.get('/audit', requireAuth, async (req: AuthRequest, res) => {
  try {
    if ((await roleOf(req.uid!)) !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    const snapshot = await db.collection('auditLogs').orderBy('createdAt', 'desc').limit(100).get()
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit log' })
  }
})

export default router
