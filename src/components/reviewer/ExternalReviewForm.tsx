import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getApplication } from '../../services/applications'
import { createExternalReview, saveExternalReview, getExternalReviews } from '../../services/reviews'
import type { Application, ExternalReview, ExternalRecommendation } from '../../types'

const SECTIONS = [
  { key: 'academicStanding' as const, label: "Applicant's Overall Academic Standing" },
  { key: 'researchProductivity' as const, label: "Applicant's Research Productivity and Quality" },
  { key: 'visibilityContribution' as const, label: "Applicant's Visibility and Contribution to the Academic Fraternity" },
]

export default function ExternalReviewForm() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [review, setReview] = useState<ExternalReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id || !user || !profile) return
    Promise.all([getApplication(id), getExternalReviews(id)]).then(
      async ([application, reviews]) => {
        setApp(application)
        const myReview = reviews.find((r) => r.reviewerUid === user.uid)
        if (myReview) {
          setReview(myReview)
        } else if (application) {
          const newReview = await createExternalReview(id, user.uid, profile.displayName)
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
      await saveExternalReview(review)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const updateReview = (field: keyof ExternalReview, value: unknown) => {
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

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/external-review')} className="btn-ghost btn-sm mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Applicant info */}
      <div className="card p-5 mb-6">
        <h1 className="text-lg font-bold text-text mb-1">External Evaluation: {app.applicantName}</h1>
        <p className="text-sm text-text-secondary">
          {app.promotionType === 'associate_professor' ? 'Associate Professor' : 'Full Professor'}{' '}
          · {app.personalInfo.department}
        </p>
        {app.documents.updatedCV && (
          <a
            href={app.documents.updatedCV.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary btn-sm mt-3 inline-flex"
          >
            View Updated CV
          </a>
        )}
      </div>

      {/* Evaluation sections */}
      <div className="space-y-4 mb-6">
        {SECTIONS.map((section) => (
          <div key={section.key} className="card p-4">
            <label className="block text-sm font-medium text-text mb-2">{section.label}</label>
            <textarea
              value={review[section.key]}
              onChange={(e) => updateReview(section.key, e.target.value)}
              placeholder={`Provide evaluation (max 200 words)...`}
              rows={4}
              maxLength={1500}
            />
            <p className="text-xs text-text-dim mt-1">
              {review[section.key].split(/\s+/).filter(Boolean).length}/200 words
            </p>
          </div>
        ))}
      </div>

      {/* Overall recommendation */}
      <div className="card p-4 mb-6">
        <label className="block text-sm font-medium text-text mb-3">Overall Evaluation</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { value: 'recommended' as ExternalRecommendation, label: 'Recommended', color: 'border-success bg-success-light text-success' },
            { value: 'not_recommended' as ExternalRecommendation, label: 'Not Recommended', color: 'border-danger bg-danger-light text-danger' },
          ].map((rec) => (
            <button
              key={rec.value}
              type="button"
              onClick={() => updateReview('overallEvaluation', rec.value)}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${
                review.overallEvaluation === rec.value
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
          {saved ? 'Saved!' : 'Save Evaluation'}
        </button>
      </div>
    </div>
  )
}
