import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getApplication } from '../../services/applications'
import { getMyInternalReview, createInternalReview, saveInternalReview } from '../../services/reviews'
import {
  formatApplicationTypeLabel,
  formatPromotionLabel,
  type Application,
  type InternalReview,
  type ReviewRecommendation,
} from '../../types'

const PROMOTION_COMMENT_SECTIONS = [
  { key: 'personalInfoComments', label: 'Personal Information' },
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

  useEffect(() => {
    if (!id || !user) return
    Promise.all([getApplication(id), getMyInternalReview(id, user.uid)]).then(
      async ([application, existingReview]) => {
        setApp(application)
        if (existingReview) {
          setReview(existingReview)
        } else if (application && profile) {
          const newReview = await createInternalReview(id, user.uid, profile.displayName)
          setReview(newReview)
        }
        setLoading(false)
      },
    )
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

      {/* Section-wise comments */}
      <div className="space-y-4 mb-6">
        {commentSections.map((section) => (
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
          </div>
        ))}
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
