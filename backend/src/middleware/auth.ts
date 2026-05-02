import type { Request, Response, NextFunction } from 'express'
import { adminAuth } from '../firebase-admin.js'

export interface AuthRequest extends Request<Record<string, string>> {
  uid?: string
  userEmail?: string
}

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
    const decoded = await adminAuth.verifyIdToken(idToken)
    req.uid = decoded.uid
    req.userEmail = decoded.email
    next()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Auth rejected: token verification failed:', message)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
