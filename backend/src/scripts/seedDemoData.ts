// Seeds a realistic, full-lifecycle demo dataset against the already-running
// local backend + Firebase Auth Emulator — mirroring what's on the live
// server, but entirely local. Drives the *real* HTTP API (not direct
// Firestore writes) so every status transition, assignment, review, and
// committee decision goes through the same validation as production.
//
// Prerequisites: emulators + backend running, and `npm run seed:demo-users`
// already executed (this script signs in as those accounts).
//
// Run with:
//   npm run seed:demo-data
//
// Safe to re-run: steps that have already happened (accounts registered,
// applications created, reviews submitted, etc.) are detected and skipped.
const AUTH_EMULATOR_URL = process.env.FIREBASE_AUTH_EMULATOR_HOST
  ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
  : 'http://127.0.0.1:9099'
const API_URL = process.env.BACKEND_URL || 'http://localhost:5000'
const DEMO_PASSWORD = 'Demo@12345'

interface Session {
  uid: string
  email: string
  token: string
}

async function authRequest(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/${path}?key=demo-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, returnSecureToken: true }),
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(`${path} failed: ${JSON.stringify(json)}`)
  return json
}

async function signInOrSignUp(email: string): Promise<Session> {
  try {
    const signIn = await authRequest('accounts:signInWithPassword', { email, password: DEMO_PASSWORD })
    return { uid: String(signIn.localId), email, token: String(signIn.idToken) }
  } catch {
    const signUp = await authRequest('accounts:signUp', { email, password: DEMO_PASSWORD })
    return { uid: String(signUp.localId), email, token: String(signUp.idToken) }
  }
}

async function api<T = Record<string, unknown>>(
  session: Session,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`)
  return json as T
}

async function ensureFacultyProfile(session: Session, displayName: string, department: string): Promise<void> {
  try {
    await api(session, 'GET', '/api/auth/me')
  } catch {
    await api(session, 'POST', '/api/auth/register', { displayName, role: 'faculty', department })
  }
}

function fakeDoc(name: string) {
  return { name, url: `https://example.com/demo-docs/${name}`, path: `demo/${name}`, uploadedAt: new Date().toISOString() }
}

interface CycleDef {
  key: string
  name: string
  applicationType: 'promotion' | 'contract_renewal' | 'self_evaluation'
  promotionType?: 'associate_professor' | 'full_professor'
}

const CYCLE_DEFS: CycleDef[] = [
  { key: 'promotion_associate', name: 'Associate Professor Promotion 2026-27', applicationType: 'promotion', promotionType: 'associate_professor' },
  { key: 'promotion_full', name: 'Full Professor Promotion 2026-27', applicationType: 'promotion', promotionType: 'full_professor' },
  { key: 'contract_renewal', name: 'Contract Renewal 2026-27', applicationType: 'contract_renewal' },
  { key: 'self_evaluation', name: 'Annual Self-Evaluation 2026-27', applicationType: 'self_evaluation' },
]

async function ensureCycles(admin: Session): Promise<Record<string, string>> {
  const existing = await api<Array<Record<string, unknown>>>(admin, 'GET', '/api/workflows/cycles')
  const byKey: Record<string, string> = {}
  const opensAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const closesAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  for (const def of CYCLE_DEFS) {
    const found = existing.find(
      (c) => c.applicationType === def.applicationType && (!def.promotionType || c.promotionType === def.promotionType),
    )
    if (found) {
      byKey[def.key] = String(found.id)
      console.log(`Cycle already exists: ${def.name}`)
      continue
    }
    const created = await api<Record<string, unknown>>(admin, 'POST', '/api/workflows/cycles', {
      name: def.name,
      applicationType: def.applicationType,
      promotionType: def.promotionType,
      academicYear: '2026-2027',
      opensAt,
      closesAt,
      requiredDocuments: [],
    })
    byKey[def.key] = String(created.id)
    console.log(`Created cycle: ${def.name}`)
  }
  return byKey
}

interface FacultyDef {
  email: string
  displayName: string
  department: string
  designation: string
  applicationType: 'promotion' | 'contract_renewal' | 'self_evaluation'
  promotionType: 'associate_professor' | 'full_professor'
  cycleKey: string
  researchStatement: string
}

const FACULTY_DEFS: FacultyDef[] = [
  {
    email: 'ayesha.siddiqui@fccollege.edu.pk',
    displayName: 'Dr. Ayesha Siddiqui',
    department: 'Computer Science',
    designation: 'Assistant Professor',
    applicationType: 'promotion',
    promotionType: 'associate_professor',
    cycleKey: 'promotion_associate',
    researchStatement: 'My research focuses on applied machine learning for educational assessment, with an emphasis on explainable AI methods that support formative feedback in undergraduate computing courses.',
  },
  {
    email: 'bilal.ahmed@fccollege.edu.pk',
    displayName: 'Dr. Bilal Ahmed',
    department: 'Mathematics',
    designation: 'Associate Professor',
    applicationType: 'promotion',
    promotionType: 'full_professor',
    cycleKey: 'promotion_full',
    researchStatement: 'My research program spans computational number theory and its applications to cryptographic protocol design, with sustained international collaboration and doctoral supervision.',
  },
  {
    email: 'sara.malik@fccollege.edu.pk',
    displayName: 'Dr. Sara Malik',
    department: 'Physics',
    designation: 'Assistant Professor',
    applicationType: 'contract_renewal',
    promotionType: 'associate_professor',
    cycleKey: 'contract_renewal',
    researchStatement: 'I continue to develop low-cost optical sensing instrumentation for undergraduate physics labs while mentoring final-year capstone research teams.',
  },
  {
    email: 'omer.farooq@fccollege.edu.pk',
    displayName: 'Dr. Omer Farooq',
    department: 'Economics',
    designation: 'Associate Professor',
    applicationType: 'self_evaluation',
    promotionType: 'associate_professor',
    cycleKey: 'self_evaluation',
    researchStatement: 'This year I expanded my applied econometrics seminar and co-authored two policy briefs on regional trade with the Economics Research Centre.',
  },
]

function personalInfoFor(def: FacultyDef) {
  return {
    fullName: def.displayName,
    fatherName: 'Muhammad Tariq',
    cnic: '35202-1234567-1',
    email: def.email,
    phone: '0300-1234567',
    department: def.department,
    currentDesignation: def.designation,
    dateOfBirth: '1985-04-12',
    dateOfJoining: '2016-08-01',
    applicationType: def.applicationType,
    promotionType: def.promotionType,
  }
}

function sharedSections(def: FacultyDef) {
  return {
    qualifications: [
      {
        id: 'q1', degree: 'PhD', field: def.department, institution: 'University of the Punjab',
        country: 'Pakistan', year: 2015, hec_attested: true,
      },
      {
        id: 'q2', degree: 'MS', field: def.department, institution: 'LUMS',
        country: 'Pakistan', year: 2010, hec_attested: true,
      },
    ],
    experience: [
      {
        id: 'e1', institution: 'Forman Christian College', designation: def.designation,
        from: '2016-08-01', to: '', isCurrent: true, type: 'teaching', institutionType: 'higher_education',
      },
      {
        id: 'e2', institution: 'National University of Sciences and Technology', designation: 'Lecturer',
        from: '2011-09-01', to: '2016-07-31', isCurrent: false, type: 'teaching', institutionType: 'higher_education',
      },
    ],
    publications: [
      {
        id: 'p1', journalName: `Journal of ${def.department} Research`, year: 2024, volume: '18', issue: '2',
        pageNumbers: '110-128', articleTitle: `Advances in ${def.department} Pedagogy`, numberOfAuthors: 2,
        authorNames: [def.displayName, 'Co-Author, A.'], indexing: 'HEC', recognized: true, quartile: 'Q1',
        apaReference: `${def.displayName.replace('Dr. ', '')} & Co-Author, A. (2024). Advances in ${def.department.toLowerCase()} pedagogy. Journal of ${def.department} Research, 18(2), 110-128.`,
      },
      {
        id: 'p2', journalName: `International Review of ${def.department}`, year: 2022, volume: '9', issue: '1',
        pageNumbers: '45-60', articleTitle: `Case Studies in ${def.department}`, numberOfAuthors: 1,
        authorNames: [def.displayName], indexing: 'Scopus', recognized: true, quartile: 'Q2',
        apaReference: `${def.displayName.replace('Dr. ', '')} (2022). Case studies in ${def.department.toLowerCase()}. International Review of ${def.department}, 9(1), 45-60.`,
      },
    ],
    teachingEffectiveness: {
      bloomAlignment: 'Course assessments are mapped to Bloom\u2019s taxonomy, moving students from recall toward analysis and evaluation tasks across the semester.',
      finkAlignment: 'Learning activities integrate Fink\u2019s taxonomy, pairing foundational knowledge with application and integration assignments.',
      higherOrderThinking: 'Capstone projects require students to synthesize course concepts into an original proposal, defended in a peer review session.',
      chairRating: 0,
      deanRating: 0,
      studentRating: 0,
      overallRating: 'deficient',
      sloDocuments: [fakeDoc('slo-sample.pdf')],
    },
    documents: {
      experienceLetters: [fakeDoc('experience-letter.pdf')],
      courseOutlines: [fakeDoc('course-outline-1.pdf'), fakeDoc('course-outline-2.pdf')],
      assignments: [fakeDoc('assignment-sample.pdf')],
      teachingSupportDocs: [fakeDoc('teaching-support.pdf')],
    },
    effortsToImprove: {
      innovations: 'Introduced flipped-classroom delivery for core courses, moving lecture content to recorded modules and using class time for applied problem-solving.',
      pedagogicalImprovement: 'Completed a certificate in outcome-based education and revised course rubrics to align with program learning outcomes.',
      curriculumDevelopment: 'Led a departmental working group that refreshed two core course outlines to reflect current industry practice.',
      reflectivePractice: 'Maintain a teaching journal reviewed each semester with the department chair to identify areas for continued improvement.',
      cpdsUndertaken: 'HEC-certified workshop on outcome-based education; university-run workshop on inclusive assessment design.',
      cpdHours: 24,
      overallRating: 'deficient',
    },
    scholarship: {
      summary: 'Sustained publication record with HEC-recognized and Scopus-indexed venues, alongside active conference participation.',
      grants: 'Co-investigator on a university seed grant supporting undergraduate research assistants.',
      conferences: 'Presented at two national conferences in the past two years, including one keynote-adjacent session.',
      editorialWork: 'Serves as a reviewer for a departmental working paper series.',
      awards: 'Received a departmental teaching excellence commendation.',
      supervision: 'Supervising three undergraduate final-year projects and one MS thesis.',
      chairRating: 0,
      deanRating: 0,
      overallRating: 'deficient',
    },
    services: {
      advising: 'Academic advisor to approximately 25 undergraduate students per year.',
      societies: 'Faculty advisor to the departmental student society.',
      committees: 'Member of the departmental curriculum review committee.',
      charitableWork: 'Volunteers with a weekend tutoring program for underprivileged students.',
      ngos: 'N/A',
      boardMemberships: 'N/A',
      consulting: 'Occasional curriculum consulting for a partner school.',
      chairRating: 0,
      deanRating: 0,
      overallRating: 'deficient',
    },
    researchStatement: def.researchStatement,
    declaration: true,
    vetPassed: true,
  }
}

async function createAndSubmitApplication(
  session: Session,
  def: FacultyDef,
  cycleIds: Record<string, string>,
): Promise<string> {
  await ensureFacultyProfile(session, def.displayName, def.department)

  const mine = await api<Array<Record<string, unknown>>>(session, 'GET', '/api/applications/mine')
  let applicationId = (mine.find((a) => a.applicationType === def.applicationType) || {}).id as string | undefined

  if (!applicationId) {
    const created = await api<Record<string, unknown>>(session, 'POST', '/api/applications', {
      applicationType: def.applicationType,
      promotionType: def.promotionType,
      cycleId: cycleIds[def.cycleKey],
    })
    applicationId = String(created.id)
    console.log(`Created ${def.applicationType} application for ${def.displayName}`)
  }

  const current = await api<Record<string, unknown>>(session, 'GET', `/api/applications/${applicationId}`)
  if (current.status !== 'draft') {
    console.log(`${def.displayName}'s application is already ${String(current.status)} — skipping fill/submit`)
    return applicationId
  }

  const shared = sharedSections(def)
  const putBody: Record<string, unknown> = {
    ...current,
    personalInfo: personalInfoFor(def),
    qualifications: shared.qualifications,
    experience: shared.experience,
    publications: shared.publications,
    teachingEffectiveness: { ...(current.teachingEffectiveness as object), ...shared.teachingEffectiveness },
    effortsToImprove: { ...(current.effortsToImprove as object), ...shared.effortsToImprove },
    scholarship: { ...(current.scholarship as object), ...shared.scholarship },
    services: { ...(current.services as object), ...shared.services },
    documents: shared.documents,
    researchStatement: shared.researchStatement,
    declaration: true,
    vetPassed: true,
  }
  if (def.applicationType === 'self_evaluation') {
    putBody.annualEvaluation = {
      ...(current.annualEvaluation as object),
      coursesTaught: 'Introductory and advanced courses in the discipline, totaling 4 sections across two semesters.',
      teachingStrategies: 'Active-learning seminars supplemented by weekly office hours and peer study groups.',
      researchActivities: def.researchStatement,
      professionalDevelopment: 'Attended two HEC-sponsored pedagogy workshops this year.',
      cpdHours: 20,
      departmentalResponsibilities: 'Coordinates the departmental seminar series.',
      majorAchievements: 'Published two policy-facing research briefs and mentored three undergraduate researchers.',
    }
  }

  await api(session, 'PUT', `/api/applications/${applicationId}`, putBody)
  await api(session, 'POST', `/api/applications/${applicationId}/submit`, {})
  console.log(`Submitted application for ${def.displayName}`)
  return applicationId
}

async function assignReviewers(
  admin: Session,
  applicationId: string,
  internal1: Session,
  internal2: Session,
  external?: Session,
): Promise<void> {
  try {
    await api(admin, 'PUT', `/api/workflows/applications/${applicationId}/assignments`, {
      internalReviewer1Uid: internal1.uid,
      internalReviewer2Uid: internal2.uid,
      ...(external ? { externalReviewerUid: external.uid } : {}),
    })
    console.log(`Assigned reviewers for application ${applicationId}`)
  } catch (err) {
    console.log(`  (assignment skipped: ${(err as Error).message})`)
  }
}

async function submitInternalReview(session: Session, applicationId: string, recommendation: string): Promise<void> {
  try {
    const review = await api<Record<string, unknown>>(session, 'POST', `/api/reviews/internal/${applicationId}`, {})
    if (review.status === 'submitted') {
      console.log(`  internal review by ${session.email} already submitted`)
      return
    }
    await api(session, 'PUT', `/api/reviews/internal/${applicationId}/${session.uid}`, {
      personalInfoComments: 'Personal information is complete and consistent with HR records.',
      qualificationsComments: 'Qualifications meet HEC requirements for the rank applied for.',
      experienceComments: 'Teaching and research experience exceed the minimum requirement.',
      publicationsComments: 'Publication record includes HEC-recognized and Scopus-indexed venues.',
      teachingComments: 'Teaching evidence demonstrates strong alignment with outcome-based education practices.',
      effortsComments: 'Clear, sustained effort to improve teaching through certified professional development.',
      scholarshipComments: 'Scholarship record is consistent with departmental expectations for this rank.',
      servicesComments: 'Service contributions to the department and community are well documented.',
      researchComments: 'Research statement is coherent and sets out a credible forward trajectory.',
      overallComments: 'A strong file overall; recommended for advancement.',
      recommendation,
    })
    await api(session, 'POST', `/api/reviews/internal/${applicationId}/${session.uid}/submit`, {})
    console.log(`  internal review submitted by ${session.email}`)
  } catch (err) {
    console.log(`  (internal review skipped for ${session.email}: ${(err as Error).message})`)
  }
}

async function submitExternalReview(session: Session, applicationId: string): Promise<void> {
  try {
    const review = await api<Record<string, unknown>>(session, 'POST', `/api/reviews/external/${applicationId}`, {})
    if (review.status === 'submitted') {
      console.log(`  external review already submitted`)
      return
    }
    await api(session, 'PUT', `/api/reviews/external/${applicationId}/${session.uid}`, {
      academicStanding: 'The candidate holds strong international academic standing within the sub-discipline.',
      researchProductivity: 'Research output is sustained and appropriately cited within the field.',
      visibilityContribution: 'The candidate is visible through conference participation and editorial service.',
      overallEvaluation: 'recommended',
    })
    await api(session, 'POST', `/api/reviews/external/${applicationId}/${session.uid}/submit`, {})
    console.log(`  external review submitted`)
  } catch (err) {
    console.log(`  (external review skipped: ${(err as Error).message})`)
  }
}

async function recordCommitteeDecision(committee: Session, admin: Session, applicationId: string): Promise<void> {
  try {
    await api(committee, 'POST', `/api/workflows/applications/${applicationId}/committee-decision`, {
      decision: 'approved',
      justification: 'The committee finds the case meets all criteria for promotion based on the reviewer assessments.',
      meetingDate: new Date().toISOString(),
      observations: 'Unanimous recommendation.',
    })
    await api(admin, 'POST', `/api/workflows/applications/${applicationId}/committee-decision/authorize`, {})
    console.log(`  committee decision recorded and authorized for ${applicationId}`)
  } catch (err) {
    console.log(`  (committee decision skipped: ${(err as Error).message})`)
  }
}

const NON_FACULTY_DEMO_EMAILS = [
  'demo.internal@fccollege.edu.pk',
  'demo.internal2@fccollege.edu.pk',
  'demo.external@fccollege.edu.pk',
  'demo.admin@fccollege.edu.pk',
  'demo.committee@fccollege.edu.pk',
]

// The dev-mode demo-seed (src/services/demoSeed.ts) runs for *any* signed-in
// user regardless of role, so simply signing into the reviewer/admin/external
// tiles once in the UI leaves them with bogus "faculty applicant"
// applications of their own. Clear those out so the admin's application list
// reflects a realistic dataset.
async function cleanupNonFacultySeedJunk(admin: Session): Promise<void> {
  const all = await api<Array<Record<string, unknown>>>(admin, 'GET', '/api/applications/all')
  const junk = all.filter((a) => NON_FACULTY_DEMO_EMAILS.includes(String(a.applicantEmail)))
  for (const app of junk) {
    await api(admin, 'DELETE', `/api/applications/${app.id}`)
    console.log(`Removed stray self-seeded application for ${app.applicantEmail} (${app.id})`)
  }
}

async function main() {
  console.log('Signing in demo accounts...')
  const admin = await signInOrSignUp('demo.admin@fccollege.edu.pk')
  const internal1 = await signInOrSignUp('demo.internal@fccollege.edu.pk')
  const internal2 = await signInOrSignUp('demo.internal2@fccollege.edu.pk')
  const external = await signInOrSignUp('demo.external@fccollege.edu.pk')
  const committee = await signInOrSignUp('demo.committee@fccollege.edu.pk')

  console.log('\nCleaning up any stray self-seeded applications on non-faculty demo accounts...')
  await cleanupNonFacultySeedJunk(admin)

  console.log('\nEnsuring application cycles are open...')
  const cycleIds = await ensureCycles(admin)

  console.log('\nCreating faculty applicants and submitting applications...')
  const applicationIds: Record<string, string> = {}
  for (const def of FACULTY_DEFS) {
    const session = await signInOrSignUp(def.email)
    applicationIds[def.email] = await createAndSubmitApplication(session, def, cycleIds)
  }

  console.log('\nScenario 1 — full lifecycle through committee decision (Dr. Ayesha Siddiqui)...')
  const ayeshaId = applicationIds['ayesha.siddiqui@fccollege.edu.pk']!
  await assignReviewers(admin, ayeshaId, internal1, internal2)
  await submitInternalReview(internal1, ayeshaId, 'strongly_recommended')
  await submitInternalReview(internal2, ayeshaId, 'recommended')
  await recordCommitteeDecision(committee, admin, ayeshaId)

  console.log('\nScenario 2 — full professor case ready for committee (Dr. Bilal Ahmed)...')
  const bilalId = applicationIds['bilal.ahmed@fccollege.edu.pk']!
  await assignReviewers(admin, bilalId, internal1, internal2, external)
  await submitInternalReview(internal1, bilalId, 'recommended')
  await submitInternalReview(internal2, bilalId, 'recommended')
  await submitExternalReview(external, bilalId)
  // Left at "reviewed" status intentionally — a live, undecided case for the
  // Committee Portal demo.

  console.log('\nScenario 3 — review in progress, one reviewer still pending (Dr. Sara Malik)...')
  const saraId = applicationIds['sara.malik@fccollege.edu.pk']!
  await assignReviewers(admin, saraId, internal1, internal2)
  await submitInternalReview(internal1, saraId, 'conditionally_recommended')
  // internal2 intentionally left pending to show an in-progress review.

  console.log('\nScenario 4 — annual self-evaluation, no review workflow needed (Dr. Omer Farooq) — done above.')

  console.log('\nDone! Sample data is ready:')
  console.log('  - Dr. Ayesha Siddiqui (Associate Professor promotion): decision_made / approved')
  console.log('  - Dr. Bilal Ahmed (Full Professor promotion): reviewed, awaiting committee decision')
  console.log('  - Dr. Sara Malik (Contract renewal): under_review, one of two reviews submitted')
  console.log('  - Dr. Omer Farooq (Self-evaluation): submitted')
  console.log('  - Demo Faculty: 3 applications auto-seeded on first sign-in (unchanged)')
  process.exit(0)
}

main().catch((err) => {
  console.error('Failed to seed demo data:', err)
  process.exit(1)
})
