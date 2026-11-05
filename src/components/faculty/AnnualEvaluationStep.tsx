import FileUpload from '../shared/FileUpload'
import type { AnnualEvaluationData } from '../../types'

interface Props {
  applicationId: string
  data: AnnualEvaluationData
  onChange: (data: AnnualEvaluationData) => void
}

const sections: { title: string; fields: { key: keyof AnnualEvaluationData; label: string }[] }[] = [
  {
    title: 'Teaching and Learning',
    fields: [
      { key: 'coursesTaught', label: 'Courses taught during the evaluation period' },
      { key: 'teachingStrategies', label: 'Teaching strategies' },
      { key: 'assessmentMethods', label: 'Assessment methods' },
      { key: 'teachingInnovations', label: 'Teaching innovations' },
      { key: 'teachingAchievements', label: 'Teaching-related achievements' },
      { key: 'teachingReflection', label: 'Self-reflection on teaching effectiveness' },
    ],
  },
  {
    title: 'Research and Publications',
    fields: [
      { key: 'researchActivities', label: 'Research activities and publications' },
      { key: 'researchProjects', label: 'Research projects and grants' },
      { key: 'conferencePresentations', label: 'Conference presentations' },
      { key: 'researchCollaborations', label: 'Research collaborations and academic supervision' },
      { key: 'researchAchievements', label: 'Research achievements' },
    ],
  },
  {
    title: 'Professional Development and Scholarship',
    fields: [
      { key: 'professionalDevelopment', label: 'Workshops, seminars, training, certifications and professional learning' },
      { key: 'booksAndChapters', label: 'Books, book chapters and academic contributions' },
    ],
  },
  {
    title: 'University Service, Leadership and Engagement',
    fields: [
      { key: 'departmentalResponsibilities', label: 'Departmental responsibilities' },
      { key: 'universityCommittees', label: 'University committees' },
      { key: 'studentAdvisingAndActivities', label: 'Student advising, societies and activities' },
      { key: 'leadershipAndCommunityService', label: 'Leadership, community engagement and professional service' },
      { key: 'institutionalEngagement', label: 'Institutional initiatives, events, accreditation and quality assurance' },
    ],
  },
  {
    title: 'Self-Reflection and Future Goals',
    fields: [
      { key: 'majorAchievements', label: 'Major achievements' },
      { key: 'challenges', label: 'Challenges' },
      { key: 'areasForImprovement', label: 'Areas for improvement' },
      { key: 'futureGoals', label: 'Professional goals for the next academic year' },
      { key: 'supportRequired', label: 'Support required from the university' },
    ],
  },
]

export default function AnnualEvaluationStep({ applicationId, data, onChange }: Props) {
  const updateText = (key: keyof AnnualEvaluationData, value: string) => onChange({ ...data, [key]: value })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">Annual Faculty Self-Evaluation</h2>
        <p className="text-sm text-text-secondary mt-1">
          This annual record is assessed independently and does not determine promotion scores.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-text">
          Evaluation year
          <input
            type="number"
            value={data.evaluationYear}
            onChange={(event) => updateText('evaluationYear', event.target.value)}
            min="2000"
            max="2100"
            required
            className="mt-1"
          />
        </label>
        <label className="block text-sm font-medium text-text">
          Total CPD hours
          <input
            type="number"
            value={data.cpdHours}
            onChange={(event) => onChange({ ...data, cpdHours: Number(event.target.value) || 0 })}
            min="0"
            className="mt-1"
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-text">
        Employment details
        <textarea
          value={data.employmentDetails}
          onChange={(event) => updateText('employmentDetails', event.target.value)}
          rows={3}
          className="mt-1"
        />
      </label>
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h3 className="font-semibold text-text border-b border-border pb-2">{section.title}</h3>
          {section.fields.map(({ key, label }) => (
            <label key={key} className="block text-sm font-medium text-text">
              {label}
              <textarea
                value={String(data[key] ?? '')}
                onChange={(event) => updateText(key, event.target.value)}
                rows={3}
                className="mt-1"
              />
            </label>
          ))}
        </section>
      ))}
      <FileUpload
        applicationId={applicationId}
        category="annual-self-evaluation"
        label="Supporting evidence (PDF)"
        multiple
        existingFiles={data.supportingDocuments}
        onUpload={(supportingDocuments) => onChange({ ...data, supportingDocuments })}
      />
    </div>
  )
}
