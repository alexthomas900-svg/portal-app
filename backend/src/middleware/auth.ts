import type { Request, Response, NextFunction } from 'express'
import { adminAuth } from '../firebase-admin.js'

export interface AuthRequest extends Request<Record<string, string>> {
  uid?: string
  userEmail?: string
  generatedLogin?: boolean
}

// All a generated login may reach until its temporary password is replaced.
const PASSWORD_CHANGE_ROUTES = new Set(['/api/auth/me', '/api/auth/change-password'])

/**
 * Middleware that verifies Firebase ID tokens from the Authorization header.
 * The frontend gets an ID token from Firebase Auth and sends it as:
 *   Authorization: Bearer <idToken>
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    console.warn('Auth rejected: missing or invalid Authorization header')
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const idToken = header.slice(7)

  try {
    let decoded = await adminAuth.verifyIdToken(idToken)
    // Admins can disable or reset generated logins, so those tokens are also
    // checked against the account's current state.
    if (decoded.generatedLogin) decoded = await adminAuth.verifyIdToken(idToken, true)
    req.uid = decoded.uid
    req.userEmail = decoded.email
    req.generatedLogin = decoded.generatedLogin === true
    if (decoded.mustChangePassword && !PASSWORD_CHANGE_ROUTES.has(`${req.baseUrl}${req.path}`)) {
      res.status(403).json({ error: 'Password change required' })
      return
    }
    next()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Auth rejected: token verification failed:', message)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
