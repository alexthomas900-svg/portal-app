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

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  await fbSignOut(auth)
}
