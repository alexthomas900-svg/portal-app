export type VerificationSourceName = 'CROSSREF' | 'DOAJ' | 'SCOPUS' | 'WOS' | 'HEC' | 'CNKI'
export type VerificationSourceState = 'found' | 'not_found' | 'manual' | 'error'
export type PublicationVerificationStatus = 'verified' | 'unverified' | 'unknown'

export interface PublicationVerificationSource {
  source: VerificationSourceName
  state: VerificationSourceState
  matched: boolean
  checkedAt: string
  notes: string
  referenceUrl?: string
}

export interface PublicationVerification {
  status: PublicationVerificationStatus
  sources: PublicationVerificationSource[]
  flagReason: string
  lastCheckedAt: string
}

export interface PublicationInput {
  articleTitle: string
  journalName: string
  year?: number
  authorNames: string[]
}

interface Candidate {
  title: string
  journal: string
  year?: number
  authors: string[]
  url?: string
}

const USER_AGENT = 'FCPortal-Verification/1.0'
const TIMEOUT_MS = 8000
const INDEXING_SOURCES: VerificationSourceName[] = ['DOAJ', 'SCOPUS', 'WOS', 'HEC', 'CNKI']

function normalize(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

// Sørensen–Dice similarity over character pairs, from 0 to 1.
function similarity(left: string, right: string): number {
  const a = normalize(left)
  const b = normalize(right)
  if (!a || !b) return 0
  if (a === b) return 1
  const pairs = (text: string) => {
    const counts = new Map<string, number>()
    for (let i = 0; i < text.length - 1; i++) {
      const pair = text.slice(i, i + 2)
      counts.set(pair, (counts.get(pair) ?? 0) + 1)
    }
    return counts
  }
  const first = pairs(a)
  const second = pairs(b)
  let overlap = 0
  for (const [pair, count] of first) overlap += Math.min(count, second.get(pair) ?? 0)
  return (2 * overlap) / (a.length - 1 + b.length - 1)
}

function sharesAuthor(claimed: string[], listed: string[]): boolean {
  const surname = (name: string) => normalize(name).split(' ').sort((x, y) => y.length - x.length)[0] ?? ''
  const known = new Set(listed.map(surname).filter((name) => name.length > 2))
  return claimed.some((name) => known.has(surname(name)))
}

// A title alone is not enough: the journal or an author must agree as well.
function matches(input: PublicationInput, candidate: Candidate): boolean {
  if (similarity(input.articleTitle, candidate.title) < 0.9) return false
  if (input.year && candidate.year && Math.abs(input.year - candidate.year) > 1) return false
  return similarity(input.journalName, candidate.journal) >= 0.8 || sharesAuthor(input.authorNames, candidate.authors)
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as Record<string, unknown>
}

async function searchCrossref(input: PublicationInput): Promise<Candidate[]> {
  const url = `https://api.crossref.org/works?rows=5&select=title,container-title,author,published,DOI&query.bibliographic=${encodeURIComponent(input.articleTitle)}`
  const data = await getJson(url)
  return ((data.message as any)?.items ?? []).map((item: any) => ({
    title: item.title?.[0] ?? '',
    journal: item['container-title']?.[0] ?? '',
    year: item.published?.['date-parts']?.[0]?.[0],
    authors: (item.author ?? []).map((author: any) => [author.given, author.family].filter(Boolean).join(' ')),
    url: item.DOI ? `https://doi.org/${item.DOI}` : undefined,
  }))
}

async function searchDoaj(input: PublicationInput): Promise<Candidate[]> {
  const words = normalize(input.articleTitle)
  const url = `https://doaj.org/api/search/articles/${encodeURIComponent(`bibjson.title:"${words}"`)}?pageSize=5`
  const data = await getJson(url)
  return ((data.results as any[]) ?? []).map((result) => ({
    title: result.bibjson?.title ?? '',
    journal: result.bibjson?.journal?.title ?? '',
    year: Number(result.bibjson?.year) || undefined,
    authors: (result.bibjson?.author ?? []).map((author: any) => author.name ?? ''),
    url: result.id ? `https://doaj.org/article/${result.id}` : undefined,
  }))
}

async function searchScopus(input: PublicationInput, apiKey: string): Promise<Candidate[]> {
  const url = `https://api.elsevier.com/content/search/scopus?count=5&query=${encodeURIComponent(`TITLE("${normalize(input.articleTitle)}")`)}`
  const data = await getJson(url, { 'X-ELS-APIKey': apiKey })
  return (((data['search-results'] as any)?.entry as any[]) ?? [])
    .filter((entry) => entry['dc:title'])
    .map((entry) => ({
      title: entry['dc:title'],
      journal: entry['prism:publicationName'] ?? '',
      year: Number(String(entry['prism:coverDate'] ?? '').slice(0, 4)) || undefined,
      authors: entry['dc:creator'] ? [entry['dc:creator']] : [],
      url: entry['prism:doi'] ? `https://doi.org/${entry['prism:doi']}` : undefined,
    }))
}

async function searchWebOfScience(input: PublicationInput, apiKey: string): Promise<Candidate[]> {
  const url = `https://api.clarivate.com/apis/wos-starter/v1/documents?limit=5&q=${encodeURIComponent(`TI=("${normalize(input.articleTitle)}")`)}`
  const data = await getJson(url, { 'X-ApiKey': apiKey })
  return ((data.hits as any[]) ?? []).map((hit) => ({
    title: hit.title ?? '',
    journal: hit.source?.sourceTitle ?? '',
    year: hit.source?.publishYear,
    authors: (hit.names?.authors ?? []).map((author: any) => author.displayName ?? ''),
    url: hit.links?.record,
  }))
}
async function checkSource(
  source: VerificationSourceName,
  label: string,
  search: () => Promise<Candidate[]>,
  input: PublicationInput,
  checkedAt: string,
): Promise<PublicationVerificationSource> {
  try {
    const match = (await search()).find((candidate) => matches(input, candidate))
    if (!match) return { source, state: 'not_found', matched: false, checkedAt, notes: `No matching article found in ${label}.` }
    return {
      source,
      state: 'found',
      matched: true,
      checkedAt,
      notes: `Matched in ${label}: ${match.journal || 'journal not listed'}${match.year ? ` (${match.year})` : ''}.`,
      ...(match.url ? { referenceUrl: match.url } : {}),
    }
  } catch (err) {
    console.warn(`${label} lookup failed:`, err instanceof Error ? err.message : err)
    return { source, state: 'error', matched: false, checkedAt, notes: `${label} could not be reached. Try again or check manually.` }
  }
}

function manualSource(source: VerificationSourceName, notes: string, referenceUrl: string, checkedAt: string): PublicationVerificationSource {
  return { source, state: 'manual', matched: false, checkedAt, notes, referenceUrl }
}

/**
 * Checks one publication against each source that offers authorised access.
 * A failed or missing lookup never counts against the publication: anything
 * not confirmed stays pending for a reviewer to check by hand.
 */
export async function verifyPublication(input: PublicationInput): Promise<PublicationVerification> {
  const checkedAt = new Date().toISOString()
  const scopusKey = process.env.SCOPUS_API_KEY
  const wosKey = process.env.WOS_API_KEY

  const sources = await Promise.all([
    checkSource('CROSSREF', 'Crossref', () => searchCrossref(input), input, checkedAt),
    checkSource('DOAJ', 'DOAJ', () => searchDoaj(input), input, checkedAt),
    scopusKey
      ? checkSource('SCOPUS', 'Scopus', () => searchScopus(input, scopusKey), input, checkedAt)
      : Promise.resolve(manualSource('SCOPUS', 'Scopus needs an institutional API key. Check manually.', 'https://www.scopus.com/', checkedAt)),
    wosKey
      ? checkSource('WOS', 'Web of Science', () => searchWebOfScience(input, wosKey), input, checkedAt)
      : Promise.resolve(manualSource('WOS', 'Web of Science needs an institutional API key. Check manually.', 'https://www.webofscience.com/', checkedAt)),
    Promise.resolve(manualSource('HEC', 'HEC Journal Recognition System has no public API. Check manually.', 'https://hjrs.hec.gov.pk/', checkedAt)),
    Promise.resolve(manualSource('CNKI', 'CNKI has no open API. Check manually.', 'https://oversea.cnki.net/', checkedAt)),
  ])

  const found = sources.some((source) => source.state === 'found')
  return {
    status: found ? 'verified' : 'unknown',
    sources,
    flagReason: found ? '' : 'Not confirmed automatically. Manual verification required.',
    lastCheckedAt: checkedAt,
  }
}

// Crossref shows an article exists; only an indexing portal counts as recognised.
export function isIndexed(verification: PublicationVerification): boolean {
  return verification.sources.some((source) => source.state === 'found' && INDEXING_SOURCES.includes(source.source))
}
