import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || 'AIzaSyB-tEjNhZn8zWeV_QqDvJ25GKP4RrNTWtk',
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || 'fcportal-569e5.firebaseapp.com',
  projectId: import.meta.env.VITE_FB_PROJECT_ID || (useEmulator ? 'demo-fcportal' : 'fcportal-569e5'),
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || 'fcportal-569e5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID || '895895495478',
  appId: import.meta.env.VITE_FB_APP_ID || '1:895895495478:web:da614272a593f1fba60997',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Point the client SDKs at the local Firebase Emulator Suite when running the
// app for local testing/demos (see DEMO.md "Local emulator demo" section).
// Guarded so this never runs twice (e.g. React StrictMode double-invoke).
if (useEmulator && !(globalThis as Record<string, unknown>).__fccEmulatorsConnected) {
  ;(globalThis as Record<string, unknown>).__fccEmulatorsConnected = true
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
