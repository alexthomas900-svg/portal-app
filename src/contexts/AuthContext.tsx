import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { apiGet, apiPost } from '../lib/api'
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
    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) setState({ user: null, profile: null, loading: false, role: null })
        return
      }

      // Set user immediately so route guards know authentication succeeded.
      // Do NOT set loading back to true — that traps the sign-in page.
      if (!cancelled) {
        setState((prev) => ({ ...prev, user }))
      }

      // Capture as non-null — we already returned early if user was null
      const authedUser = user

      // Helper: read profile directly from Firestore
      async function loadProfileFromFirestore(): Promise<UserProfile | null> {
        const snap = await getDoc(doc(db, 'users', authedUser.uid))
        if (!snap.exists()) return null
        return snap.data() as UserProfile
      }

      // Helper: create a default profile directly in Firestore
      async function bootstrapProfileInFirestore(): Promise<UserProfile> {
        const displayName = authedUser.displayName || authedUser.email?.split('@')[0] || 'New User'
        const profile: UserProfile = {
          uid: authedUser.uid,
          email: authedUser.email ?? '',
          displayName,
          role: 'faculty',
          createdAt: new Date().toISOString(),
        }
        await setDoc(doc(db, 'users', authedUser.uid), {
          ...profile,
          createdAt: serverTimestamp(),
        })
        return profile
      }

      try {
        let profile: UserProfile | null = null

        // Try backend first; fall back to direct Firestore read on network errors
        try {
          profile = await apiGet<UserProfile>('/api/auth/me')
        } catch (backendErr) {
          const msg = backendErr instanceof Error ? backendErr.message : String(backendErr)
          if (msg.includes('Profile not found')) {
            // Backend reachable but no doc — try Firestore direct bootstrap
            try {
              await apiPost('/api/auth/bootstrap', {
                displayName: authedUser.displayName || authedUser.email?.split('@')[0] || 'New User',
              })
              profile = await apiGet<UserProfile>('/api/auth/me')
            } catch {
              // Backend bootstrap failed — write directly to Firestore
              profile = await loadProfileFromFirestore()
              if (!profile) profile = await bootstrapProfileInFirestore()
            }
          } else {
            // Network error (backend sleeping, CORS, etc.) — go direct to Firestore
            console.warn('Backend unreachable, falling back to Firestore:', msg)
            profile = await loadProfileFromFirestore()
            if (!profile) profile = await bootstrapProfileInFirestore()
          }
        }

        if (cancelled) return
        if (profile) {
          seedDemoDataIfNeeded(profile).catch((err) => {
            console.warn('Demo data seed skipped:', err)
          })
          setState({ user, profile, loading: false, role: profile.role })
        } else {
          setState({ user, profile: null, loading: false, role: null })
        }
      } catch (err) {
        console.error('Failed to load user profile:', err)
        if (!cancelled) setState({ user, profile: null, loading: false, role: null })
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
