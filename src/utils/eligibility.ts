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

  for (const exp of app.experience) {
    if (!exp.from) continue
    const from = new Date(exp.from)
    const to = exp.isCurrent ? now : exp.to ? new Date(exp.to) : now
    const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
    if (months > 0) {
      totalExperienceMonths += months
      if (phdYear && from.getFullYear() >= phdYear) {
        postPhdMonths += months
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
  const requiredPostPhd = isAssociate ? 5 : 10
  const requiredPublications = isAssociate ? 10 : 15

  const experienceMet =
    totalExperienceYears >= requiredTotalExp || postPhdYears >= requiredPostPhd

  if (!experienceMet) {
    reasons.push(
      `Experience requirement not met: need ${requiredTotalExp} years total OR ${requiredPostPhd} years post-PhD (have ${totalExperienceYears} total, ${postPhdYears} post-PhD)`,
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
