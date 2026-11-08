import type { TeachingEffectiveness, DocumentFile } from '../../../types'
import FileUpload from '../../shared/FileUpload'

interface Props {
  data: TeachingEffectiveness
  onChange: (data: TeachingEffectiveness) => void
  applicationId: string
  courseOutlines: DocumentFile[]
  onCourseOutlinesChange: (files: DocumentFile[]) => void
}

export default function TeachingStep({ data, onChange, applicationId, courseOutlines, onCourseOutlinesChange }: Props) {
  const update = (field: keyof TeachingEffectiveness, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Teaching Effectiveness</h3>
        <p className="text-sm text-text-secondary">Describe your teaching practices and provide the required supporting documents.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Fink's Taxonomy Alignment
          </label>
          <textarea
            value={data.finkAlignment}
            onChange={(e) => update('finkAlignment', e.target.value)}
            placeholder="Describe how your teaching aligns with Fink's Taxonomy of Significant Learning..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Bloom's Taxonomy — SLO Alignment
          </label>
          <textarea
            value={data.bloomAlignment}
            onChange={(e) => update('bloomAlignment', e.target.value)}
            placeholder="Describe how your Student Learning Outcomes align with Bloom's Taxonomy levels (Remember, Understand, Apply, Analyse, Evaluate, Create)..."
            rows={3}
          />
        </div>

        <FileUpload
          applicationId={applicationId}
          category="sloDocuments"
          label="Sample Student Learning Outcome Document (required)"
          existingFiles={data.sloDocuments ?? []}
          onUpload={(files: DocumentFile[]) => update('sloDocuments', files.slice(-1))}
          required
        />
        <FileUpload
          applicationId={applicationId}
          category="course-outlines"
          label="Course Outlines (2 required)"
          multiple
          existingFiles={courseOutlines}
          onUpload={(files: DocumentFile[]) => onCourseOutlinesChange(files.slice(-2))}
          required
        />

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Higher-Order Thinking Assessments
          </label>
          <textarea
            value={data.higherOrderThinking}
            onChange={(e) => update('higherOrderThinking', e.target.value)}
            placeholder="Describe your assessment strategies that promote higher-order thinking..."
            rows={3}
          />
        </div>

        <div className="mt-2">
          <FileUpload
            applicationId={applicationId}
            category="studentFeedbackDocs"
            label="Student Feedback / Evaluation Documents"
            multiple
            existingFiles={data.studentFeedbackDocs ?? []}
            onUpload={(files: DocumentFile[]) => update('studentFeedbackDocs', files)}
          />
        </div>

      </div>
    </div>
  )
}
