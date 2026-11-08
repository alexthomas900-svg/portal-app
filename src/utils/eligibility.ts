import type { Application, EligibilityResult } from '../types'

export function checkEligibility(app: Application): EligibilityResult {
  const reasons: string[] = []
  const isPromotion = app.applicationType === 'promotion'

  // VET
  const vetPassed = app.vetPassed
  if (!vetPassed) reasons.push('Versant English Test (VET) not passed')

  const phdCompleted = app.qualifications.some((q) => q.degree === 'PhD')

  // Experience calculation
  const now = new Date()
  let totalExperienceMonths = 0
  let postPhdMonths = 0

  const phdYear = app.qualifications.find((q) => q.degree === 'PhD')?.year || 0
  const phdDate = phdYear ? new Date(Date.UTC(phdYear, 0, 1)) : null
  const monthsBetween = (start: Date, end: Date) =>
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())

  for (const exp of app.experience) {
    const institutionType = exp.institutionType ?? (exp.type === 'industry' ? 'other' : 'higher_education')
    if (!exp.from || institutionType !== 'higher_education') continue
    const from = new Date(exp.from)
    const to = exp.isCurrent ? now : exp.to ? new Date(exp.to) : now
    const months = monthsBetween(from, to)
    if (months > 0) {
      totalExperienceMonths += months
      if (phdDate) {
        const postPhdStart = from > phdDate ? from : phdDate
        if (to > postPhdStart) {
          postPhdMonths += monthsBetween(postPhdStart, to)
        }
      }
    }
  }

  const totalExperienceYears = Math.round((totalExperienceMonths / 12) * 10) / 10
  const postPhdYears = Math.round((postPhdMonths / 12) * 10) / 10

  if (!isPromotion) {
    const docs = app.documents
    const docsMet = Boolean(
      docs.selfEvaluationForm &&
      docs.chairEvaluation &&
      docs.deanEvaluation &&
      docs.updatedCV &&
      docs.effortsToImprovePdf &&
      docs.courseOutlines.length >= 2 &&
      docs.assignments.length >= 2,
    )

    if (!docsMet) {
      reasons.push('Required documents for this workflow are incomplete')
    }

    let status: EligibilityResult['status'] = 'not_eligible'
    if (vetPassed && docsMet) {
      status = 'eligible'
    } else if (vetPassed || docsMet) {
      status = 'conditionally_eligible'
    }

    return {
      status,
      vetPassed,
      phdCompleted: true,
      experienceMet: true,
      publicationsMet: true,
      totalExperienceYears,
      postPhdYears,
      recognizedPublications: 0,
      requiredPublications: 0,
      reasons,
    }
  }

  if (!phdCompleted) reasons.push('PhD degree not found in qualifications')

  // Publication count
  const recognizedPublications = app.publications.filter((p) => p.recognized).length

  // Apply criteria based on promotion type
  const isAssociate = app.promotionType === 'associate_professor'

  const requiredTotalExp = isAssociate ? 10 : 15
  const requiredPostPhd = isAssociate ? 5 : 8
  const requiredPublications = isAssociate ? 10 : 15

  const experienceMet =
    totalExperienceYears >= requiredTotalExp || postPhdYears >= requiredPostPhd

  if (!experienceMet) {
    reasons.push(
      `Experience requirement not met: need ${requiredTotalExp} years in higher education OR ${requiredPostPhd} years in higher education post-PhD (have ${totalExperienceYears} total, ${postPhdYears} post-PhD)`,
    )
  }

  const publicationsMet = recognizedPublications >= requiredPublications
  if (!publicationsMet) {
    reasons.push(
      `Need ${requiredPublications} recognized publications, have ${recognizedPublications}`,
    )
  }

  // Determine status
  let status: EligibilityResult['status'] = 'not_eligible'
  if (vetPassed && phdCompleted && experienceMet && publicationsMet) {
    status = 'eligible'
  } else if (phdCompleted && (experienceMet || publicationsMet)) {
    status = 'conditionally_eligible'
  }

  return {
    status,
    vetPassed,
    phdCompleted,
    experienceMet,
    publicationsMet,
    totalExperienceYears,
    postPhdYears,
    recognizedPublications,
    requiredPublications,
    reasons,
  }
}
