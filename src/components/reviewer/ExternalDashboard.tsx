import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, FileText } from 'lucide-react'
import { getSubmittedApplications } from '../../services/applications'
import type { Application } from '../../types'

export default function ExternalDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const loadApplications = async () => {
      try {
        const apps = await getSubmittedApplications()
        if (active) {
          setApplications(
            apps.filter(
              (app) => app.applicationType === 'promotion' && app.promotionType === 'full_professor',
            ),
          )
        }
      } catch (err) {
        console.error('Failed to load external reviewer applications:', err)
        if (active) {
          setApplications([])
          setError(err instanceof Error ? err.message : 'Failed to load applications.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadApplications()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light border border-red-200 text-danger text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">External Reviewer Dashboard</h1>
        <p className="text-text-secondary mt-1">
          You can access only the Updated CV for each applicant. Provide a structured evaluation.
        </p>
      </div>

      <div className="p-4 mb-6 rounded-lg bg-info-light border border-blue-200">
        <p className="text-sm text-info">
          <strong>Note:</strong> As an external reviewer, you can only view the applicant's Updated CV.
          You must provide structured narrative evaluation for each applicant.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">No applications to review</h3>
          <p className="text-text-secondary">Applications assigned to you will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text">{app.applicantName}</h3>
                  <p className="text-xs text-text-secondary">
                    Full Professor Promotion · {app.personalInfo.department}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {app.documents.updatedCV && (
                    <a
                      href={app.documents.updatedCV.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View CV
                    </a>
                  )}
                  <button
                    onClick={() => navigate(`/external-review/${app.id}`)}
                    className="btn-primary btn-sm"
                  >
                    Evaluate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
