import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../firebase'
import { apiPost } from '../lib/api'
import type { UserRole } from '../types'

const googleProvider = new GoogleAuthProvider()

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in window.navigator && (window.navigator as Record<string, unknown>).standalone === true)

export async function signInWithGoogle() {
  if (isStandalone()) {
    await signInWithRedirect(auth, googleProvider)
  } else {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {
      await signInWithRedirect(auth, googleProvider)
    }
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
  department?: string,
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  // Create the Firestore user profile via the backend API
  await apiPost('/api/auth/register', { displayName, role, department: department || '' })
  return cred.user
}

// Generated reviewer logins use a username, which maps to this reserved domain.
const GENERATED_LOGIN_DOMAIN = 'reviewers.example.com'

export async function signInWithEmail(emailOrUsername: string, password: string) {
  const identifier = emailOrUsername.trim()
  const email = identifier.includes('@') ? identifier : `${identifier.toLowerCase()}@${GENERATED_LOGIN_DOMAIN}`
  return signInWithEmailAndPassword(auth, email, password)
}

export async function changeTemporaryPassword(newPassword: string) {
  const email = auth.currentUser?.email
  if (!email) throw new Error('You are not signed in.')
  await apiPost('/api/auth/change-password', { newPassword })
  // The change invalidates the old session, so sign in again with the new password.
  await signInWithEmailAndPassword(auth, email, newPassword)
}

export async function signOut() {
  await fbSignOut(auth)
}
