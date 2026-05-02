import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || 'AIzaSyB-tEjNhZn8zWeV_QqDvJ25GKP4RrNTWtk',
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || 'fcportal-569e5.firebaseapp.com',
  projectId: import.meta.env.VITE_FB_PROJECT_ID || 'fcportal-569e5',
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || 'fcportal-569e5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID || '895895495478',
  appId: import.meta.env.VITE_FB_APP_ID || '1:895895495478:web:da614272a593f1fba60997',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
