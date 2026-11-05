export type VerificationSourceName = 'HEC' | 'SCOPUS' | 'WOS'
export type PublicationVerificationStatus = 'verified' | 'unverified' | 'unknown'

export interface PublicationVerificationSource {
  source: VerificationSourceName
  matched: boolean
  checkedAt: string
  notes: string
}

export interface PublicationVerification {
  status: PublicationVerificationStatus
  sources: PublicationVerificationSource[]
  flagReason: string
  lastCheckedAt: string
}

export async function verifyPublication(
  _articleTitle: string,
  _journalName: string,
  _indexing: string,
): Promise<PublicationVerification> {
  const checkedAt = new Date().toISOString()
  const sources: VerificationSourceName[] = ['HEC', 'SCOPUS', 'WOS']

  return {
    status: 'unknown',
    sources: sources.map((source) => ({
      source,
      matched: false,
      checkedAt,
      notes: `Live ${source} journal and article verification is not configured.`,
    })),
    flagReason: 'Live verification against HEC, Scopus, or Web of Science is unavailable. Manual reviewer verification is required.',
    lastCheckedAt: checkedAt,
  }
}
