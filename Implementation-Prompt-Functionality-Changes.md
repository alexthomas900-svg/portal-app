# Promotion Portal - Implementation Prompt for Functionality Changes

Use this prompt with a high-capability coding model to implement the requested policy and workflow updates in this repository.

## Role and Objective
You are a senior full-stack engineer working in an existing TypeScript React + Firebase portal app.
Implement the changes below with production-quality code, minimal regressions, and clear reviewer-facing UX.
Do not only describe changes. Apply concrete code updates across frontend and backend.

## Mandatory Functional Changes

### 1) Publication Verification (Journal Recognition Check)
Implement automatic verification of submitted publications against recognized indexing sources (for example: HEC-recognized, Scopus, Web of Science).

Requirements:
- Do not rely only on applicant declaration fields.
- For each publication, run journal verification using available APIs/datasets/configured lists.
- Record verification metadata per publication:
  - source checked
  - match status
  - confidence
  - timestamp
  - evidence/reference URL
- Flag suspicious/unrecognized journals for reviewer attention.
- Show reviewer-visible warning badges and filter controls for flagged publications.
- Keep a transparent audit trail of checks.

Implementation guidance:
- Add backend verification service with provider adapters (HEC/Scopus/WoS stubs are acceptable if real credentials are unavailable).
- Make verification idempotent and retry-safe.
- Trigger verification on publication create/update and on explicit re-check action.
- Add defensive rate limiting and error handling.

Acceptance criteria:
- Publication can be marked verified/unverified/unknown.
- Reviewer sees verification result + evidence source.
- Applicant can submit, but flagged items are clearly visible to reviewers.

### 2) Teaching Effectiveness Evaluation
Change default baseline logic and add document-driven analysis.

Requirements:
- Initial teaching effectiveness status must be Deficient (not Meets Expectations).
- Applicants upload supporting teaching documents inside each relevant subsection (not only final upload).
- AI analysis must evaluate documents for:
  - SLO alignment with Bloom taxonomy
  - SLO alignment with Fink taxonomy
  - Assessment method appropriateness for higher-order thinking
  - Cognitive complexity evidence in activities/assessments
  - Multi-source inputs: Chair feedback, Dean review, student evaluations (applicant-entered scores)
- Generate structured AI feedback + preliminary teaching effectiveness score.

Implementation guidance:
- Extend section data model to store subsection-level uploads and extracted evidence snippets.
- Add backend rubric-based scoring pipeline with weighted criteria.
- Persist intermediate rubric scores and rationale text.
- Display reviewer-facing breakdown by criterion.

Acceptance criteria:
- Newly created applications start with teaching status Deficient.
- Evidence upload exists in each teaching subsection.
- AI feedback includes structured rubric dimensions and score rationale.

### 3) Professional Development / Efforts to Improve as Teacher
Use criteria-based evidence scoring instead of self-reported narrative.

Requirements:
- Initial status baseline is Deficient.
- Upgrade status only when evidence exists (training, certifications, workshops, reflective practice artifacts, etc.).
- Uploads must be attached in this section itself.

Implementation guidance:
- Add rubric criteria and minimum evidence thresholds.
- Parse and score uploaded documents/metadata against criteria.
- Store evidence-to-criterion links for reviewer traceability.

Acceptance criteria:
- Section starts as Deficient.
- Score/status changes only after evidence-backed checks.
- Reviewer can inspect which evidence changed which criterion.

### 4) Scholarly Activity and Service
Set baseline and evidence-based upgrade behavior.

Requirements:
- Initial score/status is Deficient.
- Adjust only from verified evidence:
  - publications
  - conference participation
  - committee/service contributions
  - institutional contributions

Implementation guidance:
- Reuse publication verification outputs.
- Add criterion-level evidence mapping.
- Ensure service evidence is separately represented from scholarly outputs.

Acceptance criteria:
- Baseline Deficient on new applications.
- Score movement is explainable by explicit evidence mappings.

### 5) Application Workflow and Transparency Controls
Add applicant preview and reviewer-only score visibility.

Requirements:
- Applicants can review full application before final submission.
- Applicants must NOT see detailed scoring summary or preliminary AI evaluation during review process.
- Reviewers (Chair, Dean, designated evaluators) must have full access to:
  - complete application materials
  - AI-generated evaluation reports
  - comments/annotations tied to each criterion
- Provide structured reviewer AI prompt helpers aligned with rubric criteria for qualitative feedback.

Implementation guidance:
- Update role-based access controls in backend and frontend guards.
- Add pre-submit review page for applicants.
- Hide/disable applicant access to evaluator-only scoring fields at API and UI levels.
- Add reviewer comment components per criterion and save with timestamps/user role.

Acceptance criteria:
- Applicant can preview final packet pre-submit.
- Applicant cannot retrieve hidden evaluator scoring via API.
- Reviewer dashboards show full materials + AI reports + criterion-linked comments.

## Non-Functional Requirements
- Keep existing architecture and coding style.
- Add migration-safe schema updates for Firestore documents/types.
- Add validation and graceful fallbacks for missing AI/verification providers.
- Log important decisions and failures for auditability.
- Ensure no breaking changes to existing auth and route protections.

## Concrete Engineering Tasks
1. Update domain types/interfaces in frontend and backend for:
   - baseline status fields per section
   - rubric criteria scores and rationale
   - verification metadata
   - criterion-linked comments
2. Add backend services:
   - publication verification engine with provider adapter pattern
   - rubric scoring services for teaching/professional development/scholarly service
3. Add/extend backend routes:
   - verify publication endpoint
   - run/re-run AI scoring endpoint
   - reviewer comments by criterion endpoint
4. Update frontend forms:
   - subsection-level uploads in teaching and efforts sections
   - evidence status indicators
   - applicant pre-submit review page
5. Update reviewer dashboards/forms:
   - full AI report view
   - criterion-level feedback and annotations
   - flagged publication review UI
6. Enforce role-based visibility and API filtering.
7. Add tests:
   - unit tests for scoring logic
   - integration tests for role-based data visibility
   - regression tests for application workflow transitions

## Data and Security Rules Checklist
- Firestore security rules must enforce role-based read/write separation.
- Applicant role cannot read reviewer-only AI scoring collections/fields.
- Reviewer roles can read full evaluation artifacts.
- Log who performed verification/scoring actions and when.

## Suggested Implementation Order
1. Data model + types
2. Backend verification/scoring services
3. API endpoints
4. Frontend applicant upload and preview UX
5. Frontend reviewer evaluation UX
6. Security rules and end-to-end tests

## Definition of Done
- All five policy changes are implemented end-to-end.
- Baseline statuses default to Deficient where required.
- Evidence-driven scoring is stored with traceable rationale.
- Publication verification is automated and reviewer-visible.
- Applicant/reviewer transparency boundaries are enforced in both UI and API.
- Tests pass and no major regressions are introduced.

## Output Format Required from the Coding Model
When implementing, provide:
1. A concise change summary.
2. File-by-file modifications.
3. Any migration or config steps.
4. Test results and remaining known limitations.
