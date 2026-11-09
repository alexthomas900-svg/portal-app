import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Download, Save, Send, Loader2 } from 'lucide-react'
import { getApplication, saveApplication, submitApplication } from '../../services/applications'
import type { Application } from '../../types'
import { formatApplicationTypeLabel, formatPromotionLabel } from '../../types'
import ProgressBar from '../shared/ProgressBar'
import PersonalInfoStep from './steps/PersonalInfo'
import QualificationsStep from './steps/Qualifications'
import ExperienceStep from './steps/Experience'
import PublicationsStep from './steps/Publications'
import TeachingStep from './steps/TeachingEffectiveness'
import EffortsToImproveStep from './steps/EffortsToImprove'
import ScholarshipStep from './steps/Scholarship'
import ResearchStatementStep from './steps/ResearchStatement'
import ServicesStep from './steps/Services'
import DocumentUploadStep from './steps/DocumentUpload'
import DeclarationStep from './steps/Declaration'
import AnnualEvaluationStep from './AnnualEvaluationStep'
import { emptyAnnualEvaluation } from '../../types'
import { printPdfReport } from '../../utils/reports'
import { buildApplicationPdfRows } from '../../utils/applicationPdf'

const PROMOTION_STEP_LABELS = [
  'Personal Info',
  'Qualifications',
  'Experience',
  'Publications',
  'Teaching',
  'Improvement',
  'Scholarship',
  'Research',
  'Services',
  'Documents',
  'Declaration',
]

const NON_PROMOTION_STEP_LABELS = [
  'Personal Info',
  'Qualifications',
  'Experience',
  'Teaching',
  'Improvement',
  'Scholarship',
  'Services',
  'Documents',
  'Declaration',
]

const ANNUAL_EVALUATION_STEP_LABELS = [
  'Personal Info',
  'Annual Evaluation',
  'Declaration',
]

export default function ApplicationForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = useState<Application | null>(null)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      getApplication(id).then((app) => {
        if (app && app.status !== 'draft') {
          navigate(`/applications/${app.id}`, { replace: true })
          return
        }
        setApplication(app?.applicationType === 'self_evaluation' && !app.annualEvaluation
          ? { ...app, annualEvaluation: emptyAnnualEvaluation() }
          : app)
        setLoading(false)
      })
    }
  }, [id, navigate])

  const handleSave = useCallback(async () => {
    if (!application) return
    setSaving(true)
    try {
      await saveApplication(application)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [application])

  const handleSubmit = async () => {
    if (!application || !application.declaration) return
    setSubmitting(true)
    setFormError('')
    try {
      await saveApplication(application)
      await submitApplication(application.id)
      navigate('/applications')
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Failed to submit application.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateApp = (partial: Partial<Application>) => {
    if (!application) return
    setApplication({ ...application, ...partial })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-text">Application not found</h2>
        <button onClick={() => navigate('/applications')} className="btn-primary mt-4">
          Back to Applications
        </button>
      </div>
    )
  }

  const isPromotion = application.applicationType === 'promotion'
  const isAnnualEvaluation = application.applicationType === 'self_evaluation'
  const stepLabels = isAnnualEvaluation
    ? ANNUAL_EVALUATION_STEP_LABELS
    : isPromotion ? PROMOTION_STEP_LABELS : NON_PROMOTION_STEP_LABELS

  const renderStep = () => {
    if (step === 0) {
      return (
        <PersonalInfoStep
          data={application.personalInfo}
          onChange={(personalInfo) =>
            updateApp({
              personalInfo,
              applicationType: personalInfo.applicationType,
              promotionType: personalInfo.promotionType,
            })
          }
        />
      )
    }

    if (isAnnualEvaluation) {
      if (step === 1) {
        return (
          <AnnualEvaluationStep
            applicationId={application.id}
            data={application.annualEvaluation ?? emptyAnnualEvaluation()}
            onChange={(annualEvaluation) => updateApp({ annualEvaluation })}
          />
        )
      }
      if (step === 2) {
        return (
          <DeclarationStep
            application={application}
            onAccept={(declaration) => updateApp({ declaration })}
          />
        )
      }
      return null
    }

    if (step === 1) {
      return (
        <QualificationsStep
          data={application.qualifications}
          onChange={(qualifications) => updateApp({ qualifications })}
        />
      )
    }

    if (step === 2) {
      return (
        <ExperienceStep
          data={application.experience}
          onChange={(experience) => updateApp({ experience })}
        />
      )
    }

    if (isPromotion && step === 3) {
      return (
        <PublicationsStep
          data={application.publications}
          onChange={(publications) => updateApp({ publications })}
        />
      )
    }

    const teachingIndex = isPromotion ? 4 : 3
    const effortsIndex = isPromotion ? 5 : 4
    const scholarshipIndex = isPromotion ? 6 : 5
    const researchIndex = 7
    const servicesIndex = isPromotion ? 8 : 6
    const documentsIndex = isPromotion ? 9 : 7
    const declarationIndex = isPromotion ? 10 : 8

    if (step === teachingIndex) {
      return (
        <TeachingStep
          data={application.teachingEffectiveness}
          applicationId={application.id}
          onChange={(teachingEffectiveness) => updateApp({ teachingEffectiveness })}
          courseOutlines={application.documents.courseOutlines}
          onCourseOutlinesChange={(courseOutlines) =>
            updateApp({ documents: { ...application.documents, courseOutlines } })
          }
        />
      )
    }

    if (step === effortsIndex) {
      return (
        <EffortsToImproveStep
          data={application.effortsToImprove}
          onChange={(effortsToImprove) => updateApp({ effortsToImprove })}
        />
      )
    }

    if (step === scholarshipIndex) {
      return (
        <ScholarshipStep
          data={application.scholarship}
          onChange={(scholarship) => updateApp({ scholarship })}
        />
      )
    }

    if (isPromotion && step === researchIndex) {
      return (
        <ResearchStatementStep
          data={application.researchStatement}
          onChange={(researchStatement) => updateApp({ researchStatement })}
        />
      )
    }

    if (step === servicesIndex) {
      return (
        <ServicesStep
          data={application.services}
          onChange={(services) => updateApp({ services })}
        />
      )
    }

    if (step === documentsIndex) {
      return (
        <DocumentUploadStep
          data={application.documents}
          applicationId={application.id}
          applicationType={application.applicationType}
          promotionType={application.promotionType}
          onChange={(documents) => updateApp({ documents })}
          teaching={application.teachingEffectiveness}
          efforts={application.effortsToImprove}
          scholarship={application.scholarship}
          services={application.services}
          onTeachingChange={(teachingEffectiveness) => updateApp({ teachingEffectiveness })}
          onEffortsChange={(effortsToImprove) => updateApp({ effortsToImprove })}
          onScholarshipChange={(scholarship) => updateApp({ scholarship })}
          onServicesChange={(services) => updateApp({ services })}
        />
      )
    }

    if (step === declarationIndex) {
      return (
        <DeclarationStep
          application={application}
          onAccept={(declaration) => updateApp({ declaration })}
        />
      )
    }

    return null
  }

  const isLastStep = step === stepLabels.length - 1
  const applicationTitle = isPromotion
    ? `${formatPromotionLabel(application.promotionType)} Promotion Application`
    : formatApplicationTypeLabel(application.applicationType)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/applications')}
          className="btn-ghost btn-sm mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-text">{applicationTitle}</h1>
          <button
            type="button"
            onClick={() => printPdfReport(applicationTitle, buildApplicationPdfRows(application))}
            className="btn-secondary btn-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <ProgressBar currentStep={step} totalSteps={stepLabels.length} labels={stepLabels} />
      </div>

      {/* VET Toggle */}
      {step === 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="vet"
              checked={application.vetPassed}
              onChange={(e) => updateApp({ vetPassed: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="vet" className="text-sm font-medium text-text">
              I have passed the Versant English Test (VET)
              <span className="text-danger ml-1">*</span>
            </label>
          </div>
        </div>
      )}

      {/* Step content */}
      {formError && <p role="alert" className="mb-4 p-3 rounded bg-danger-light text-danger text-sm">{formError}</p>}
      <div className="card p-5 sm:p-6 mb-6">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-secondary">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : 'Save Draft'}
          </button>

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !application.declaration}
              className="btn-primary"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Application
            </button>
          ) : (
            <button
              onClick={() => setStep(Math.min(stepLabels.length - 1, step + 1))}
              className="btn-primary"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
