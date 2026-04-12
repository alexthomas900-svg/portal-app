import { Router } from 'express'
import { db } from '../firebase-admin.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { FieldValue } from 'firebase-admin/firestore'

const router = Router()

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
    const profile = profileSnap.data()!
    const ref = db.collection('applications').doc(applicationId).collection('internalReviews').doc()

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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await ref.set(review)
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

    await db
      .collection('applications')
      .doc(applicationId)
      .collection('internalReviews')
      .doc(reviewId)
      .set({ ...body, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/reviews/internal error:', err)
    res.status(500).json({ error: 'Failed to save review' })
  }
})

// GET /api/reviews/internal/:applicationId — get all internal reviews for an app
router.get('/internal/:applicationId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db
      .collection('applications')
      .doc(req.params.applicationId)
      .collection('internalReviews')
      .get()
    res.json(snap.docs.map((d) => d.data()))
  } catch (err) {
    console.error('GET /api/reviews/internal error:', err)
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

// GET /api/reviews/internal/:applicationId/mine — get my review for an application
router.get('/internal/:applicationId/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
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
    const profile = profileSnap.data()!
    const ref = db.collection('applications').doc(applicationId).collection('externalReviews').doc()

    const review = {
      id: ref.id,
      applicationId,
      reviewerUid: req.uid!,
      reviewerName: profile.displayName,
      academicStanding: '',
      researchProductivity: '',
      visibilityContribution: '',
      overallEvaluation: 'recommended',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await ref.set(review)
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

    await db
      .collection('applications')
      .doc(applicationId)
      .collection('externalReviews')
      .doc(reviewId)
      .set({ ...body, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/reviews/external error:', err)
    res.status(500).json({ error: 'Failed to save review' })
  }
})

// GET /api/reviews/external/:applicationId — get all external reviews
router.get('/external/:applicationId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db
      .collection('applications')
      .doc(req.params.applicationId)
      .collection('externalReviews')
      .get()
    res.json(snap.docs.map((d) => d.data()))
  } catch (err) {
    console.error('GET /api/reviews/external error:', err)
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

export default router
