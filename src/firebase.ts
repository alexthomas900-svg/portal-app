import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

function requiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

const firebaseConfig = {
  apiKey: requiredEnv('VITE_FB_API_KEY'),
  authDomain: requiredEnv('VITE_FB_AUTH_DOMAIN'),
  projectId: requiredEnv('VITE_FB_PROJECT_ID'),
  storageBucket: requiredEnv('VITE_FB_STORAGE_BUCKET'),
  messagingSenderId: requiredEnv('VITE_FB_MESSAGING_SENDER_ID'),
  appId: requiredEnv('VITE_FB_APP_ID'),
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const storage = getStorage(app)
