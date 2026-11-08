import { Router } from 'express'
import { db, adminAuth } from '../firebase-admin.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { FieldValue } from 'firebase-admin/firestore'
import { randomInt } from 'node:crypto'
import { recordAudit } from '../services/activityLog.js'

const router = Router()

// Firebase logins need an email, so a username maps to this reserved domain.
// No mail is ever sent to these addresses.
const GENERATED_LOGIN_DOMAIN = 'reviewers.example.com'
const USERNAME_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
const MIN_PASSWORD_LENGTH = 10

function randomString(alphabet: string, length: number): string {
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('')
}

async function isAdmin(uid: string): Promise<boolean> {
  return (await db.collection('users').doc(uid).get()).data()?.role === 'admin'
}

// Loads a user created by POST /reviewer-accounts; other accounts are off limits here.
async function getGeneratedLogin(uid: string) {
  const snap = await db.collection('users').doc(uid).get()
  return snap.data()?.generatedLogin === true ? snap.data()! : null
}

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

    const allowedRoles = ['faculty']
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
    res.json(snap.docs.map((d) => {
      const data = d.data()
      return { ...data, createdAt: data.createdAt?.toDate?.().toISOString() ?? data.createdAt }
    }))
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
    const allowedRoles = ['faculty', 'internal_reviewer', 'external_reviewer', 'committee_member', 'admin']
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

// POST /api/auth/reviewer-accounts — admin: generate a reviewer's login
router.post('/reviewer-accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await isAdmin(req.uid!))) {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    const { displayName, role, department } = req.body as Record<string, unknown>
    const name = typeof displayName === 'string' ? displayName.trim() : ''
    if (name.length < 2 || name.length > 100) {
      res.status(400).json({ error: 'Enter the reviewer\'s full name' })
      return
    }
    if (role !== 'internal_reviewer' && role !== 'external_reviewer') {
      res.status(400).json({ error: 'Choose internal or external reviewer' })
      return
    }

    const password = randomString(PASSWORD_ALPHABET, 14)
    const prefix = role === 'internal_reviewer' ? 'int' : 'ext'
    let username = ''
    let uid = ''
    for (let attempt = 0; attempt < 5 && !uid; attempt++) {
      username = `${prefix}-${randomString(USERNAME_ALPHABET, 5)}`
      try {
        uid = (await adminAuth.createUser({
          email: `${username}@${GENERATED_LOGIN_DOMAIN}`,
          password,
          displayName: name,
          emailVerified: true,
        })).uid
      } catch (err) {
        if ((err as { code?: string }).code !== 'auth/email-already-exists') throw err
      }
    }
    if (!uid) {
      res.status(500).json({ error: 'Could not generate a unique username. Try again.' })
      return
    }

    try {
      await adminAuth.setCustomUserClaims(uid, { generatedLogin: true, mustChangePassword: true })
      await db.collection('users').doc(uid).set({
        uid,
        email: `${username}@${GENERATED_LOGIN_DOMAIN}`,
        username,
        displayName: name,
        role,
        department: typeof department === 'string' ? department.trim() : '',
        generatedLogin: true,
        mustChangePassword: true,
        disabled: false,
        createdBy: req.uid,
        createdAt: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      await adminAuth.deleteUser(uid).catch(() => undefined)
      throw err
    }

    await recordAudit(req.uid!, 'reviewer_login_generated', undefined, { reviewerUid: uid, username, role })
    res.set('Cache-Control', 'no-store').json({ uid, username, password, displayName: name, role })
  } catch (err) {
    console.error('POST /api/auth/reviewer-accounts error:', err)
    res.status(500).json({ error: 'Failed to generate login' })
  }
})

// POST /api/auth/users/:uid/reset-password — admin: issue a new temporary password
router.post('/users/:uid/reset-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await isAdmin(req.uid!))) {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    const account = await getGeneratedLogin(req.params.uid)
    if (!account) {
      res.status(400).json({ error: 'Only generated reviewer logins can be reset here' })
      return
    }
    const password = randomString(PASSWORD_ALPHABET, 14)
    await adminAuth.setCustomUserClaims(req.params.uid, { generatedLogin: true, mustChangePassword: true })
    await adminAuth.updateUser(req.params.uid, { password })
    await db.collection('users').doc(req.params.uid).update({ mustChangePassword: true })
    await recordAudit(req.uid!, 'reviewer_password_reset', undefined, { reviewerUid: req.params.uid })
    res.set('Cache-Control', 'no-store').json({
      uid: req.params.uid,
      username: account.username,
      password,
      displayName: account.displayName,
      role: account.role,
    })
  } catch (err) {
    console.error('POST /api/auth/users/:uid/reset-password error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// PUT /api/auth/users/:uid/disabled — admin: disable or re-enable a generated login
router.put('/users/:uid/disabled', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await isAdmin(req.uid!))) {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    if (!(await getGeneratedLogin(req.params.uid))) {
      res.status(400).json({ error: 'Only generated reviewer logins can be disabled here' })
      return
    }
    const disabled = (req.body as { disabled?: unknown }).disabled === true
    await adminAuth.updateUser(req.params.uid, { disabled })
    if (disabled) await adminAuth.revokeRefreshTokens(req.params.uid)
    await db.collection('users').doc(req.params.uid).update({ disabled })
    await recordAudit(req.uid!, disabled ? 'reviewer_login_disabled' : 'reviewer_login_enabled', undefined, { reviewerUid: req.params.uid })
    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/auth/users/:uid/disabled error:', err)
    res.status(500).json({ error: 'Failed to update account' })
  }
})

// POST /api/auth/change-password — generated login replaces its temporary password
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.generatedLogin) {
      res.status(403).json({ error: 'Not available for this account' })
      return
    }
    const { newPassword } = req.body as { newPassword?: unknown }
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
      return
    }
    await adminAuth.setCustomUserClaims(req.uid!, { generatedLogin: true })
    await adminAuth.updateUser(req.uid!, { password: newPassword })
    await db.collection('users').doc(req.uid!).update({ mustChangePassword: false })
    await recordAudit(req.uid!, 'reviewer_password_changed')
    res.json({ success: true })
  } catch (err) {
    console.error('POST /api/auth/change-password error:', err)
    res.status(500).json({ error: 'Failed to change password' })
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
