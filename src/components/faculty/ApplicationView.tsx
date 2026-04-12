import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { getApplication } from '../../services/applications'
import { checkEligibility } from '../../utils/eligibility'
import StatusBadge from '../shared/StatusBadge'
import type { Application } from '../../types'
import {
  EFFORTS_SCORES,
  SCHOLARSHIP_SCORES,
  SERVICES_SCORES,
  TEACHING_SCORES,
  formatApplicationTypeLabel,
  formatPromotionLabel,
} from '../../types'

export default function ApplicationView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      getApplication(id).then((data) => {
        setApp(data)
        setLoading(false)
      })
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-text">Application not found</h2>
      </div>
    )
  }

  const eligibility = checkEligibility(app)
  const isPromotion = app.applicationType === 'promotion'
  const totalScore =
    TEACHING_SCORES[app.teachingEffectiveness.overallRating] +
    EFFORTS_SCORES[app.effortsToImprove.overallRating] +
    SCHOLARSHIP_SCORES[app.scholarship.overallRating] +
    SERVICES_SCORES[app.services.overallRating]

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/applications')} className="btn-ghost btn-sm mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="card p-5 sm:p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-text">
                {isPromotion
                  ? `${formatPromotionLabel(app.promotionType)} Promotion Application`
                  : formatApplicationTypeLabel(app.applicationType)}
              </h1>
              <StatusBadge status={app.status} />
            </div>
            <p className="text-sm text-text-secondary">
              {app.personalInfo.fullName} · {app.personalInfo.department}
            </p>
            <p className="text-xs text-text-dim mt-1">
              Submitted: {app.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
            </p>
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary btn-sm">
              <Download className="w-3.5 h-3.5" />
              Application PDF
            </button>
            <button className="btn-secondary btn-sm">
              <FileText className="w-3.5 h-3.5" />
              Self-Evaluation
            </button>
          </div>
        </div>
      </div>

      {/* Eligibility */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-text mb-3">Eligibility</h2>
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={eligibility.status} />
          <span className="text-sm text-text-secondary">
            Score: <strong className="text-primary">{totalScore}/100</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-text-dim">VET</p>
            <p className={eligibility.vetPassed ? 'text-success font-medium' : 'text-danger font-medium'}>
              {eligibility.vetPassed ? 'Passed' : 'Not Passed'}
            </p>
          </div>
          <div>
            <p className="text-text-dim">PhD</p>
            <p className={eligibility.phdCompleted ? 'text-success font-medium' : 'text-danger font-medium'}>
              {eligibility.phdCompleted ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <p className="text-text-dim">Experience</p>
            <p className="text-text font-medium">{eligibility.totalExperienceYears} yrs</p>
          </div>
          <div>
            <p className="text-text-dim">Publications</p>
            <p className="text-text font-medium">
              {eligibility.recognizedPublications}/{eligibility.requiredPublications}
            </p>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-text mb-3">Scoring Breakdown</h2>
        <div className="space-y-3">
          {[
            { label: 'Teaching Effectiveness', score: TEACHING_SCORES[app.teachingEffectiveness.overallRating], max: 45 },
            { label: 'Efforts to Improve', score: EFFORTS_SCORES[app.effortsToImprove.overallRating], max: 10 },
            { label: 'Scholarship', score: SCHOLARSHIP_SCORES[app.scholarship.overallRating], max: 25 },
            { label: 'Services', score: SERVICES_SCORES[app.services.overallRating], max: 20 },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
                <span className="text-text font-medium w-14 text-right">
                  {item.score}/{item.max}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isPromotion && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-text mb-3">
            Publications ({app.publications.length})
          </h2>
          {app.publications.length === 0 ? (
            <p className="text-sm text-text-dim">No publications added.</p>
          ) : (
            <div className="space-y-2">
              {app.publications.map((pub, i) => (
                <div key={pub.id} className="text-sm p-3 bg-surface-alt rounded-lg">
                  <p className="font-medium text-text">
                    {i + 1}. {pub.articleTitle}
                  </p>
                  <p className="text-text-secondary text-xs mt-0.5">
                    {pub.journalName} · {pub.year} · {pub.indexing}
                    {pub.recognized && (
                      <span className="ml-2 text-success">✓ Recognized</span>
                    )}
                  </p>
                  {pub.apaReference && (
                    <p className="text-text-dim text-xs mt-1 italic">{pub.apaReference}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-text mb-3">Uploaded Documents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: 'Cover Letter', file: app.documents.coverLetter },
            { label: 'Research Statement', file: app.documents.researchStatement },
            { label: 'PhD Degree', file: app.documents.phdDegree },
            { label: 'HEC Attestation', file: app.documents.hecAttestation },
            { label: 'Self-Evaluation', file: app.documents.selfEvaluationForm },
            { label: 'Updated CV', file: app.documents.updatedCV },
            ...(isPromotion ? [{ label: 'Abstracts', file: app.documents.abstractsPdf }] : []),
          ].map((doc) => (
            <div key={doc.label} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-surface-alt">
              <FileText className={`w-4 h-4 shrink-0 ${doc.file ? 'text-success' : 'text-text-dim'}`} />
              <span className={doc.file ? 'text-text' : 'text-text-dim'}>{doc.label}</span>
              {doc.file ? (
                <a
                  href={doc.file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-primary text-xs hover:underline"
                >
                  View
                </a>
              ) : (
                <span className="ml-auto text-xs text-text-dim">Missing</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
