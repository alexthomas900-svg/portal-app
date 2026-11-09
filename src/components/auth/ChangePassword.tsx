import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { changeTemporaryPassword, signOut } from '../../services/auth'

const MIN_LENGTH = 10

export default function ChangePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await changeTemporaryPassword(password)
      // Reload so the rest of the app picks up the updated account.
      window.location.assign('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your password.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt p-4">
      <form onSubmit={handleSubmit} className="card p-6 w-full max-w-md space-y-4">
        <div>
          <h1 className="text-xl font-bold text-text">Set your password</h1>
          <p className="text-sm text-text-secondary mt-1">
            You signed in with a temporary password. Choose a new one to continue.
          </p>
        </div>
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-text mb-1.5">New password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-text mb-1.5">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save password
        </button>
        <button type="button" onClick={() => void signOut()} className="btn-ghost w-full">
          Sign out
        </button>
      </form>
    </div>
  )
}
