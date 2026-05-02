import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff } from 'lucide-react'
import { registerWithEmail, signInWithEmail, signInWithGoogle } from '../../services/auth'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types'

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'Demo@12345'

interface DemoAccount {
  label: string
  role: UserRole
  email: string
  displayName: string
  department: string
  badge: string
  badgeClass: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Faculty',
    role: 'faculty',
    email: import.meta.env.VITE_DEMO_EMAIL || 'demo.faculty@fccollege.edu.pk',
    displayName: 'Demo Faculty',
    department: 'Computer Science',
    badge: 'Applicant',
    badgeClass: 'bg-primary/10 text-primary',
  },
  {
    label: 'Internal Reviewer',
    role: 'internal_reviewer',
    email: 'demo.internal@fccollege.edu.pk',
    displayName: 'Demo Internal Reviewer',
    department: 'Faculty Review Committee',
    badge: 'Reviewer',
    badgeClass: 'bg-info/10 text-info',
  },
  {
    label: 'External Reviewer',
    role: 'external_reviewer',
    email: 'demo.external@fccollege.edu.pk',
    displayName: 'Demo External Reviewer',
    department: 'External Committee',
    badge: 'External',
    badgeClass: 'bg-warning/10 text-warning',
  },
  {
    label: 'Admin',
    role: 'admin',
    email: 'demo.admin@fccollege.edu.pk',
    displayName: 'Demo Admin',
    department: 'Administration',
    badge: 'Admin',
    badgeClass: 'bg-success/10 text-success',
  },
]

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // If auth context already has a signed-in user, redirect immediately.
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [authLoading, user, navigate])

  const getAuthCode = (err: unknown): string => {
    if (typeof err === 'object' && err && 'code' in err) {
      return String((err as { code?: unknown }).code || '')
    }
    return ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      navigate('/dashboard', { replace: true })
      return
    } catch (err) {
      const code = getAuthCode(err)

      // Auto-create any demo account that doesn't exist yet
      const demoAccount = DEMO_ACCOUNTS.find(
        (a) => a.email === email && password === DEMO_PASSWORD,
      )
      if (demoAccount) {
        try {
          await registerWithEmail(
            demoAccount.email,
            DEMO_PASSWORD,
            demoAccount.displayName,
            demoAccount.role,
            demoAccount.department,
          )
        } catch (registerErr) {
          const registerCode = getAuthCode(registerErr)
          if (registerCode && registerCode !== 'auth/email-already-in-use') {
            setError('Could not create demo account. Check Firebase configuration.')
            setLoading(false)
            return
          }
        }

        try {
          await signInWithEmail(demoAccount.email, DEMO_PASSWORD)
          navigate('/dashboard', { replace: true })
          return
        } catch (secondErr) {
          const secondCode = getAuthCode(secondErr)
          if (secondCode === 'auth/invalid-credential') {
            setError('Demo account exists but credentials do not match. Delete it in Firebase Auth and try again.')
          } else {
            setError('Demo sign-in failed: ' + (secondErr instanceof Error ? secondErr.message : String(secondErr)))
          }
          setLoading(false)
          return
        }
      }

      if (code === 'auth/operation-not-allowed') {
        setError('Email/password sign-in is disabled in Firebase. Enable it in Firebase Auth > Sign-in method.')
      } else if (code === 'auth/invalid-api-key') {
        setError('Firebase API key is invalid. Check VITE_FB_API_KEY in your .env file.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.')
      } else {
        setError('Sign-in failed (' + (code || 'unknown') + '). Check your email/password and Firebase config.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">Faculty Evaluation Portal</h1>
          <p className="text-text-secondary mt-1">Forman Christian College (A Chartered University)</p>
        </div>

        {/* Form */}
        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-text mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-danger-light text-danger text-sm rounded-lg">{error}</div>
          )}

          {/* Demo accounts panel */}
          <div className="mb-5 p-3 rounded-lg border border-border bg-surface-alt">
            <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
              Demo accounts — all use password: <span className="font-mono text-text">{DEMO_PASSWORD}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword(DEMO_PASSWORD)
                  }}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text truncate">{account.label}</p>
                    <p className="text-[10px] text-text-dim truncate">{account.email}</p>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${account.badgeClass}`}>
                    {account.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@fccollege.edu.pk"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-text-dim">or</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <button onClick={handleGoogle} disabled={loading} className="btn-secondary w-full">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-text-secondary mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Register here
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-text-dim mt-6">
          © {new Date().getFullYear()} Forman Christian College. All rights reserved.
        </p>
      </div>
    </div>
  )
}
