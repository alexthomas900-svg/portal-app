import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../firebase'
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

      try {
        const profile = await apiGet<UserProfile>('/api/auth/me')
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
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('Profile not found')) {
          try {
            await apiPost('/api/auth/bootstrap', {
              displayName: user.displayName || user.email?.split('@')[0] || 'New User',
            })
            const profile = await apiGet<UserProfile>('/api/auth/me')
            if (!cancelled) {
              setState({ user, profile, loading: false, role: profile.role })
            }
            return
          } catch (bootstrapErr) {
            console.error('Failed to bootstrap user profile:', bootstrapErr)
          }
        }
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
