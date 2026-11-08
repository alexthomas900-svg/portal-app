import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

// Initialize Firebase Admin SDK.
// In production (Render), set FIREBASE_SERVICE_ACCOUNT_JSON env var with the
// full JSON string of the service-account key file.
// In development, set GOOGLE_APPLICATION_CREDENTIALS to the key file path.
// For local demos against the Firebase Local Emulator Suite, set
// FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST
// (see .env.example) — no real credentials are needed in that case.

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)

if (serviceAccountJson) {
  const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })
} else if (usingEmulator) {
  // Emulators don't verify credentials — a project id is all that's required.
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'demo-fcportal',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'demo-fcportal.appspot.com',
  })
} else {
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS file path
  initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })
}

export const db = getFirestore()
export const adminAuth = getAuth()
export const storage = getStorage()
