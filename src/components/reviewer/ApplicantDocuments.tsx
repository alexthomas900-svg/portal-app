import { FileText } from 'lucide-react'
import { fileStorageDisabled } from '../../services/storage'
import type { Application, DocumentFile } from '../../types'

type Entry = [label: string, files: DocumentFile | DocumentFile[] | null | undefined]

function groupsFor(app: Application): { title: string; entries: Entry[] }[] {
  const { documents: d, teachingEffectiveness: t, effortsToImprove: e, scholarship: s, services: v } = app
  return [
    {
      title: 'Application Documents',
      entries: [
        ['Updated CV', d.updatedCV],
        ['Self-Evaluation Form', d.selfEvaluationForm],
        ['Cover Letter', d.coverLetter],
        ['Research Statement', d.researchStatement],
        ['PhD Degree', d.phdDegree],
        ['PhD Transcript', d.phdTranscript],
        ['HEC Attestation', d.hecAttestation],
        ['MPhil/MS Degree', d.mastersDegree],
        ['MPhil/MS Transcript', d.mastersTranscript],
        ['Experience Letters', d.experienceLetters],
        ["Chair's Evaluation", d.chairEvaluation],
        ["Dean's Evaluation", d.deanEvaluation],
        ['Efforts to Improve', d.effortsToImprovePdf],
        ['Paper Abstracts', d.abstractsPdf],
      ],
    },
    {
      title: 'Teaching Evidence',
      entries: [
        ['Course Outlines', d.courseOutlines],
        ['Assignments', d.assignments],
        ['Teaching Support Documents', d.teachingSupportDocs],
        ['SLO Documents', t.sloDocuments],
        ['Syllabi', t.syllabi],
        ['Assessment Samples', t.assessmentSamples],
        ['Student Feedback', t.studentFeedbackDocs],
      ],
    },
    {
      title: 'Professional Development',
      entries: [
        ['Training Certificates', e.trainingCertificates],
        ['Workshop Attendance', e.workshopAttendance],
        ['Reflective Essays', e.reflectiveEssays],
      ],
    },
    {
      title: 'Scholarship Evidence',
      entries: [
        ['Publication Proofs', s.publicationProofs],
        ['Conference Proofs', s.conferenceProofs],
        ['Grant Documents', s.grantDocuments],
      ],
    },
    {
      title: 'Service Evidence',
      entries: [
        ['Committee Letters', v.committeeLetters],
        ['Service Proofs', v.serviceProofs],
      ],
    },
    {
      title: 'Annual Evaluation Evidence',
      entries: [['Supporting Documents', app.annualEvaluation?.supportingDocuments]],
    },
  ]
}

export default function ApplicantDocuments({ app }: { app: Application }) {
  const groups = groupsFor(app)
    .map(({ title, entries }) => ({
      title,
      files: entries.flatMap(([label, files]) => [files ?? []].flat().map((file) => ({ label, file }))),
    }))
    .filter((group) => group.files.length > 0)
  const total = groups.reduce((sum, group) => sum + group.files.length, 0)

  return (
    <div className="card p-5 mb-6" data-testid="applicant-documents">
      <h2 className="text-sm font-semibold text-text">Applicant Documents ({total})</h2>
      {fileStorageDisabled && total > 0 && (
        <p className="text-xs text-text-dim mt-1">Demo site: files are not stored, so View opens a sample PDF.</p>
      )}
      {total === 0 ? (
        <p className="text-sm text-text-secondary mt-2">The applicant has not uploaded any documents.</p>
      ) : (
        <div className="space-y-4 mt-3">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-text-secondary uppercase mb-1">{group.title}</p>
              <ul className="divide-y divide-border">
                {group.files.map(({ label, file }) => (
                  <li key={`${label}-${file.path}`} className="flex items-center gap-3 py-2 text-sm">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-text">{label}</p>
                      <p className="text-xs text-text-dim truncate">{file.name}</p>
                    </div>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm shrink-0">View</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
