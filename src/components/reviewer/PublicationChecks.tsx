import { Loader2, RefreshCw } from 'lucide-react'
import type { Publication, PublicationCategory, VerificationSourceName, VerificationSourceState } from '../../types'
import type { PublicationReview } from '../../services/applications'

type ManualSource = 'SCOPUS' | 'WOS' | 'HEC' | 'CNKI'

const PORTALS: { source: VerificationSourceName; label: string }[] = [
  { source: 'HEC', label: 'HEC' },
  { source: 'WOS', label: 'Web of Science' },
  { source: 'SCOPUS', label: 'Scopus' },
  { source: 'DOAJ', label: 'DOAJ' },
  { source: 'CNKI', label: 'CNKI' },
  { source: 'CROSSREF', label: 'Crossref' },
]

const CATEGORIES: { value: PublicationCategory; label: string }[] = [
  { value: 'Q1', label: 'Q1 (W)' },
  { value: 'Q2', label: 'Q2 (X)' },
  { value: 'Q3', label: 'Q3 (Y)' },
]

const categoryLabel = (value: string | null | undefined) =>
  CATEGORIES.find((category) => category.value === value)?.label ?? 'Not categorised'

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

const isManual = (source: VerificationSourceName): source is ManualSource => source !== 'DOAJ' && source !== 'CROSSREF'

function sourceOf(publication: Publication, source: VerificationSourceName) {
  return publication.verification?.sources.find((item) => item.source === source)
}

// Follows the portal's category definitions: W for Web of Science journals,
// X for Scopus, Y for HEC, CNKI and DOAJ.
function suggestedCategory(publication: Publication): PublicationCategory | null {
  const found = (source: VerificationSourceName) => sourceOf(publication, source)?.state === 'found'
  if (found('WOS')) return 'Q1'
  if (found('SCOPUS')) return 'Q2'
  if (found('HEC') || found('CNKI') || found('DOAJ')) return 'Q3'
  return null
}

interface Props {
  publications: Publication[]
  checking: boolean
  error: string
  onRecheck: () => void
  onReview: (publicationId: string, review: PublicationReview) => void
}

export default function PublicationChecks({ publications, checking, error, onRecheck, onReview }: Props) {
  const total = publications.length
  const authentic = publications.filter((pub) => pub.verification?.status === 'verified').length
  const categoryOf = (pub: Publication) => pub.reviewerCategory ?? suggestedCategory(pub)
  const uncategorised = publications.filter((pub) => !categoryOf(pub)).length

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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3" data-testid="category-counts">
            {CATEGORIES.map(({ value, label }) => (
              <div key={value} className="p-2 rounded bg-surface border border-border text-xs">
                <p className="text-text-secondary">{label}</p>
                <p className="font-semibold text-text">{publications.filter((pub) => categoryOf(pub) === value).length}</p>
              </div>
            ))}
            <div className="p-2 rounded bg-surface border border-border text-xs">
              <p className="text-text-secondary">Not categorised</p>
              <p className="font-semibold text-text">{uncategorised}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {PORTALS.map(({ source, label }) => {
              const found = publications.filter((pub) => sourceOf(pub, source)?.state === 'found').length
              const pending = publications.filter((pub) => sourceOf(pub, source)?.state === 'manual').length
              return (
                <div key={source} className="p-2 rounded bg-surface border border-border text-xs">
                  <p className="text-text-secondary">{label}</p>
                  <p className="font-semibold text-text">{found} of {total} found</p>
                  {pending > 0 && <p className="text-warning">{pending} to check manually</p>}
                </div>
              )
            })}
          </div>

          <div className="space-y-3 mt-3">
            {publications.map((pub) => {
              const suggested = suggestedCategory(pub)
              return (
                <div key={pub.id} className="p-3 rounded bg-surface border border-border" data-testid={`publication-${pub.id}`}>
                  <p className="text-sm font-medium text-text">{pub.articleTitle}</p>
                  <p className="text-xs text-text-dim">{pub.journalName}, {pub.year} · Applicant claimed {categoryLabel(pub.quartile)}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {PORTALS.map(({ source, label }) => {
                      const result = sourceOf(pub, source)
                      const name = result?.referenceUrl
                        ? <a href={result.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline">{label}</a>
                        : label
                      return (
                        <div key={source} className="text-xs text-text-secondary">
                          <p>{name}</p>
                          {result && isManual(source) ? (
                            <select
                              aria-label={`${label} result for ${pub.articleTitle}`}
                              value={result.state === 'error' ? 'manual' : result.state}
                              disabled={checking}
                              onChange={(e) => onReview(pub.id, { sources: { [source]: e.target.value as 'found' | 'not_found' | 'manual' } })}
                              className="text-xs mt-0.5"
                            >
                              <option value="manual">Check manually</option>
                              <option value="found">Found</option>
                              <option value="not_found">Not found</option>
                            </select>
                          ) : (
                            <p className={result ? STATE_CLASS[result.state] : 'text-text-dim'} title={result?.notes}>
                              {result ? STATE_LABEL[result.state] : '—'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <label className="block text-xs text-text-secondary mt-2 max-w-60">
                    Category
                    <select
                      aria-label={`Category for ${pub.articleTitle}`}
                      value={pub.reviewerCategory ?? ''}
                      disabled={checking}
                      onChange={(e) => onReview(pub.id, { category: (e.target.value || null) as PublicationCategory | null })}
                      className="text-xs mt-0.5"
                    >
                      <option value="">{suggested ? `Suggested: ${categoryLabel(suggested)}` : 'Not categorised'}</option>
                      {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-text-dim mt-2">
            Not found or unavailable does not mean a publication is invalid. Open each portal by name to check it, then record the result here.
          </p>
        </>
      )}
      {error && <p role="alert" className="text-xs text-danger mt-2">{error}</p>}
    </div>
  )
}
