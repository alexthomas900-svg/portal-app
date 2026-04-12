import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { UserProfile, UserRole } from '../types'
import { seedDemoDataIfNeeded } from '../services/demoSeed'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  role: UserRole | null
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  role: null,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    role: null,
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, profile: null, loading: false, role: null })
        return
      }

      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid))
        if (profileDoc.exists()) {
          const profile = profileDoc.data() as UserProfile
          seedDemoDataIfNeeded(profile).catch((err) => {
            console.warn('Demo data seed skipped:', err)
          })
          setState({ user, profile, loading: false, role: profile.role })
        } else {
          // User exists in auth but not in Firestore yet (needs registration)
          setState({ user, profile: null, loading: false, role: null })
        }
      } catch (err) {
        console.error('Failed to load user profile:', err)
        // Never keep the app stuck in loading due to profile/read rule issues.
        setState({ user, profile: null, loading: false, role: null })
      }
    })
    return unsubscribe
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
