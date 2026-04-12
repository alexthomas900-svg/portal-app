import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

// Initialize Firebase Admin SDK.
// In production (Render), set FIREBASE_SERVICE_ACCOUNT_JSON env var with the
// full JSON string of the service-account key file.
// In development, set GOOGLE_APPLICATION_CREDENTIALS to the key file path.

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

if (serviceAccountJson) {
  const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
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
