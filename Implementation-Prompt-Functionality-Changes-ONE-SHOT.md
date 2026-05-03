# ONE-SHOT IMPLEMENTATION PROMPT (Portal App)

Use this exact prompt with a highest-capability coding model to implement the requested functionality changes in one pass.

---

You are a principal full-stack engineer. Implement the following in the existing repo at once, with concrete code edits (not just recommendations).

## Tech/Repo Context
- Frontend: React + TypeScript (Vite)
- Backend: Node/TypeScript in `backend/src`
- Storage/Auth: Firebase + Firestore
- Existing areas include:
  - Frontend components under `src/components/**`
  - Services under `src/services/**` and `src/lib/api.ts`
  - Backend routes under `backend/src/routes/**`
  - Shared types in `src/types.ts`
  - Firestore rules in `firestore.rules`

## Primary Goal
Implement policy-driven evaluation controls for promotion applications:
1) publication verification,
2) evidence-based rubric scoring with Deficient baseline,
3) section-level uploads,
4) reviewer-only visibility for AI scoring,
5) applicant pre-submit preview.

## Hard Constraints
- Preserve existing architecture and naming style.
- Avoid breaking existing auth flows.
- Do not expose reviewer-only AI scores to applicants at API or UI layers.
- Keep code compileable and type-safe.
- Add/update tests where the project already supports testing.

## Required Changes by Area

### A. Data Model and Types
Update/extend the types in:
- `src/types.ts`
- `backend/src/index.ts` (or backend type modules if present)

Add fields for:
- Section baseline and current status: `deficient | meets | exceeds` (or project-consistent enum)
- Publication verification metadata:
  - `verificationStatus: verified | unverified | unknown`
  - `verificationSources: Array<{ source: 'HEC' | 'SCOPUS' | 'WOS' | 'OTHER'; matched: boolean; confidence?: number; checkedAt: string; referenceUrl?: string; notes?: string }>`
  - `verificationFlagReason?: string`
- Rubric scoring:
  - per-criterion score
  - aggregate preliminary score
  - structured rationale text
  - evidence links/snippets
- Criterion-linked reviewer comments/annotations:
  - criterion id
  - comment
  - author role/id
  - timestamp
- Visibility controls:
  - fields that are reviewer-only (do not send to applicant response DTOs)

### B. Backend Services
Create/update services under:
- `backend/src` (create `services/` if needed)

Implement:
1. `publicationVerificationService`
   - Adapter pattern for sources (`HEC`, `SCOPUS`, `WOS`)
   - If no credentials exist, implement deterministic stubs/config-driven checks
   - Idempotent verification by publication ID + journal title
   - Retry-safe and error-tolerant behavior

2. `rubricScoringService`
   - Teaching effectiveness rubric:
     - Bloom alignment
     - Fink alignment
     - assessment suitability for higher-order thinking
     - cognitive complexity evidence
     - multi-source scores (chair/dean/students)
   - Professional development rubric:
     - training/certifications/workshops/reflective practice evidence
   - Scholarly/service rubric:
     - verified publications
     - conference participation
     - committee/institutional service
   - Baseline for these sections starts as `deficient`; upgrade only when evidence thresholds are met

3. Store structured scoring output and criterion evidence mapping in Firestore documents.

### C. Backend Routes and Access Control
Modify/add routes in:
- `backend/src/routes/applications.ts`
- `backend/src/routes/reviews.ts`
- optionally new routes file if cleaner

Add endpoints:
- `POST /applications/:id/publications/:pubId/verify`
- `POST /applications/:id/evaluate` (run/re-run AI/rubric scoring)
- `POST /applications/:id/reviewer-comments` (criterion-linked)
- `GET /applications/:id/reviewer-report` (reviewer-only)

Enforce role checks:
- Applicant:
  - can read own full application content for preview
  - cannot read reviewer-only scoring details, detailed AI report, or internal flags beyond permitted summary
- Reviewer roles (Chair/Dean/designated evaluator):
  - full access to application + AI report + criterion comments

Also ensure Firestore security rules (`firestore.rules`) reflect these boundaries.

### D. Frontend Applicant Workflow
Update applicant-facing components:
- `src/components/faculty/ApplicationForm.tsx`
- `src/components/faculty/steps/TeachingEffectiveness.tsx`
- `src/components/faculty/steps/EffortsToImprove.tsx`
- `src/components/faculty/steps/Scholarship.tsx`
- `src/components/faculty/steps/Services.tsx`
- `src/components/shared/FileUpload.tsx`

Implement:
- Subsection-level uploads (not just final upload bucket)
- Baseline labels start at `Deficient` for target sections
- Add “Review Before Submit” page/step showing complete application packet
- Ensure no detailed AI score summary is shown to applicant during review lifecycle

### E. Frontend Reviewer Workflow
Update reviewer/admin components:
- `src/components/reviewer/ReviewForm.tsx`
- `src/components/reviewer/ExternalReviewForm.tsx`
- `src/components/reviewer/InternalDashboard.tsx`
- `src/components/reviewer/ExternalDashboard.tsx`
- `src/components/admin/AdminDashboard.tsx` (if needed)

Implement:
- Full application access panel
- AI evaluation report panel with criterion breakdown
- Publication verification badges/flags and filtering
- Criterion-linked comment entry prompts/templates aligned to rubric

### F. API Client Layer
Update:
- `src/lib/api.ts`
- `src/services/applications.ts`
- `src/services/reviews.ts`

Add methods for:
- publication verify
- run evaluation
- fetch reviewer report
- post/get criterion comments

Ensure DTO filtering so applicant clients never receive reviewer-only details.

### G. Initial Baseline Defaults (Critical)
For new applications, set default status to `Deficient` for:
- Teaching Effectiveness
- Efforts to Improve (Professional Development)
- Scholarly Activity
- Service

Only move above `Deficient` with evidence-backed rubric criteria.

### H. Publication Verification Behavior (Critical)
- On publication create/update: trigger verification
- Provide manual re-check action for reviewers
- Persist all check events with timestamps and source-level outcomes
- Flag unrecognized journals for reviewer attention

### I. Reviewer Prompt Helpers
Add structured prompt templates (UI strings/config) for reviewer qualitative feedback, such as:
- “Comment on Bloom/Fink alignment evidence quality”
- “Assess whether assessments demonstrate higher-order cognition”
- “Identify missing evidence for rubric criterion X”

Place these where reviewer forms can render them contextually.

### J. Testing and Validation
- Add/extend unit tests for rubric and verification services
- Add integration tests for role-based API visibility
- Verify applicant cannot access reviewer-only endpoints/fields
- Run build/typecheck and fix introduced issues

## Implementation Notes
- If external indexing APIs are unavailable, create provider interface + mock providers and mark TODO for credentials.
- Keep all timestamps ISO strings.
- Add concise comments only for non-obvious logic.
- Avoid broad refactors unrelated to requested changes.

## Deliverables Required in Final Response
After implementing, return:
1. Summary of what was implemented.
2. File-by-file list of changes.
3. Security/visibility guarantees enforced.
4. Test/build results.
5. Known limitations and TODOs (e.g., real API credentials).

---

Now execute the implementation directly in this repository.
