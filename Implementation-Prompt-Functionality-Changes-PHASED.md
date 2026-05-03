# PHASED IMPLEMENTATION PROMPT (Portal App)

Use this prompt with a high-capability coding model when you want safer, checkpoint-based execution instead of one large pass.

---

You are a senior full-stack engineer working in this repository. Implement the policy changes in strict phases. Do not skip phases. At the end of each phase, run validation (typecheck/build/tests if available) and report changed files.

## Project Context
- Frontend: React + TypeScript (Vite)
- Backend: Node + TypeScript in backend/src
- Firebase Auth + Firestore + Firestore Rules

Key files and areas:
- src/types.ts
- src/lib/api.ts
- src/services/applications.ts
- src/services/reviews.ts
- src/components/faculty/**
- src/components/reviewer/**
- src/components/shared/FileUpload.tsx
- backend/src/index.ts
- backend/src/routes/applications.ts
- backend/src/routes/reviews.ts
- firestore.rules

## Functional Requirements (Implement Fully)
1. Publication verification against recognized sources (HEC/Scopus/WoS), with per-source metadata, flags, and reviewer visibility.
2. Teaching effectiveness baseline default is Deficient, upgraded only with evidence; subsection-level uploads and rubric analysis (Bloom/Fink, higher-order assessment, cognitive complexity, multi-source inputs).
3. Professional development baseline default is Deficient; evidence-based upgrades only.
4. Scholarly activity and service baseline default is Deficient; evidence-based upgrades only.
5. Applicant can preview full application before final submission, but cannot view detailed AI scoring/report during review.
6. Reviewers (Chair/Dean/designated evaluators) have full access to application + AI reports + criterion-linked comments.

## Phase Plan

### Phase 1: Types and Schema Foundations
Tasks:
- Update frontend and backend types/interfaces for:
  - baseline and current section statuses
  - publication verification metadata
  - rubric criterion scores and rationales
  - reviewer criterion-linked comments
  - reviewer-only visibility fields
- Ensure new application initialization sets required sections to Deficient.

Validate:
- Typecheck passes for modified areas.

Output:
- List of updated type definitions and defaults.

### Phase 2: Backend Verification and Scoring Services
Tasks:
- Implement publication verification service with provider adapter pattern.
- Add deterministic provider stubs if real credentials are unavailable.
- Implement rubric scoring services for:
  - teaching effectiveness
  - professional development
  - scholarly/service
- Enforce baseline Deficient and evidence-threshold upgrade logic.
- Persist score/rationale/evidence mapping and verification audit metadata.

Validate:
- Unit tests for service logic (or add minimal coverage if absent).
- Typecheck backend.

Output:
- Service design summary and verification/scoring data examples.

### Phase 3: Backend Routes and Access Controls
Tasks:
- Add or modify endpoints:
  - POST /applications/:id/publications/:pubId/verify
  - POST /applications/:id/evaluate
  - POST /applications/:id/reviewer-comments
  - GET /applications/:id/reviewer-report
- Enforce role-based access in route handlers and response DTO filtering:
  - Applicant: no reviewer-only scoring/report fields
  - Reviewer roles: full report visibility
- Update Firestore security rules to match role boundaries.

Validate:
- Integration checks for visibility and authorization.
- Negative tests proving applicant cannot fetch reviewer-only data.

Output:
- Endpoint contract summary and role matrix.

### Phase 4: Applicant UX Changes
Tasks:
- Add subsection-level uploads in teaching/professional development/scholarship/service sections.
- Ensure baseline UI labels/status start as Deficient where required.
- Add pre-submit review page/step with full application packet preview.
- Ensure applicant UI does not display detailed AI scoring/report during review lifecycle.

Validate:
- Build frontend.
- Manual flow validation notes (create/edit/review/submit).

Output:
- Applicant flow screenshots or step walkthrough notes.

### Phase 5: Reviewer UX Changes
Tasks:
- Add reviewer report panel with criterion-level breakdown and rationale.
- Add publication verification badges/flags and filters.
- Add criterion-linked reviewer comment/annotation inputs.
- Add structured AI reviewer prompt helpers aligned with rubric criteria.

Validate:
- Build frontend.
- Reviewer role flow verification notes.

Output:
- Reviewer workflow summary and component list.

### Phase 6: Final Hardening
Tasks:
- End-to-end consistency pass.
- Ensure all defaults/visibility constraints are enforced both API-side and UI-side.
- Add concise docs/comments for non-obvious logic.

Validate:
- Run final build/typecheck/tests.

Output:
- Final implementation summary
- File-by-file change list
- Test results
- Known limitations/TODOs (for real external indexing credentials)

## Non-Functional Constraints
- Keep architecture and style consistent with existing code.
- Do not perform unrelated refactors.
- Keep changes migration-safe for existing Firestore docs.
- Add robust error handling and audit logging around verification/scoring.

## Critical Acceptance Gates
- Required section baselines are Deficient by default.
- Publication verification is automated and reviewer-visible.
- Evidence-to-criterion mapping is stored and explorable.
- Applicant preview exists before final submission.
- Applicant cannot retrieve reviewer-only detailed scoring by any API path.
- Reviewer roles can access full application + AI report + criterion comments.

---

Begin with Phase 1 immediately. Do not skip validations between phases.
