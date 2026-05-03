# Sonnet Compact Prompt (Token-Optimized)

Implement the following in this repo with concrete code edits (not recommendations). Keep existing architecture/style, avoid unrelated refactors, and keep TypeScript compile-safe.

Project:
- Frontend: React + TypeScript (Vite)
- Backend: Node + TypeScript in backend/src
- Firebase Auth + Firestore

Primary requirements:
1. Publication verification
- Auto-verify journals against HEC/Scopus/WoS (provider adapters; stubs allowed if no credentials).
- Do not trust applicant declaration alone.
- Persist per-source verification metadata: source, matched, confidence, checkedAt, referenceUrl, notes.
- Persist overall status: verified | unverified | unknown.
- Trigger on publication create/update and allow manual re-check.
- Flag suspicious/unrecognized journals for reviewers.

2. Evidence-based section scoring with Deficient baseline
- Default baseline must be Deficient for:
  - Teaching Effectiveness
  - Efforts to Improve (Professional Development)
  - Scholarly Activity
  - Service
- Upgrade only when rubric evidence thresholds are met.

3. Teaching evaluation rubric
- Add subsection-level evidence uploads in teaching steps.
- Score and store criterion-level rationale/evidence for:
  - Bloom alignment
  - Fink alignment
  - Assessment suitability for higher-order thinking
  - Cognitive complexity evidence
  - Multi-source inputs (chair, dean, student eval scores)

4. Professional development rubric
- Criteria-based evaluation from evidence (training/certification/workshops/reflective artifacts), not narrative-only.
- Section-local uploads required.

5. Scholarly + service rubric
- Evidence-based scoring from verified publications, conferences, committee/service, institutional contributions.
- Store criterion-to-evidence mapping.

6. Workflow + transparency
- Applicant can review full application before final submit.
- Applicant must not see detailed AI/reviewer scoring during review.
- Reviewer roles (Chair/Dean/designated evaluators) can view full application, AI reports, flags, and criterion-linked comments.
- Add structured reviewer prompt helpers aligned to rubric criteria.

Backend work:
- Add publication verification service (adapter pattern).
- Add rubric scoring service (teaching, professional development, scholarly/service).
- Add/extend endpoints:
  - POST /applications/:id/publications/:pubId/verify
  - POST /applications/:id/evaluate
  - POST /applications/:id/reviewer-comments
  - GET /applications/:id/reviewer-report
- Enforce role checks and response filtering so applicants cannot retrieve reviewer-only fields by API.

Frontend work:
- Add subsection uploads in faculty steps.
- Add applicant Review Before Submit flow.
- Add reviewer report UI with criterion breakdown, publication flags, and criterion-linked comments.

Files to prioritize:
- src/types.ts
- src/lib/api.ts
- src/services/applications.ts
- src/services/reviews.ts
- src/components/faculty/ApplicationForm.tsx
- src/components/faculty/steps/TeachingEffectiveness.tsx
- src/components/faculty/steps/EffortsToImprove.tsx
- src/components/faculty/steps/Scholarship.tsx
- src/components/faculty/steps/Services.tsx
- src/components/shared/FileUpload.tsx
- src/components/reviewer/ReviewForm.tsx
- src/components/reviewer/ExternalReviewForm.tsx
- src/components/reviewer/InternalDashboard.tsx
- src/components/reviewer/ExternalDashboard.tsx
- src/components/admin/AdminDashboard.tsx
- backend/src/routes/applications.ts
- backend/src/routes/reviews.ts
- backend/src/middleware/auth.ts
- backend/src/firebase-admin.ts
- firestore.rules

Security and rules:
- Update Firestore rules to enforce role separation.
- Applicant cannot read reviewer-only report/scoring fields.
- Reviewer roles can read full evaluation artifacts.
- Log verification/scoring actor and timestamp.

Testing:
- Add/extend unit tests for verification/scoring logic.
- Add integration tests for role-based visibility.
- Run build/typecheck/tests; fix introduced errors.

Return format:
1) Summary
2) File-by-file changes
3) Security guarantees
4) Test/build results
5) Known limitations/TODOs (including real API credentials)
