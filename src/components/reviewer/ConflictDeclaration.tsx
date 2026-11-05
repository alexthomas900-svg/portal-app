import { useState } from 'react'
import { declareConflict } from '../../services/workflows'

export default function ConflictDeclaration({ applicationId, onDeclared }: { applicationId: string; onDeclared: () => void }) {
  const [explanation, setExplanation] = useState('')
  const [declared, setDeclared] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    try {
      await declareConflict(applicationId, explanation)
      setDeclared(true)
      onDeclared()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record conflict.')
    }
  }

  return (
    <div className="card p-4 mb-5 border-warning">
      <h2 className="text-sm font-semibold text-text">Conflict of Interest</h2>
      {declared ? (
        <p className="text-sm text-success mt-2">Your conflict declaration has been recorded. Please wait for administrative reassignment.</p>
      ) : (
        <>
          <p className="text-xs text-text-secondary mt-1">Declare any actual or potential conflict before continuing this assessment.</p>
          <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} minLength={10} rows={2} className="mt-2" placeholder="Describe the potential conflict…" />
          {error && <p role="alert" className="text-xs text-danger mt-1">{error}</p>}
          <button onClick={submit} disabled={explanation.trim().length < 10} className="btn-secondary btn-sm mt-2">Declare Conflict</button>
        </>
      )}
    </div>
  )
}
