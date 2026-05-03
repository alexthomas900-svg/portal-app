import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Bot, MessageSquarePlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getApplication, getReviewerReport, runEvaluation, getReviewerComments, addReviewerComment } from '../../services/applications'
import { getMyInternalReview, createInternalReview, saveInternalReview } from '../../services/reviews'
import {
  formatApplicationTypeLabel,
  formatPromotionLabel,
  type Application,
  type InternalReview,
  type ReviewRecommendation,
  type EvaluationReport,
  type ReviewerComment,
} from '../../types'

const CRITERION_PROMPT_HELPERS: Record<string, string[]> = {
  personalInfoComments: ['Verify completeness of personal information.'],
  qualificationsComments: ['Confirm HEC attestation status.', 'Verify PhD credentials are documented.'],
  experienceComments: ['Assess years and quality of relevant experience.', 'Verify post-PhD teaching experience.'],
  publicationsComments: [
    'Comment on Bloom/Fink alignment evidence quality.',
    'Note any unverified or flagged journals.',
    'Assess if publication count meets promotion criteria.',
  ],
  teachingComments: [
    'Assess whether assessments demonstrate higher-order cognition.',
    'Comment on SLO alignment with Bloom and Fink taxonomies.',
    'Identify missing evidence for rubric criteria.',
    'Evaluate multi-source evaluation completeness (Chair, Dean, Students).',
  ],
  effortsComments: [
    'Verify training certificates and CPD hours.',
    'Assess reflective practice artifacts.',
    'Identify gaps between narrative claims and uploaded evidence.',
  ],
  scholarshipComments: [
    'Comment on verified publication count and quality.',
    'Assess conference participation evidence.',
    'Evaluate grant and editorial work.',
  ],
  servicesComments: [
    'Assess committee appointment evidence.',
    'Evaluate breadth of institutional contributions.',
    'Identify missing service evidence.',
  ],
  researchComments: [
    'Assess originality and clarity of the research statement.',
    'Evaluate alignment with institutional research priorities.',
  ],
}

const PROMOTION_COMMENT_SECTIONS = [
  { key: 'qualificationsComments', label: 'Qualifications' },
  { key: 'experienceComments', label: 'Experience' },
  { key: 'publicationsComments', label: 'Publications' },
  { key: 'teachingComments', label: 'Teaching Effectiveness' },
  { key: 'effortsComments', label: 'Efforts to Improve' },
  { key: 'scholarshipComments', label: 'Scholarship' },
  { key: 'servicesComments', label: 'Services' },
  { key: 'researchComments', label: 'Research Statement' },
] as const

const NON_PROMOTION_COMMENT_SECTIONS = [
  { key: 'personalInfoComments', label: 'Personal Information' },
  { key: 'qualificationsComments', label: 'Qualifications' },
  { key: 'experienceComments', label: 'Experience' },
  { key: 'teachingComments', label: 'Teaching Effectiveness' },
  { key: 'effortsComments', label: 'Efforts to Improve' },
  { key: 'scholarshipComments', label: 'Scholarship' },
  { key: 'servicesComments', label: 'Services' },
] as const

const RECOMMENDATIONS: { value: ReviewRecommendation; label: string; color: string }[] = [
  { value: 'strongly_recommended', label: 'Strongly Recommended', color: 'border-success bg-success-light text-success' },
  { value: 'recommended', label: 'Recommended', color: 'border-primary bg-primary-50 text-primary' },
  { value: 'conditionally_recommended', label: 'Conditionally Recommended', color: 'border-warning bg-warning-light text-warning' },
  { value: 'not_recommended', label: 'Not Recommended', color: 'border-danger bg-danger-light text-danger' },
]

export default function ReviewForm() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [review, setReview] = useState<InternalReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [report, setReport] = useState<EvaluationReport | null>(null)
  const [reportExpanded, setReportExpanded] = useState(false)
  const [runningEval, setRunningEval] = useState(false)
  const [comments, setComments] = useState<ReviewerComment[]>([])
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [savingComment, setSavingComment] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !user) return
    Promise.all([
      getApplication(id),
      getMyInternalReview(id, user.uid),
      getReviewerReport(id).catch(() => null),
      getReviewerComments(id).catch(() => []),
    ]).then(async ([application, existingReview, evalReport, criterionComments]) => {
      setApp(application)
      setReport(evalReport)
      setComments(criterionComments)
      if (existingReview) {
        setReview(existingReview)
      } else if (application && profile) {
        const newReview = await createInternalReview(id, user.uid, profile.displayName)
        setReview(newReview)
      }
      setLoading(false)
    })
  }, [id, user, profile])

  const handleSave = async () => {
    if (!review) return
    setSaving(true)
    try {
      await saveInternalReview(review)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleRunEvaluation = async () => {
    if (!id) return
    setRunningEval(true)
    try {
      const newReport = await runEvaluation(id)
      setReport(newReport)
    } finally {
      setRunningEval(false)
    }
  }

  const handleAddComment = async (criterion: string) => {
    if (!id || !commentInputs[criterion]?.trim()) return
    setSavingComment(criterion)
    try {
      const newComment = await addReviewerComment(id, criterion, commentInputs[criterion]!.trim())
      setComments((prev) => [...prev, newComment])
      setCommentInputs((prev) => ({ ...prev, [criterion]: '' }))
    } finally {
      setSavingComment(null)
    }
  }

  const updateReview = (field: keyof InternalReview, value: unknown) => {
    if (!review) return
    setReview({ ...review, [field]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!app || !review) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-text">Application not found</h2>
      </div>
    )
  }

  const commentSections =
    app.applicationType === 'promotion' ? PROMOTION_COMMENT_SECTIONS : NON_PROMOTION_COMMENT_SECTIONS

  const flaggedPublications = app.publications.filter(
    (p) => p.verification?.status === 'unverified' || p.verification?.flagReason,
  )

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/review/applications')} className="btn-ghost btn-sm mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </button>

      {/* Applicant info */}
      <div className="card p-5 mb-6">
        <h1 className="text-lg font-bold text-text mb-1">Review: {app.applicantName}</h1>
        <p className="text-sm text-text-secondary">
          {app.applicationType === 'promotion'
            ? `${formatPromotionLabel(app.promotionType)} Promotion`
            : formatApplicationTypeLabel(app.applicationType)}{' '}
          · {app.personalInfo.department}
        </p>
      </div>

      {/* Publication verification flags */}
      {flaggedPublications.length > 0 && (
        <div className="card p-4 mb-6 border-danger bg-danger-light">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <h3 className="text-sm font-semibold text-danger">Flagged Publications</h3>
          </div>
          <ul className="space-y-1">
            {flaggedPublications.map((pub) => (
              <li key={pub.id} className="text-xs text-danger">
                <strong>{pub.journalName}</strong>: {pub.verification?.flagReason ?? 'Could not be verified against HEC/Scopus/WoS.'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Evaluation Report */}
      <div className="card mb-6">
        <button
          type="button"
          onClick={() => setReportExpanded((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-semibold text-text">AI Evaluation Report</span>
            {report && (
              <span className="text-xs text-text-secondary ml-1">
                Generated {new Date(report.generatedAt).toLocaleString()}
              </span>
            )}
          </div>
          {reportExpanded ? <ChevronUp className="w-4 h-4 text-text-dim" /> : <ChevronDown className="w-4 h-4 text-text-dim" />}
        </button>

        {reportExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            {!report ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary mb-3">No evaluation generated yet.</p>
                <button
                  type="button"
                  onClick={handleRunEvaluation}
                  disabled={runningEval}
                  className="btn-primary btn-sm"
                >
                  {runningEval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  Run AI Evaluation
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRunEvaluation}
                    disabled={runningEval}
                    className="btn-secondary btn-sm"
                  >
                    {runningEval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    Re-run
                  </button>
                </div>

                {/* Teaching */}
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Teaching Effectiveness</p>
                  <p className="text-xs text-text mb-2">{report.teaching.aiGeneratedFeedback}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries({
                      'Bloom Alignment': report.teaching.bloomAlignment,
                      'Fink Alignment': report.teaching.finkAlignment,
                      'Higher-Order Assessment': report.teaching.higherOrderAssessment,
                      'Cognitive Complexity': report.teaching.cognitiveComplexity,
                      'Multi-Source Inputs': report.teaching.multiSourceInputs,
                    }).map(([label, criterion]) => (
                      <div key={label} className="text-xs">
                        <span className="text-text-secondary">{label}: </span>
                        <span className={`font-medium ${criterion.score >= 70 ? 'text-success' : criterion.score >= 40 ? 'text-warning' : 'text-danger'}`}>
                          {criterion.score}/100
                        </span>
                        <p className="text-text-dim mt-0.5">{criterion.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Efforts */}
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Professional Development</p>
                  <p className="text-xs text-text mb-2">{report.efforts.aiGeneratedFeedback}</p>
                </div>

                {/* Scholarly */}
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Scholarly Activity</p>
                  <p className="text-xs text-text mb-2">{report.scholarly.aiGeneratedFeedback}</p>
                </div>

                {/* Service */}
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Service</p>
                  <p className="text-xs text-text mb-2">{report.service.aiGeneratedFeedback}</p>
                </div>

                {/* Publication flags */}
                {report.publicationFlags.length > 0 && (
                  <div className="border border-danger rounded-lg p-3 bg-danger-light">
                    <p className="text-xs font-semibold text-danger uppercase mb-2">Publication Flags</p>
                    <ul className="space-y-1">
                      {report.publicationFlags.map((flag, i) => (
                        <li key={i} className="text-xs text-danger">{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Section-wise comments with criterion-linked prompt helpers */}
      <div className="space-y-4 mb-6">
        {commentSections.map((section) => {
          const sectionComments = comments.filter((c) => c.criterion === section.key)
          const prompts = CRITERION_PROMPT_HELPERS[section.key] ?? []
          return (
            <div key={section.key} className="card p-4">
              <label className="block text-sm font-medium text-text mb-2">{section.label}</label>
              <textarea
                value={review[section.key] as string}
                onChange={(e) => updateReview(section.key, e.target.value)}
                placeholder={`Comments on ${section.label.toLowerCase()} (max 200 words)...`}
                rows={3}
                maxLength={1500}
              />
              <p className="text-xs text-text-dim mt-1">
                {(review[section.key] as string).split(/\s+/).filter(Boolean).length}/200 words
              </p>

              {/* Prompt helpers */}
              {prompts.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-text-secondary font-medium">Suggested prompts:</p>
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => updateReview(section.key, ((review[section.key] as string) + (review[section.key] ? ' ' : '') + prompt))}
                      className="block text-xs text-primary hover:underline text-left"
                    >
                      + {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Criterion-linked annotation comments */}
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <p className="text-xs text-text-secondary font-medium flex items-center gap-1">
                  <MessageSquarePlus className="w-3.5 h-3.5" /> Criterion Annotations
                </p>
                {sectionComments.map((c) => (
                  <div key={c.id} className="text-xs bg-surface-alt rounded p-2">
                    <span className="font-medium text-text">{c.authorName}</span>
                    <span className="text-text-dim ml-1">({c.authorRole})</span>
                    <span className="text-text-dim ml-1">·</span>
                    <span className="text-text ml-1">{c.comment}</span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInputs[section.key] ?? ''}
                    onChange={(e) => setCommentInputs((prev) => ({ ...prev, [section.key]: e.target.value }))}
                    placeholder="Add annotation..."
                    className="flex-1 text-xs"
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleAddComment(section.key) }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddComment(section.key)}
                    disabled={savingComment === section.key || !commentInputs[section.key]?.trim()}
                    className="btn-secondary btn-sm"
                  >
                    {savingComment === section.key ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overall comments */}
      <div className="card p-4 mb-6">
        <label className="block text-sm font-medium text-text mb-2">Overall Comments</label>
        <textarea
          value={review.overallComments}
          onChange={(e) => updateReview('overallComments', e.target.value)}
          placeholder="Overall evaluation comments..."
          rows={4}
        />
      </div>

      {/* Recommendation */}
      <div className="card p-4 mb-6">
        <label className="block text-sm font-medium text-text mb-3">Recommendation</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {RECOMMENDATIONS.map((rec) => (
            <button
              key={rec.value}
              type="button"
              onClick={() => updateReview('recommendation', rec.value)}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${
                review.recommendation === rec.value
                  ? rec.color
                  : 'border-border text-text-secondary hover:border-primary-light'
              }`}
            >
              {rec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : 'Save Review'}
        </button>
      </div>
    </div>
  )
}
