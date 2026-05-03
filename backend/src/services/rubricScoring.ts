/**
 * Rubric Scoring Service
 *
 * Computes evidence-based preliminary scores for:
 *   - Teaching Effectiveness (Bloom/Fink alignment, higher-order assessment,
 *     cognitive complexity, multi-source inputs)
 *   - Efforts to Improve (training/certifications, workshops, reflective practice)
 *   - Scholarly Activity (verified publications, conferences, editorial, supervision)
 *   - Service (committee work, institutional contributions, community service)
 *
 * All sections begin at "deficient" and are upgraded only when evidence
 * thresholds are met. Scores are stored per-criterion with rationale.
 */

export interface RubricCriterion {
  id: string
  score: number       // 0–100 normalised within criterion
  rationale: string
  evidenceLinks: string[]
}

export interface TeachingRubricScores {
  bloomAlignment: RubricCriterion
  finkAlignment: RubricCriterion
  higherOrderAssessment: RubricCriterion
  cognitiveComplexity: RubricCriterion
  multiSourceInputs: RubricCriterion
  preliminaryScore: number
  aiGeneratedFeedback: string
}

export interface EffortsRubricScores {
  trainingCertifications: RubricCriterion
  workshopsAttended: RubricCriterion
  reflectivePractice: RubricCriterion
  preliminaryScore: number
  aiGeneratedFeedback: string
}

export interface ScholarlyRubricScores {
  verifiedPublications: RubricCriterion
  conferenceParticipation: RubricCriterion
  editorialWork: RubricCriterion
  supervision: RubricCriterion
  preliminaryScore: number
  aiGeneratedFeedback: string
}

export interface ServiceRubricScores {
  committeeWork: RubricCriterion
  institutionalContributions: RubricCriterion
  communityService: RubricCriterion
  preliminaryScore: number
  aiGeneratedFeedback: string
}

export interface EvaluationReport {
  applicationId: string
  teaching: TeachingRubricScores
  efforts: EffortsRubricScores
  scholarly: ScholarlyRubricScores
  service: ServiceRubricScores
  publicationFlags: string[]
  generatedAt: string
  generatedBy: string
}

type ApplicationData = Record<string, unknown>

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 30
}

function hasUploads(files: unknown): boolean {
  return Array.isArray(files) && files.length > 0
}

function countVerifiedPublications(publications: unknown[]): number {
  return publications.filter((p) => {
    const pub = p as Record<string, unknown>
    const verification = pub.verification as Record<string, unknown> | undefined
    return verification?.status === 'verified'
  }).length
}

// ── Teaching Effectiveness ─────────────────────────────────────────────────
export function scoreTeaching(app: ApplicationData): TeachingRubricScores {
  const teaching = (app.teachingEffectiveness ?? {}) as Record<string, unknown>

  const bloomText = teaching.bloomAlignment as string | undefined
  const bloomScore = hasText(bloomText) ? (hasUploads(teaching.sloDocuments) ? 85 : 55) : 10
  const bloomCriterion: RubricCriterion = {
    id: 'bloomAlignment',
    score: bloomScore,
    rationale: hasText(bloomText)
      ? 'Applicant has provided written Bloom alignment description.' +
        (hasUploads(teaching.sloDocuments) ? ' SLO documents uploaded.' : ' No SLO documents uploaded — upload to raise score.')
      : 'No Bloom alignment description provided. Status: Deficient.',
    evidenceLinks: [],
  }

  const finkText = teaching.finkAlignment as string | undefined
  const finkScore = hasText(finkText) ? (hasUploads(teaching.syllabi) ? 85 : 55) : 10
  const finkCriterion: RubricCriterion = {
    id: 'finkAlignment',
    score: finkScore,
    rationale: hasText(finkText)
      ? 'Fink taxonomy alignment described.' +
        (hasUploads(teaching.syllabi) ? ' Syllabi uploaded.' : ' No syllabi uploaded — upload to raise score.')
      : 'No Fink alignment description provided. Status: Deficient.',
    evidenceLinks: [],
  }

  const hotText = teaching.higherOrderThinking as string | undefined
  const hotScore = hasText(hotText) ? (hasUploads(teaching.assessmentSamples) ? 85 : 55) : 10
  const hotCriterion: RubricCriterion = {
    id: 'higherOrderAssessment',
    score: hotScore,
    rationale: hasText(hotText)
      ? 'Higher-order thinking strategies described.' +
        (hasUploads(teaching.assessmentSamples) ? ' Assessment samples uploaded.' : ' Upload assessment samples to strengthen evidence.')
      : 'No higher-order thinking assessment strategies described. Status: Deficient.',
    evidenceLinks: [],
  }

  const cogText = [teaching.bloomAlignment, teaching.finkAlignment, teaching.higherOrderThinking]
    .filter((t) => hasText(t)).length
  const cogScore = cogText >= 3 ? 80 : cogText === 2 ? 55 : cogText === 1 ? 30 : 5
  const cogCriterion: RubricCriterion = {
    id: 'cognitiveComplexity',
    score: cogScore,
    rationale: cogText >= 3
      ? 'Evidence of cognitive complexity found across all three narrative fields.'
      : `Evidence of cognitive complexity found in ${cogText}/3 fields. More detail needed.`,
    evidenceLinks: [],
  }

  const chair = Number(teaching.chairRating ?? 0)
  const dean = Number(teaching.deanRating ?? 0)
  const student = Number(teaching.studentRating ?? 0)
  const hasStudentFeedback = hasUploads(teaching.studentFeedbackDocs)
  const multiScore = chair > 0 && dean > 0 && student > 0 && hasStudentFeedback
    ? Math.round(((chair + dean + student) / 15) * 100)
    : chair > 0 && dean > 0 && student > 0
      ? Math.round(((chair + dean + student) / 15) * 70)
      : 10
  const multiCriterion: RubricCriterion = {
    id: 'multiSourceInputs',
    score: Math.min(100, multiScore),
    rationale: chair > 0 && dean > 0 && student > 0
      ? `Multi-source ratings provided (Chair: ${chair}/5, Dean: ${dean}/5, Students: ${student}/5).` +
        (hasStudentFeedback ? ' Student feedback documents uploaded.' : ' Upload student feedback documents to strengthen evidence.')
      : 'Multi-source ratings incomplete. Ensure Chair, Dean, and Student ratings are entered.',
    evidenceLinks: [],
  }

  const criteriaScores = [bloomScore, finkScore, hotScore, cogScore, Math.min(100, multiScore)]
  const preliminaryScore = Math.round(criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length)

  const feedback = [
    `Teaching Effectiveness Preliminary Score: ${preliminaryScore}/100.`,
    bloomScore < 50 ? '⚠ Bloom alignment requires documented SLO evidence.' : '✓ Bloom alignment evident.',
    finkScore < 50 ? '⚠ Fink taxonomy narrative weak or syllabi missing.' : '✓ Fink alignment documented.',
    hotScore < 50 ? '⚠ Higher-order assessment strategies need assessment sample uploads.' : '✓ Higher-order assessment documented.',
    cogScore < 50 ? '⚠ Cognitive complexity evidence is limited across narrative fields.' : '✓ Cognitive complexity evident.',
    multiScore < 50 ? '⚠ Multi-source evaluation incomplete.' : '✓ Multi-source evaluation present.',
  ].join(' ')

  return {
    bloomAlignment: bloomCriterion,
    finkAlignment: finkCriterion,
    higherOrderAssessment: hotCriterion,
    cognitiveComplexity: cogCriterion,
    multiSourceInputs: multiCriterion,
    preliminaryScore,
    aiGeneratedFeedback: feedback,
  }
}

// ── Efforts to Improve ─────────────────────────────────────────────────────
export function scoreEfforts(app: ApplicationData): EffortsRubricScores {
  const efforts = (app.effortsToImprove ?? {}) as Record<string, unknown>
  const cpdHours = Number(efforts.cpdHours ?? 0)
  const hasCerts = hasUploads(efforts.trainingCertificates)
  const hasWorkshops = hasUploads(efforts.workshopAttendance)
  const hasReflective = hasUploads(efforts.reflectiveEssays)

  const certScore = hasCerts ? (cpdHours >= 36 ? 85 : 55) : cpdHours >= 11 ? 30 : 5
  const certCriterion: RubricCriterion = {
    id: 'trainingCertifications',
    score: certScore,
    rationale: hasCerts
      ? `Training certificates uploaded. CPD hours: ${cpdHours}.`
      : `No training certificates uploaded. CPD hours reported: ${cpdHours}. Upload certificates to verify.`,
    evidenceLinks: [],
  }

  const workshopScore = hasWorkshops ? 80 : hasText(efforts.cpdsUndertaken as string) ? 40 : 5
  const workshopCriterion: RubricCriterion = {
    id: 'workshopsAttended',
    score: workshopScore,
    rationale: hasWorkshops
      ? 'Workshop attendance documents uploaded.'
      : hasText(efforts.cpdsUndertaken as string)
        ? 'CPD activities described but no attendance documents uploaded. Upload evidence to raise score.'
        : 'No workshop attendance evidence provided. Status: Deficient.',
    evidenceLinks: [],
  }

  const reflectiveScore = hasReflective ? 80 : hasText(efforts.reflectivePractice as string) ? 40 : 5
  const reflectiveCriterion: RubricCriterion = {
    id: 'reflectivePractice',
    score: reflectiveScore,
    rationale: hasReflective
      ? 'Reflective practice artifacts uploaded.'
      : hasText(efforts.reflectivePractice as string)
        ? 'Reflective practice described but no artifacts uploaded. Upload documents to raise score.'
        : 'No reflective practice evidence provided. Status: Deficient.',
    evidenceLinks: [],
  }

  const criteriaScores = [certScore, workshopScore, reflectiveScore]
  const preliminaryScore = Math.round(criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length)

  const feedback = [
    `Professional Development Preliminary Score: ${preliminaryScore}/100.`,
    certScore < 50 ? '⚠ Upload training certificates and log CPD hours.' : '✓ Training evidence documented.',
    workshopScore < 50 ? '⚠ Upload workshop attendance records.' : '✓ Workshop evidence present.',
    reflectiveScore < 50 ? '⚠ Upload reflective practice artifacts.' : '✓ Reflective practice documented.',
  ].join(' ')

  return {
    trainingCertifications: certCriterion,
    workshopsAttended: workshopCriterion,
    reflectivePractice: reflectiveCriterion,
    preliminaryScore,
    aiGeneratedFeedback: feedback,
  }
}

// ── Scholarly Activity ─────────────────────────────────────────────────────
export function scoreScholarly(app: ApplicationData): ScholarlyRubricScores {
  const scholarship = (app.scholarship ?? {}) as Record<string, unknown>
  const publications = Array.isArray(app.publications) ? (app.publications as unknown[]) : []
  const verifiedCount = countVerifiedPublications(publications)
  const hasPubProofs = hasUploads(scholarship.publicationProofs)
  const hasConfProofs = hasUploads(scholarship.conferenceProofs)
  const hasGrantDocs = hasUploads(scholarship.grantDocuments)

  const pubScore = verifiedCount >= 5
    ? 90
    : verifiedCount >= 3
      ? 70
      : verifiedCount >= 1
        ? 50
        : hasPubProofs
          ? 30
          : 5
  const pubCriterion: RubricCriterion = {
    id: 'verifiedPublications',
    score: pubScore,
    rationale: verifiedCount > 0
      ? `${verifiedCount} verified publication(s) found.${!hasPubProofs ? ' Upload publication PDFs to further support evidence.' : ''}`
      : `No publications verified against HEC/Scopus/WoS yet.${hasPubProofs ? ' Publication proofs uploaded — awaiting verification.' : ' Upload publication proofs and trigger verification.'}`,
    evidenceLinks: [],
  }

  const confText = scholarship.conferences as string | undefined
  const confScore = hasConfProofs ? 85 : hasText(confText) ? 45 : 5
  const confCriterion: RubricCriterion = {
    id: 'conferenceParticipation',
    score: confScore,
    rationale: hasConfProofs
      ? 'Conference proof documents uploaded.'
      : hasText(confText)
        ? 'Conference participation described but no proofs uploaded. Upload acceptance letters or proceedings.'
        : 'No conference participation evidence provided. Status: Deficient.',
    evidenceLinks: [],
  }

  const editText = scholarship.editorialWork as string | undefined
  const editScore = hasText(editText) ? (hasGrantDocs ? 80 : 50) : 5
  const editCriterion: RubricCriterion = {
    id: 'editorialWork',
    score: editScore,
    rationale: hasText(editText)
      ? `Editorial work described.${!hasGrantDocs ? ' Upload grant/editorial documents to raise score.' : ' Supporting documents uploaded.'}`
      : 'No editorial or grant work described. Status: Deficient.',
    evidenceLinks: [],
  }

  const supText = scholarship.supervision as string | undefined
  const supScore = hasText(supText) ? 70 : 5
  const supCriterion: RubricCriterion = {
    id: 'supervision',
    score: supScore,
    rationale: hasText(supText)
      ? 'Research supervision activities described.'
      : 'No supervision activities described. Status: Deficient.',
    evidenceLinks: [],
  }

  const criteriaScores = [pubScore, confScore, editScore, supScore]
  const preliminaryScore = Math.round(criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length)

  const feedback = [
    `Scholarly Activity Preliminary Score: ${preliminaryScore}/100.`,
    pubScore < 50 ? `⚠ Verified publication count is ${verifiedCount}. Run publication verification.` : `✓ ${verifiedCount} verified publication(s).`,
    confScore < 50 ? '⚠ Conference participation proofs missing.' : '✓ Conference evidence present.',
    editScore < 50 ? '⚠ Editorial/grant work evidence weak.' : '✓ Editorial work documented.',
    supScore < 50 ? '⚠ Supervision record missing.' : '✓ Supervision described.',
  ].join(' ')

  return {
    verifiedPublications: pubCriterion,
    conferenceParticipation: confCriterion,
    editorialWork: editCriterion,
    supervision: supCriterion,
    preliminaryScore,
    aiGeneratedFeedback: feedback,
  }
}

// ── Service ────────────────────────────────────────────────────────────────
export function scoreService(app: ApplicationData): ServiceRubricScores {
  const services = (app.services ?? {}) as Record<string, unknown>
  const hasCommitteeLetters = hasUploads(services.committeeLetters)
  const hasServiceProofs = hasUploads(services.serviceProofs)

  const committeeText = services.committees as string | undefined
  const committeeScore = hasCommitteeLetters ? 85 : hasText(committeeText) ? 45 : 5
  const committeeCriterion: RubricCriterion = {
    id: 'committeeWork',
    score: committeeScore,
    rationale: hasCommitteeLetters
      ? 'Committee membership letters uploaded.'
      : hasText(committeeText)
        ? 'Committee work described but no letters uploaded. Upload appointment letters.'
        : 'No committee work evidence. Status: Deficient.',
    evidenceLinks: [],
  }

  const boardText = services.boardMemberships as string | undefined
  const institutionalScore = hasServiceProofs ? 85 : hasText(boardText) ? 50 : 5
  const institutionalCriterion: RubricCriterion = {
    id: 'institutionalContributions',
    score: institutionalScore,
    rationale: hasServiceProofs
      ? 'Institutional service proof documents uploaded.'
      : hasText(boardText)
        ? 'Institutional contributions described but no proofs uploaded.'
        : 'No institutional contribution evidence. Status: Deficient.',
    evidenceLinks: [],
  }

  const communityText = [
    services.charitableWork,
    services.ngos,
    services.advising,
    services.consulting,
  ].filter((t) => hasText(t as string)).length
  const communityScore = communityText >= 2 ? 75 : communityText === 1 ? 45 : 5
  const communityCriterion: RubricCriterion = {
    id: 'communityService',
    score: communityScore,
    rationale: communityText >= 2
      ? 'Multiple community service activities documented.'
      : communityText === 1
        ? 'One community service activity described. Strengthen with additional entries.'
        : 'No community service activities described. Status: Deficient.',
    evidenceLinks: [],
  }

  const criteriaScores = [committeeScore, institutionalScore, communityScore]
  const preliminaryScore = Math.round(criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length)

  const feedback = [
    `Service Preliminary Score: ${preliminaryScore}/100.`,
    committeeScore < 50 ? '⚠ Upload committee appointment letters.' : '✓ Committee work documented.',
    institutionalScore < 50 ? '⚠ Upload institutional service evidence.' : '✓ Institutional contributions evidenced.',
    communityScore < 50 ? '⚠ Document community service activities (advising, NGOs, consulting, charitable work).' : '✓ Community service documented.',
  ].join(' ')

  return {
    committeeWork: committeeCriterion,
    institutionalContributions: institutionalCriterion,
    communityService: communityCriterion,
    preliminaryScore,
    aiGeneratedFeedback: feedback,
  }
}

// ── Full evaluation ────────────────────────────────────────────────────────
export function evaluateApplication(
  applicationId: string,
  appData: ApplicationData,
  generatedBy: string,
): EvaluationReport {
  const publications = Array.isArray(appData.publications) ? (appData.publications as unknown[]) : []
  const publicationFlags = publications
    .filter((p) => {
      const pub = p as Record<string, unknown>
      const v = pub.verification as Record<string, unknown> | undefined
      return v?.flagReason
    })
    .map((p) => {
      const pub = p as Record<string, unknown>
      const v = pub.verification as Record<string, unknown>
      return `"${pub.articleTitle ?? pub.journalName}": ${v.flagReason}`
    })

  return {
    applicationId,
    teaching: scoreTeaching(appData),
    efforts: scoreEfforts(appData),
    scholarly: scoreScholarly(appData),
    service: scoreService(appData),
    publicationFlags,
    generatedAt: new Date().toISOString(),
    generatedBy,
  }
}
