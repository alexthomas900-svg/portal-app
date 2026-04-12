import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
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
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    email,
    displayName,
    role,
    department: department || '',
    createdAt: Timestamp.now(),
  })
  return cred.user
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  await fbSignOut(auth)
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole,
  department?: string,
) {
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    displayName,
    role,
    department: department || '',
    createdAt: Timestamp.now(),
  })
}
