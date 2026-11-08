import type { Application } from '../types'
import { formatApplicationTypeLabel, formatPromotionLabel } from '../types'

interface Row {
  label: string
  value: string
}

const lines = (...values: (string | number | undefined)[]) => values.filter(Boolean).join('\n')

/**
 * The applicant's own written answers, for the downloadable application PDF.
 * Deliberately excludes ratings, eligibility results, publication verification
 * and uploaded files, so it is safe to give to applicants.
 */
export function buildApplicationPdfRows(app: Application): Row[] {
  const { personalInfo: info, teachingEffectiveness: teaching, effortsToImprove: efforts, scholarship, services } = app
  const annual = app.annualEvaluation
  const isPromotion = app.applicationType === 'promotion'

  const rows: Row[] = [
    { label: 'Reference', value: app.id },
    {
      label: 'Application',
      value: isPromotion
        ? `Promotion to ${formatPromotionLabel(app.promotionType)}`
        : formatApplicationTypeLabel(app.applicationType),
    },
    { label: 'Submitted', value: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '' },
    { label: 'Full name', value: info.fullName },
    { label: "Father's name", value: info.fatherName },
    { label: 'CNIC', value: info.cnic },
    { label: 'Email', value: info.email },
    { label: 'Phone', value: info.phone },
    { label: 'Department', value: info.department },
    { label: 'Current designation', value: info.currentDesignation },
    { label: 'Date of birth', value: info.dateOfBirth },
    { label: 'Date of joining', value: info.dateOfJoining },
    {
      label: 'Qualifications',
      value: app.qualifications
        .map((q) => `${q.degree} in ${q.field}, ${q.institution}, ${q.country} (${q.year})${q.hec_attested ? ', HEC attested' : ''}`)
        .join('\n'),
    },
    {
      label: 'Experience',
      value: app.experience
        .map((e) => `${e.designation}, ${e.institution} (${e.from} to ${e.isCurrent ? 'present' : e.to}), ${e.type}`)
        .join('\n'),
    },
  ]

  if (isPromotion) {
    rows.push({
      label: 'Publications',
      value: app.publications
        .map((p, i) => {
          const issue = [p.volume && `Vol. ${p.volume}`, p.issue && `Issue ${p.issue}`, p.pageNumbers && `pp. ${p.pageNumbers}`]
            .filter(Boolean)
            .join(', ')
          return `${i + 1}. ${p.articleTitle}. ${p.authorNames.join(', ')}. ${p.journalName}, ${p.year}${issue ? `, ${issue}` : ''}. Indexing: ${p.indexing}, ${p.quartile}.`
        })
        .join('\n'),
    })
  }

  rows.push(
    { label: "Teaching: Fink's taxonomy alignment", value: teaching.finkAlignment },
    { label: "Teaching: Bloom's taxonomy alignment", value: teaching.bloomAlignment },
    { label: 'Teaching: higher-order thinking', value: teaching.higherOrderThinking },
    { label: 'Efforts to improve: innovations', value: efforts.innovations },
    { label: 'Efforts to improve: pedagogical improvement', value: efforts.pedagogicalImprovement },
    { label: 'Efforts to improve: curriculum development', value: efforts.curriculumDevelopment },
    { label: 'Efforts to improve: reflective practice', value: efforts.reflectivePractice },
    { label: 'Efforts to improve: CPDs undertaken', value: efforts.cpdsUndertaken },
    { label: 'Efforts to improve: CPD hours', value: efforts.cpdHours ? String(efforts.cpdHours) : '' },
    { label: 'Scholarship: summary', value: scholarship.summary },
    { label: 'Scholarship: grants', value: scholarship.grants },
    { label: 'Scholarship: conferences', value: scholarship.conferences },
    { label: 'Scholarship: editorial work', value: scholarship.editorialWork },
    { label: 'Scholarship: awards', value: scholarship.awards },
    { label: 'Scholarship: supervision', value: scholarship.supervision },
  )

  if (isPromotion) rows.push({ label: 'Research statement', value: app.researchStatement })

  rows.push(
    { label: 'Services: advising', value: services.advising },
    { label: 'Services: societies', value: services.societies },
    { label: 'Services: committees', value: services.committees },
    { label: 'Services: charitable work', value: services.charitableWork },
    { label: 'Services: NGOs', value: services.ngos },
    { label: 'Services: board memberships', value: services.boardMemberships },
    { label: 'Services: consulting', value: services.consulting },
  )

  if (annual) {
    rows.push(
      { label: 'Evaluation year', value: annual.evaluationYear },
      { label: 'Employment details', value: annual.employmentDetails },
      { label: 'Courses taught', value: annual.coursesTaught },
      { label: 'Teaching and learning', value: lines(annual.teachingStrategies, annual.assessmentMethods, annual.teachingInnovations, annual.teachingAchievements, annual.teachingReflection) },
      { label: 'Research and publications', value: lines(annual.researchActivities, annual.researchProjects, annual.conferencePresentations, annual.researchCollaborations, annual.researchAchievements) },
      { label: 'Professional development', value: lines(annual.professionalDevelopment, annual.cpdHours ? `CPD hours: ${annual.cpdHours}` : '') },
      { label: 'Scholarship and academic contributions', value: lines(annual.booksAndChapters, annual.academicContributions) },
      { label: 'Service and leadership', value: lines(annual.departmentalResponsibilities, annual.universityCommittees, annual.studentAdvisingAndActivities, annual.leadershipAndCommunityService, annual.institutionalEngagement) },
      { label: 'Self-reflection and future goals', value: lines(annual.majorAchievements, annual.challenges, annual.areasForImprovement, annual.futureGoals, annual.supportRequired) },
    )
  }

  return rows.filter((row) => row.value?.trim())
}
