// ── Roles ──
export type UserRole = 'faculty' | 'internal_reviewer' | 'external_reviewer' | 'admin'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  department?: string
  createdAt: string
}

// ── Promotion ──
export type PromotionType = 'associate_professor' | 'full_professor'
export type ApplicationType = 'promotion' | 'contract_renewal' | 'self_evaluation'
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'reviewed' | 'decision_made'

// ── Form Data ──
export interface PersonalInfo {
  fullName: string
  fatherName: string
  cnic: string
  email: string
  phone: string
  department: string
  currentDesignation: string
  dateOfBirth: string
  dateOfJoining: string
  applicationType: ApplicationType
  promotionType: PromotionType
}

export interface Qualification {
  id: string
  degree: string
  field: string
  institution: string
  country: string
  year: number
  hec_attested: boolean
}

export interface ExperienceEntry {
  id: string
  institution: string
  designation: string
  from: string
  to: string
  isCurrent: boolean
  type: 'teaching' | 'research' | 'industry'
}

export type JournalIndexing = 'HEC' | 'Scopus' | 'WoS' | 'DOAJ' | 'CNKI' | 'Other'
export type JournalQuartile = 'Q1' | 'Q2' | 'Q3' | 'Unranked'

export interface Publication {
  id: string
  journalName: string
  year: number
  volume: string
  issue: string
  articleTitle: string
  numberOfAuthors: number
  authorNames: string[]
  indexing: JournalIndexing
  recognized: boolean
  quartile: JournalQuartile
  apaReference: string
}

export type RatingLevel = 'exceeds' | 'meets' | 'minimal' | 'deficient'

export interface TeachingEffectiveness {
  finkAlignment: string
  higherOrderThinking: string
  chairRating: number
  deanRating: number
  studentRating: number
  overallRating: RatingLevel
}

export interface EffortsToImprove {
  innovations: string
  pedagogicalImprovement: string
  curriculumDevelopment: string
  reflectivePractice: string
  cpdsUndertaken: string
  cpdHours: number
  overallRating: RatingLevel
}

export interface ScholarshipData {
  summary: string
  grants: string
  conferences: string
  editorialWork: string
  awards: string
  supervision: string
  chairRating: number
  deanRating: number
  overallRating: RatingLevel
}

export interface ServicesData {
  advising: string
  societies: string
  committees: string
  charitableWork: string
  ngos: string
  boardMemberships: string
  consulting: string
  chairRating: number
  deanRating: number
  overallRating: RatingLevel
}

export interface DocumentFile {
  name: string
  url: string
  path: string
  uploadedAt: string
}

export interface ApplicationDocuments {
  coverLetter?: DocumentFile
  researchStatement?: DocumentFile
  phdDegree?: DocumentFile
  phdTranscript?: DocumentFile
  hecAttestation?: DocumentFile
  mastersDegree?: DocumentFile
  mastersTranscript?: DocumentFile
  experienceLetters: DocumentFile[]
  selfEvaluationForm?: DocumentFile
  chairEvaluation?: DocumentFile
  deanEvaluation?: DocumentFile
  courseOutlines: DocumentFile[]
  assignments: DocumentFile[]
  teachingSupportDocs: DocumentFile[]
  effortsToImprovePdf?: DocumentFile
  abstractsPdf?: DocumentFile
  updatedCV?: DocumentFile
}

export type EligibilityStatus = 'eligible' | 'conditionally_eligible' | 'not_eligible'

export interface EligibilityResult {
  status: EligibilityStatus
  vetPassed: boolean
  phdCompleted: boolean
  experienceMet: boolean
  publicationsMet: boolean
  totalExperienceYears: number
  postPhdYears: number
  recognizedPublications: number
  requiredPublications: number
  reasons: string[]
}

// ── Scoring ──
export const TEACHING_SCORES: Record<RatingLevel, number> = {
  exceeds: 45,
  meets: 36,
  minimal: 27,
  deficient: 18,
}

export const EFFORTS_SCORES: Record<RatingLevel, number> = {
  exceeds: 10,
  meets: 8,
  minimal: 6,
  deficient: 4,
}

export const SCHOLARSHIP_SCORES: Record<RatingLevel, number> = {
  exceeds: 25,
  meets: 20,
  minimal: 15,
  deficient: 10,
}

export const SERVICES_SCORES: Record<RatingLevel, number> = {
  exceeds: 20,
  meets: 16,
  minimal: 12,
  deficient: 8,
}

// ── Application ──
export interface Application {
  id: string
  applicantUid: string
  applicantName: string
  applicantEmail: string
  applicationType: ApplicationType
  promotionType: PromotionType
  status: ApplicationStatus

  personalInfo: PersonalInfo
  qualifications: Qualification[]
  experience: ExperienceEntry[]
  publications: Publication[]
  teachingEffectiveness: TeachingEffectiveness
  effortsToImprove: EffortsToImprove
  scholarship: ScholarshipData
  researchStatement: string
  services: ServicesData
  documents: ApplicationDocuments
  declaration: boolean

  eligibilityResult?: EligibilityResult

  teachingScore?: number
  effortsScore?: number
  scholarshipScore?: number
  servicesScore?: number
  totalScore?: number

  vetPassed: boolean

  createdAt: string
  updatedAt: string
  submittedAt?: string
}

// ── Reviews ──
export type ReviewRecommendation =
  | 'strongly_recommended'
  | 'recommended'
  | 'conditionally_recommended'
  | 'not_recommended'

export interface InternalReview {
  id: string
  applicationId: string
  reviewerUid: string
  reviewerName: string

  personalInfoComments: string
  qualificationsComments: string
  experienceComments: string
  publicationsComments: string
  teachingComments: string
  effortsComments: string
  scholarshipComments: string
  servicesComments: string
  researchComments: string

  overallComments: string
  recommendation: ReviewRecommendation

  createdAt: string
  updatedAt: string
}

export type ExternalRecommendation = 'recommended' | 'not_recommended'

export interface ExternalReview {
  id: string
  applicationId: string
  reviewerUid: string
  reviewerName: string

  academicStanding: string
  researchProductivity: string
  visibilityContribution: string
  overallEvaluation: ExternalRecommendation

  createdAt: string
  updatedAt: string
}

// ── Helpers ──
export function emptyPersonalInfo(): PersonalInfo {
  return {
    fullName: '',
    fatherName: '',
    cnic: '',
    email: '',
    phone: '',
    department: '',
    currentDesignation: '',
    dateOfBirth: '',
    dateOfJoining: '',
    applicationType: 'promotion',
    promotionType: 'associate_professor',
  }
}

export function emptyTeachingEffectiveness(): TeachingEffectiveness {
  return {
    finkAlignment: '',
    higherOrderThinking: '',
    chairRating: 0,
    deanRating: 0,
    studentRating: 0,
    overallRating: 'meets',
  }
}

export function emptyEffortsToImprove(): EffortsToImprove {
  return {
    innovations: '',
    pedagogicalImprovement: '',
    curriculumDevelopment: '',
    reflectivePractice: '',
    cpdsUndertaken: '',
    cpdHours: 0,
    overallRating: 'meets',
  }
}

export function formatPromotionLabel(type: PromotionType): string {
  return type === 'associate_professor' ? 'Associate Professor' : 'Full Professor'
}

export function formatApplicationTypeLabel(type: ApplicationType): string {
  if (type === 'contract_renewal') return 'Contract Renewal'
  if (type === 'self_evaluation') return 'Regular Self-Evaluation'
  return 'Promotion Application'
}

export function emptyScholarship(): ScholarshipData {
  return {
    summary: '',
    grants: '',
    conferences: '',
    editorialWork: '',
    awards: '',
    supervision: '',
    chairRating: 0,
    deanRating: 0,
    overallRating: 'meets',
  }
}

export function emptyServices(): ServicesData {
  return {
    advising: '',
    societies: '',
    committees: '',
    charitableWork: '',
    ngos: '',
    boardMemberships: '',
    consulting: '',
    chairRating: 0,
    deanRating: 0,
    overallRating: 'meets',
  }
}

export function emptyDocuments(): ApplicationDocuments {
  return {
    experienceLetters: [],
    courseOutlines: [],
    assignments: [],
    teachingSupportDocs: [],
  }
}
