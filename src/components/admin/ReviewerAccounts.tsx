import { useState, type FormEvent } from 'react'
import { Check, Copy, KeyRound, Loader2, X } from 'lucide-react'
import { apiPost } from '../../lib/api'

export interface GeneratedCredentials {
  uid: string
  username: string
  password: string
  displayName: string
  role: 'internal_reviewer' | 'external_reviewer'
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface border border-border">
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="font-mono text-sm text-text break-all">{value}</p>
      </div>
      <button type="button" onClick={() => void copy()} className="btn-ghost btn-sm shrink-0" aria-label={`Copy ${label.toLowerCase()}`}>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function CredentialsPanel({ credentials, onClose }: { credentials: GeneratedCredentials; onClose: () => void }) {
  return (
    <div className="card p-5 mb-6 border-warning" data-testid="generated-credentials">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Login for {credentials.displayName}</h2>
          <p className="text-xs text-warning font-medium mt-0.5">
            Copy this now. The password can't be shown again, and the reviewer must change it at first sign-in.
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded text-text-dim hover:text-text" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <CopyField label="Username" value={credentials.username} />
        <CopyField label="Temporary password" value={credentials.password} />
      </div>
    </div>
  )
}

export default function ReviewerAccounts({ onGenerated }: { onGenerated: (credentials: GeneratedCredentials) => void }) {
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<GeneratedCredentials['role']>('internal_reviewer')
  const [department, setDepartment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const credentials = await apiPost<GeneratedCredentials>('/api/auth/reviewer-accounts', { displayName, role, department })
      setDisplayName('')
      setDepartment('')
      onGenerated(credentials)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the login.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-6">
      <h2 className="text-sm font-semibold text-text">Generate Reviewer Login</h2>
      <p className="text-xs text-text-secondary mt-0.5 mb-4">
        Creates a unique username and temporary password. Assign the reviewer to applications under Reviewer Assignment.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-text-secondary">
          Reviewer's full name
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={100} className="mt-1" />
        </label>
        <label className="text-sm text-text-secondary">
          Reviewer type
          <select value={role} onChange={(e) => setRole(e.target.value as GeneratedCredentials['role'])} className="mt-1">
            <option value="internal_reviewer">Internal Reviewer</option>
            <option value="external_reviewer">External Reviewer</option>
          </select>
        </label>
        <label className="text-sm text-text-secondary">
          Department or institution
          <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={100} className="mt-1" />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-danger mt-3">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary mt-4">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        Generate login
      </button>
    </form>
  )
}
