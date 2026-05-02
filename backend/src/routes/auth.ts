import { Router } from 'express'
import { db, adminAuth } from '../firebase-admin.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { FieldValue } from 'firebase-admin/firestore'

const router = Router()

// GET /api/auth/me — get current user profile
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db.collection('users').doc(req.uid!).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Profile not found' })
      return
    }
    res.json(snap.data())
  } catch (err) {
    console.error('GET /api/auth/me error:', err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

// POST /api/auth/register — create user profile in Firestore
router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { displayName, role, department } = req.body as {
      displayName: string
      role: string
      department?: string
    }

    if (!displayName || !role) {
      res.status(400).json({ error: 'displayName and role are required' })
      return
    }

    const allowedRoles = ['faculty', 'internal_reviewer', 'external_reviewer', 'admin']
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role' })
      return
    }

    const profile = {
      uid: req.uid!,
      email: req.userEmail!,
      displayName,
      role,
      department: department || '',
      createdAt: FieldValue.serverTimestamp(),
    }

    await db.collection('users').doc(req.uid!).set(profile)
    res.json(profile)
  } catch (err) {
    console.error('POST /api/auth/register error:', err)
    res.status(500).json({ error: 'Failed to create profile' })
  }
})

// POST /api/auth/bootstrap — ensure profile exists for authenticated user
router.post('/bootstrap', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRef = db.collection('users').doc(req.uid!)
    const snap = await userRef.get()

    if (snap.exists) {
      res.json({ created: false, profile: snap.data() })
      return
    }

    const body = req.body as { displayName?: string; department?: string }
    const fallbackName = req.userEmail ? req.userEmail.split('@')[0] : 'New User'
    const profile = {
      uid: req.uid!,
      email: req.userEmail || '',
      displayName: body.displayName?.trim() || fallbackName,
      role: 'faculty',
      department: body.department?.trim() || '',
      createdAt: FieldValue.serverTimestamp(),
    }

    await userRef.set(profile)
    res.json({ created: true, profile })
  } catch (err) {
    console.error('POST /api/auth/bootstrap error:', err)
    res.status(500).json({ error: 'Failed to bootstrap profile' })
  }
})

// GET /api/auth/users — admin: list all users
router.get('/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const callerSnap = await db.collection('users').doc(req.uid!).get()
    if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const snap = await db.collection('users').get()
    res.json(snap.docs.map((d) => d.data()))
  } catch (err) {
    console.error('GET /api/auth/users error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// PUT /api/auth/users/:uid/role — admin: change user role
router.put('/users/:uid/role', requireAuth, async (req: AuthRequest, res) => {
  try {
    const callerSnap = await db.collection('users').doc(req.uid!).get()
    if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const { role } = req.body as { role: string }
    const allowedRoles = ['faculty', 'internal_reviewer', 'external_reviewer', 'admin']
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role' })
      return
    }

    await db.collection('users').doc(req.params.uid).update({ role })
    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/auth/users/:uid/role error:', err)
    res.status(500).json({ error: 'Failed to update role' })
  }
})

// DELETE /api/auth/users/:uid — admin: delete user profile
router.delete('/users/:uid', requireAuth, async (req: AuthRequest, res) => {
  try {
    const callerSnap = await db.collection('users').doc(req.uid!).get()
    if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    await db.collection('users').doc(req.params.uid).delete()
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/auth/users/:uid error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
