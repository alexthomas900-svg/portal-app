import type { Publication } from '../types'

/**
 * Generate APA 7 formatted reference from publication data.
 * Format: Author(s). (Year). Title. Journal Name, Volume(Issue), pages.
 */
export function generateAPA(pub: Publication): string {
  if (!pub.articleTitle && !pub.journalName) return ''

  // Format authors
  const authors = pub.authorNames
    .filter((n) => n.trim())
    .map((name) => name.trim())

  let authorStr = ''
  if (authors.length === 0) {
    authorStr = 'Unknown'
  } else if (authors.length === 1) {
    authorStr = authors[0] || 'Unknown'
  } else if (authors.length === 2) {
    authorStr = `${authors[0]} & ${authors[1]}`
  } else {
    authorStr = `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`
  }

  let ref = `${authorStr}. (${pub.year}). ${pub.articleTitle}. ${pub.journalName}`

  if (pub.volume) {
    ref += `, ${pub.volume}`
    if (pub.issue) {
      ref += `(${pub.issue})`
    }
  }

  if (pub.pageNumbers) {
    ref += `, ${pub.pageNumbers}`
  }

  ref += '.'
  return ref
}
