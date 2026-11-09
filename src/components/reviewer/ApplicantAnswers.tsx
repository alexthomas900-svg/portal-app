import type { Application } from '../../types'
import { buildApplicationPdfRows } from '../../utils/applicationPdf'

export default function ApplicantAnswers({ app }: { app: Application }) {
  const rows = buildApplicationPdfRows(app)

  return (
    <div className="card p-5 mb-6" data-testid="applicant-answers">
      <h2 className="text-sm font-semibold text-text mb-3">Applicant's Application</h2>
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-xs font-medium text-text-secondary">{row.label}</dt>
            <dd className="text-sm text-text whitespace-pre-line sm:col-span-2">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
