import { FileText, CheckCircle2, AlertCircle, Award, BookOpen, Users, Briefcase } from 'lucide-react'
import type { Application } from '../../types'
import { formatPromotionLabel, formatApplicationTypeLabel, TEACHING_SCORES, EFFORTS_SCORES, SCHOLARSHIP_SCORES, SERVICES_SCORES } from '../../types'
import StatusBadge from '../shared/StatusBadge'

interface Props {
  application: Application
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-text">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-sm text-text font-medium">{String(value)}</p>
    </div>
  )
}

function RatingBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    exceeds: 'bg-success-light text-success border-success',
    meets: 'bg-primary-50 text-primary border-primary',
    minimal: 'bg-warning-light text-warning border-warning',
    deficient: 'bg-danger-light text-danger border-danger',
  }
  const labels: Record<string, string> = {
    exceeds: 'Exceeds Expectations',
    meets: 'Meets Expectations',
    minimal: 'Minimally Acceptable',
    deficient: 'Deficient',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${colors[rating] ?? ''}`}>
      {labels[rating] ?? rating}
    </span>
  )
}

export default function ApplicationReview({ application }: Props) {
  const teachingScore = TEACHING_SCORES[application.teachingEffectiveness.overallRating]
  const effortsScore = EFFORTS_SCORES[application.effortsToImprove.overallRating]
  const scholarshipScore = SCHOLARSHIP_SCORES[application.scholarship.overallRating]
  const servicesScore = SERVICES_SCORES[application.services.overallRating]
  const totalScore = teachingScore + effortsScore + scholarshipScore + servicesScore

  const allVerified = application.publications.every(
    (p) => p.verification?.status === 'verified' || !p.verification,
  )
  const flaggedPublications = application.publications.filter(
    (p) => p.verification?.status === 'unverified' || p.verification?.flagReason,
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text mb-1">Review Your Application</h2>
        <p className="text-sm text-text-secondary">
          Review all sections carefully before final submission. Once submitted, you cannot edit your application.
        </p>
      </div>

      {/* Summary card */}
      <div className="card p-5 bg-surface-alt">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <StatusBadge status={application.status} />
          <span className="text-sm text-text-secondary">
            {application.applicationType === 'promotion'
              ? `${formatPromotionLabel(application.promotionType)} Promotion`
              : formatApplicationTypeLabel(application.applicationType)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{teachingScore}</p>
            <p className="text-xs text-text-secondary">Teaching (max 45)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{effortsScore}</p>
            <p className="text-xs text-text-secondary">Efforts (max 10)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{scholarshipScore}</p>
            <p className="text-xs text-text-secondary">Scholarship (max 25)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{servicesScore}</p>
            <p className="text-xs text-text-secondary">Services (max 20)</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border text-center">
          <p className="text-sm text-text-secondary">Preliminary Self-Assessment Total</p>
          <p className="text-2xl font-bold text-text">{totalScore} / 100</p>
          <p className="text-xs text-text-dim mt-1">
            Note: Detailed AI scoring is generated for reviewers only and is not shown here.
          </p>
        </div>
      </div>

      {/* Personal Info */}
      <SectionCard title="Personal Information" icon={Users}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full Name" value={application.personalInfo.fullName} />
          <Field label="Email" value={application.personalInfo.email} />
          <Field label="Department" value={application.personalInfo.department} />
          <Field label="Current Designation" value={application.personalInfo.currentDesignation} />
          <Field label="Date of Joining" value={application.personalInfo.dateOfJoining} />
        </div>
      </SectionCard>

      {/* Qualifications */}
      <SectionCard title="Qualifications" icon={Award}>
        {application.qualifications.length === 0 ? (
          <p className="text-sm text-text-dim">No qualifications added.</p>
        ) : (
          <div className="space-y-2">
            {application.qualifications.map((q) => (
              <div key={q.id} className="text-sm text-text">
                <span className="font-medium">{q.degree}</span> in {q.field} — {q.institution}, {q.country} ({q.year})
                {q.hec_attested && <span className="ml-2 text-xs text-success font-medium">HEC Attested</span>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Publications */}
      {application.applicationType === 'promotion' && (
        <SectionCard title="Publications" icon={BookOpen}>
          {application.publications.length === 0 ? (
            <p className="text-sm text-text-dim">No publications added.</p>
          ) : (
            <div className="space-y-3">
              {flaggedPublications.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded bg-danger-light border border-red-200 text-sm text-danger">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{flaggedPublications.length} publication(s) could not be verified. Reviewers will be alerted.</span>
                </div>
              )}
              {allVerified && application.publications.length > 0 && (
                <div className="flex items-center gap-2 p-2 rounded bg-success-light border border-green-200 text-sm text-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All publications have passed initial verification checks.</span>
                </div>
              )}
              {application.publications.map((pub) => (
                <div key={pub.id} className="border border-border rounded p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-text">{pub.articleTitle}</p>
                    {pub.verification && (
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded border font-medium ${
                        pub.verification.status === 'verified'
                          ? 'bg-success-light text-success border-success'
                          : pub.verification.status === 'unverified'
                            ? 'bg-danger-light text-danger border-danger'
                            : 'bg-surface-alt text-text-secondary border-border'
                      }`}>
                        {pub.verification.status}
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary mt-0.5">{pub.journalName} · {pub.year} · {pub.indexing}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Teaching */}
      <SectionCard title="Teaching Effectiveness" icon={FileText}>
        <div className="flex items-center gap-2 mb-2">
          <RatingBadge rating={application.teachingEffectiveness.overallRating} />
          <span className="text-sm text-text-secondary">{teachingScore} / 45 marks</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bloom's Taxonomy Alignment" value={application.teachingEffectiveness.bloomAlignment} />
          <Field label="Fink's Taxonomy Alignment" value={application.teachingEffectiveness.finkAlignment} />
          <Field label="Higher-Order Thinking" value={application.teachingEffectiveness.higherOrderThinking} />
        </div>
        <div className="flex gap-4 text-sm text-text-secondary mt-2">
          <span>Chair: {application.teachingEffectiveness.chairRating}/5</span>
          <span>Dean: {application.teachingEffectiveness.deanRating}/5</span>
          <span>Students: {application.teachingEffectiveness.studentRating}/5</span>
        </div>
        {(application.teachingEffectiveness.syllabi?.length || application.teachingEffectiveness.sloDocuments?.length || application.teachingEffectiveness.assessmentSamples?.length || application.teachingEffectiveness.studentFeedbackDocs?.length) ? (
          <p className="text-xs text-success mt-1">
            ✓ Evidence documents uploaded ({[
              application.teachingEffectiveness.syllabi?.length && `${application.teachingEffectiveness.syllabi.length} syllabi`,
              application.teachingEffectiveness.sloDocuments?.length && `${application.teachingEffectiveness.sloDocuments.length} SLO docs`,
              application.teachingEffectiveness.assessmentSamples?.length && `${application.teachingEffectiveness.assessmentSamples.length} assessments`,
              application.teachingEffectiveness.studentFeedbackDocs?.length && `${application.teachingEffectiveness.studentFeedbackDocs.length} feedback docs`,
            ].filter(Boolean).join(', ')})
          </p>
        ) : (
          <p className="text-xs text-warning mt-1">⚠ No evidence documents uploaded for teaching sections.</p>
        )}
      </SectionCard>

      {/* Efforts */}
      <SectionCard title="Efforts to Improve" icon={Briefcase}>
        <div className="flex items-center gap-2 mb-2">
          <RatingBadge rating={application.effortsToImprove.overallRating} />
          <span className="text-sm text-text-secondary">{effortsScore} / 10 marks</span>
        </div>
        <Field label="CPD Hours" value={application.effortsToImprove.cpdHours} />
        {(application.effortsToImprove.trainingCertificates?.length || application.effortsToImprove.workshopAttendance?.length || application.effortsToImprove.reflectiveEssays?.length) ? (
          <p className="text-xs text-success">✓ Evidence documents uploaded.</p>
        ) : (
          <p className="text-xs text-warning">⚠ No evidence documents uploaded for professional development.</p>
        )}
      </SectionCard>

      {/* Scholarship */}
      <SectionCard title="Scholarly Activity" icon={BookOpen}>
        <div className="flex items-center gap-2 mb-2">
          <RatingBadge rating={application.scholarship.overallRating} />
          <span className="text-sm text-text-secondary">{scholarshipScore} / 25 marks</span>
        </div>
        {(application.scholarship.publicationProofs?.length || application.scholarship.conferenceProofs?.length || application.scholarship.grantDocuments?.length) ? (
          <p className="text-xs text-success">✓ Scholarly evidence documents uploaded.</p>
        ) : (
          <p className="text-xs text-warning">⚠ No scholarly evidence documents uploaded.</p>
        )}
      </SectionCard>

      {/* Services */}
      <SectionCard title="Services" icon={Users}>
        <div className="flex items-center gap-2 mb-2">
          <RatingBadge rating={application.services.overallRating} />
          <span className="text-sm text-text-secondary">{servicesScore} / 20 marks</span>
        </div>
        {(application.services.committeeLetters?.length || application.services.serviceProofs?.length) ? (
          <p className="text-xs text-success">✓ Service evidence documents uploaded.</p>
        ) : (
          <p className="text-xs text-warning">⚠ No service evidence documents uploaded.</p>
        )}
      </SectionCard>

      <div className="card p-4 border-warning bg-warning-light">
        <p className="text-sm text-warning font-medium">
          By proceeding to Declaration and submitting, you confirm all information is accurate. Detailed AI-generated scoring and reviewer evaluations will not be visible to you during the review process.
        </p>
      </div>
    </div>
  )
}
