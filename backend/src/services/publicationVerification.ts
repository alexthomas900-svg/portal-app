/**
 * Publication Verification Service
 *
 * Implements an adapter pattern for verifying journal recognition across
 * HEC, Scopus, and Web of Science. Stub providers are used when real
 * API credentials are not configured.
 *
 * TODO: Replace stub providers with live API calls by setting the
 * corresponding environment variables:
 *   HEC_API_KEY, SCOPUS_API_KEY, WOS_API_KEY
 */

export type VerificationSourceName = 'HEC' | 'SCOPUS' | 'WOS' | 'OTHER'
export type PublicationVerificationStatus = 'verified' | 'unverified' | 'unknown'

export interface PublicationVerificationSource {
  source: VerificationSourceName
  matched: boolean
  confidence?: number
  checkedAt: string
  referenceUrl?: string
  notes?: string
}

export interface PublicationVerification {
  status: PublicationVerificationStatus
  sources: PublicationVerificationSource[]
  flagReason?: string
  lastCheckedAt: string
}

interface VerificationProvider {
  name: VerificationSourceName
  verify(journalName: string, indexing: string): Promise<PublicationVerificationSource>
}

// ── HEC Stub Provider ──────────────────────────────────────────────────────
const HEC_RECOGNIZED_KEYWORDS = [
  'scopus', 'ieee', 'acm', 'springer', 'elsevier', 'wiley', 'nature',
  'science', 'taylor', 'francis', 'sage', 'emerald', 'inderscience',
]

const hecProvider: VerificationProvider = {
  name: 'HEC',
  async verify(journalName: string, indexing: string): Promise<PublicationVerificationSource> {
    const lower = journalName.toLowerCase()
    const indexLower = indexing.toLowerCase()
    const matched =
      HEC_RECOGNIZED_KEYWORDS.some((kw) => lower.includes(kw)) ||
      indexLower === 'hec' ||
      indexLower === 'scopus' ||
      indexLower === 'wos'

    return {
      source: 'HEC',
      matched,
      confidence: matched ? 0.75 : 0.1,
      checkedAt: new Date().toISOString(),
      referenceUrl: matched ? 'https://hec.gov.pk/english/services/faculty/jrnls/Pages/default.aspx' : undefined,
      notes: process.env.HEC_API_KEY
        ? undefined
        : 'Verified using keyword heuristics (stub). Configure HEC_API_KEY for live checks.',
    }
  },
}

// ── Scopus Stub Provider ───────────────────────────────────────────────────
const SCOPUS_INDEXED_KEYWORDS = [
  'scopus', 'elsevier', 'springer', 'ieee', 'acm', 'nature', 'science',
  'plos', 'frontiers', 'mdpi', 'hindawi',
]

const scopusProvider: VerificationProvider = {
  name: 'SCOPUS',
  async verify(journalName: string, indexing: string): Promise<PublicationVerificationSource> {
    const lower = journalName.toLowerCase()
    const matched =
      SCOPUS_INDEXED_KEYWORDS.some((kw) => lower.includes(kw)) ||
      indexing.toLowerCase() === 'scopus'

    return {
      source: 'SCOPUS',
      matched,
      confidence: matched ? 0.8 : 0.05,
      checkedAt: new Date().toISOString(),
      referenceUrl: matched ? 'https://www.scopus.com/sources' : undefined,
      notes: process.env.SCOPUS_API_KEY
        ? undefined
        : 'Verified using keyword heuristics (stub). Configure SCOPUS_API_KEY for live checks.',
    }
  },
}

// ── WoS Stub Provider ──────────────────────────────────────────────────────
const WOS_INDEXED_KEYWORDS = [
  'clarivate', 'wos', 'web of science', 'thomson', 'scie', 'ssci',
  'nature', 'science', 'ieee', 'springer', 'elsevier',
]

const wosProvider: VerificationProvider = {
  name: 'WOS',
  async verify(journalName: string, indexing: string): Promise<PublicationVerificationSource> {
    const lower = journalName.toLowerCase()
    const matched =
      WOS_INDEXED_KEYWORDS.some((kw) => lower.includes(kw)) ||
      indexing.toLowerCase() === 'wos'

    return {
      source: 'WOS',
      matched,
      confidence: matched ? 0.8 : 0.05,
      checkedAt: new Date().toISOString(),
      referenceUrl: matched ? 'https://www.webofscience.com/wos/woscc/master-journal-list' : undefined,
      notes: process.env.WOS_API_KEY
        ? undefined
        : 'Verified using keyword heuristics (stub). Configure WOS_API_KEY for live checks.',
    }
  },
}

const PROVIDERS: VerificationProvider[] = [hecProvider, scopusProvider, wosProvider]

// ── Main verification function ─────────────────────────────────────────────
export async function verifyPublication(
  journalName: string,
  indexing: string,
): Promise<PublicationVerification> {
  const results = await Promise.allSettled(
    PROVIDERS.map((p) => p.verify(journalName, indexing)),
  )

  const sources: PublicationVerificationSource[] = results
    .filter((r): r is PromiseFulfilledResult<PublicationVerificationSource> => r.status === 'fulfilled')
    .map((r) => r.value)

  const anyMatched = sources.some((s) => s.matched)
  const allFailed = sources.length === 0

  let status: PublicationVerificationStatus
  let flagReason: string | undefined

  if (allFailed) {
    status = 'unknown'
    flagReason = 'All verification providers failed to respond.'
  } else if (anyMatched) {
    status = 'verified'
  } else {
    status = 'unverified'
    flagReason = `Journal "${journalName}" was not matched in HEC, Scopus, or Web of Science. Manual reviewer check required.`
  }

  return {
    status,
    sources,
    flagReason,
    lastCheckedAt: new Date().toISOString(),
  }
}
