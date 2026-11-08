import { Loader2, RefreshCw } from 'lucide-react'
import type { Publication, VerificationSourceName, VerificationSourceState } from '../../types'

const PORTALS: { source: VerificationSourceName; label: string }[] = [
  { source: 'HEC', label: 'HEC' },
  { source: 'WOS', label: 'Web of Science' },
  { source: 'SCOPUS', label: 'Scopus' },
  { source: 'DOAJ', label: 'DOAJ' },
  { source: 'CNKI', label: 'CNKI' },
  { source: 'CROSSREF', label: 'Crossref' },
]

const STATE_LABEL: Record<VerificationSourceState, string> = {
  found: 'Found',
  not_found: 'Not found',
  manual: 'Check manually',
  error: 'Unavailable',
}

const STATE_CLASS: Record<VerificationSourceState, string> = {
  found: 'text-success',
  not_found: 'text-text-dim',
  manual: 'text-warning',
  error: 'text-warning',
}

interface Props {
  publications: Publication[]
  checking: boolean
  error: string
  onRecheck: () => void
}

export default function PublicationChecks({ publications, checking, error, onRecheck }: Props) {
  const total = publications.length
  const authentic = publications.filter((pub) => pub.verification?.status === 'verified').length
  const sourceOf = (pub: Publication, source: VerificationSourceName) =>
    pub.verification?.sources.find((item) => item.source === source)

  return (
    <div className="mb-3 p-3 rounded-lg border border-border bg-surface-alt" data-testid="publication-checks">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold text-text">Publication Authenticity</p>
        <button type="button" onClick={onRecheck} disabled={checking || total === 0} className="btn-secondary btn-sm">
          {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {checking ? 'Checking...' : 'Re-check'}
        </button>
      </div>

      {total === 0 ? (
        <p className="text-xs text-text-secondary mt-2">No publications were submitted.</p>
      ) : (
        <>
          <p className="text-sm text-text mt-2">
            <strong className="text-success">{authentic}</strong> of <strong>{total}</strong> confirmed authentic ·{' '}
            <strong className="text-warning">{total - authentic}</strong> need manual verification
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {PORTALS.map(({ source, label }) => {
              const found = publications.filter((pub) => sourceOf(pub, source)?.state === 'found').length
              const manualOnly = publications.every((pub) => sourceOf(pub, source)?.state === 'manual')
              return (
                <div key={source} className="p-2 rounded bg-surface border border-border text-xs">
                  <p className="text-text-secondary">{label}</p>
                  <p className={`font-semibold ${manualOnly ? 'text-warning' : 'text-text'}`}>
                    {manualOnly ? 'Check manually' : `${found} of ${total} found`}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-1.5 pr-3 font-medium">Publication</th>
                  {PORTALS.map(({ source, label }) => <th key={source} className="py-1.5 pr-3 font-medium whitespace-nowrap">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {publications.map((pub) => (
                  <tr key={pub.id} className="border-b border-border align-top">
                    <td className="py-1.5 pr-3 text-text min-w-48">
                      {pub.articleTitle}
                      <span className="block text-text-dim">{pub.journalName}, {pub.year}</span>
                    </td>
                    {PORTALS.map(({ source }) => {
                      const result = sourceOf(pub, source)
                      if (!result) return <td key={source} className="py-1.5 pr-3 text-text-dim">—</td>
                      const label = <span className={STATE_CLASS[result.state]}>{STATE_LABEL[result.state]}</span>
                      return (
                        <td key={source} className="py-1.5 pr-3 whitespace-nowrap" title={result.notes}>
                          {result.referenceUrl
                            ? <a href={result.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline">{label}</a>
                            : label}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-dim mt-2">
            Not found or unavailable does not mean a publication is invalid. Confirm those by hand before relying on the count.
          </p>
        </>
      )}
      {error && <p role="alert" className="text-xs text-danger mt-2">{error}</p>}
    </div>
  )
}
