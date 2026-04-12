import type { Application, ApplicationDocuments } from '../../../types'
import FileUpload from '../../shared/FileUpload'

interface Props {
  data: ApplicationDocuments
  applicationId: string
  applicationType: Application['applicationType']
  promotionType: Application['promotionType']
  onChange: (data: ApplicationDocuments) => void
}

export default function DocumentUploadStep({
  data,
  applicationId,
  applicationType,
  promotionType,
  onChange,
}: Props) {
  const update = (field: keyof ApplicationDocuments, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const isPromotion = applicationType === 'promotion'
  const requiredAbstracts = promotionType === 'associate_professor' ? 10 : 15

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Document Upload</h3>
        <p className="text-sm text-text-secondary">
          Upload all required documents. All files must be PDF format (max 10MB each).
        </p>
      </div>

      <div className="space-y-5">
        {isPromotion && (
          <>
            {/* 1. Cover Letter */}
            <FileUpload
              applicationId={applicationId}
              category="cover-letter"
              label="1. Cover Letter"
              existingFiles={data.coverLetter ? [data.coverLetter] : []}
              onUpload={(files) => update('coverLetter', files[0] || undefined)}
              required
            />

            {/* 2. Research Statement */}
            <FileUpload
              applicationId={applicationId}
              category="research-statement"
              label="2. Research Statement"
              existingFiles={data.researchStatement ? [data.researchStatement] : []}
              onUpload={(files) => update('researchStatement', files[0] || undefined)}
              required
            />

            {/* 3. Qualifications */}
            <div className="card p-4 space-y-4">
              <h4 className="text-sm font-semibold text-text">3. Qualification Documents</h4>

              <FileUpload
                applicationId={applicationId}
                category="phd-degree"
                label="PhD Degree"
                existingFiles={data.phdDegree ? [data.phdDegree] : []}
                onUpload={(files) => update('phdDegree', files[0] || undefined)}
                required
              />

              <FileUpload
                applicationId={applicationId}
                category="phd-transcript"
                label="PhD Transcript"
                existingFiles={data.phdTranscript ? [data.phdTranscript] : []}
                onUpload={(files) => update('phdTranscript', files[0] || undefined)}
              />

              <FileUpload
                applicationId={applicationId}
                category="hec-attestation"
                label="HEC Attestation"
                existingFiles={data.hecAttestation ? [data.hecAttestation] : []}
                onUpload={(files) => update('hecAttestation', files[0] || undefined)}
                required
              />

              <FileUpload
                applicationId={applicationId}
                category="masters-degree"
                label="MPhil/MS Degree"
                existingFiles={data.mastersDegree ? [data.mastersDegree] : []}
                onUpload={(files) => update('mastersDegree', files[0] || undefined)}
              />

              <FileUpload
                applicationId={applicationId}
                category="masters-transcript"
                label="MPhil/MS Transcript"
                existingFiles={data.mastersTranscript ? [data.mastersTranscript] : []}
                onUpload={(files) => update('mastersTranscript', files[0] || undefined)}
              />
            </div>

            {/* 4. Experience Letters */}
            <FileUpload
              applicationId={applicationId}
              category="experience-letters"
              label="4. Experience Letters (max 6)"
              multiple
              existingFiles={data.experienceLetters}
              onUpload={(files) => update('experienceLetters', files.slice(0, 6))}
            />
          </>
        )}

        {/* 5. Faculty Self-Evaluation */}
        <div className="card p-4 space-y-4">
          <h4 className="text-sm font-semibold text-text">
            {isPromotion ? '5. Faculty Self-Evaluation' : '1. Evaluation Reports'}
          </h4>

          <FileUpload
            applicationId={applicationId}
            category="self-evaluation"
            label="Self-Evaluation Form"
            existingFiles={data.selfEvaluationForm ? [data.selfEvaluationForm] : []}
            onUpload={(files) => update('selfEvaluationForm', files[0] || undefined)}
            required
          />

          <FileUpload
            applicationId={applicationId}
            category="chair-evaluation"
            label="Chair's Evaluation"
            existingFiles={data.chairEvaluation ? [data.chairEvaluation] : []}
            onUpload={(files) => update('chairEvaluation', files[0] || undefined)}
            required
          />

          <FileUpload
            applicationId={applicationId}
            category="dean-evaluation"
            label="Dean's Evaluation"
            existingFiles={data.deanEvaluation ? [data.deanEvaluation] : []}
            onUpload={(files) => update('deanEvaluation', files[0] || undefined)}
            required
          />
        </div>

        {/* 6. Teaching Effectiveness */}
        <div className="card p-4 space-y-4">
          <h4 className="text-sm font-semibold text-text">
            {isPromotion ? '6. Teaching Effectiveness Documents' : '2. Teaching Documents'}
          </h4>

          <FileUpload
            applicationId={applicationId}
            category="course-outlines"
            label="Course Outlines (2 required)"
            multiple
            existingFiles={data.courseOutlines}
            onUpload={(files) => update('courseOutlines', files.slice(0, 2))}
            required
          />

          <FileUpload
            applicationId={applicationId}
            category="assignments"
            label="Assignments (2 required)"
            multiple
            existingFiles={data.assignments}
            onUpload={(files) => update('assignments', files.slice(0, 2))}
            required
          />

          <FileUpload
            applicationId={applicationId}
            category="teaching-support"
            label="Supporting Documents (2 required)"
            multiple
            existingFiles={data.teachingSupportDocs}
            onUpload={(files) => update('teachingSupportDocs', files.slice(0, 2))}
            required
          />
        </div>

        {/* 7. Efforts to Improve */}
        <FileUpload
          applicationId={applicationId}
          category="efforts-to-improve"
          label={`${isPromotion ? '7' : '3'}. Efforts to Improve as a Teacher (CPDs & Reflections)`}
          existingFiles={data.effortsToImprovePdf ? [data.effortsToImprovePdf] : []}
          onUpload={(files) => update('effortsToImprovePdf', files[0] || undefined)}
          required
        />

        {isPromotion && (
          <FileUpload
            applicationId={applicationId}
            category="abstracts"
            label={`8. Scholarship — Paper Abstracts (${requiredAbstracts} required for ${promotionType === 'associate_professor' ? 'Associate' : 'Full'} Professor)`}
            existingFiles={data.abstractsPdf ? [data.abstractsPdf] : []}
            onUpload={(files) => update('abstractsPdf', files[0] || undefined)}
            required
          />
        )}

        {/* Updated CV */}
        <FileUpload
          applicationId={applicationId}
          category="updated-cv"
          label={`${isPromotion ? '9' : '4'}. Updated CV`}
          existingFiles={data.updatedCV ? [data.updatedCV] : []}
          onUpload={(files) => update('updatedCV', files[0] || undefined)}
          required
        />
      </div>
    </div>
  )
}
