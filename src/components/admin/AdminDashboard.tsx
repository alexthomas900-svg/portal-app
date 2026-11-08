import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  FileText,
  ClipboardCheck,
  BarChart3,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { getAllApplications, updateApplicationStatus, deleteApplication } from '../../services/applications'
import StatusBadge from '../shared/StatusBadge'
import {
  formatApplicationTypeLabel,
  formatPromotionLabel,
  type Application,
  type ApplicationStatus,
} from '../../types'
import WorkflowManagement from './WorkflowManagement'
import { downloadCsv, printPdfReport } from '../../utils/reports'

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<Application['applicationType'] | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [decisionFilter, setDecisionFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      const apps = await getAllApplications()
      setApplications(apps)
    } catch (err) {
      console.error('Failed to load admin applications:', err)
      setApplications([])
      setError(err instanceof Error ? err.message : 'Failed to load applications.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (appId: string, status: ApplicationStatus) => {
    await updateApplicationStatus(appId, status)
    await loadApplications()
  }

  const handleDelete = async (appId: string) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return
    await deleteApplication(appId)
    await loadApplications()
  }

  const filtered = applications.filter((application) =>
    (filter === 'all' || application.status === filter) &&
    (typeFilter === 'all' || application.applicationType === typeFilter) &&
    (departmentFilter === 'all' || application.personalInfo.department === departmentFilter) &&
    (yearFilter === 'all' || (application.academicYear ?? application.annualEvaluation?.evaluationYear) === yearFilter) &&
    (decisionFilter === 'all' || (application.finalDecision ?? '') === decisionFilter),
  )
  const departments = [...new Set(applications.map((application) => application.personalInfo.department).filter(Boolean))]
  const years = [...new Set(applications.map((application) => application.academicYear ?? application.annualEvaluation?.evaluationYear).filter((year): year is string => Boolean(year)))]

  const stats = {
    total: applications.length,
    draft: applications.filter((a) => a.status === 'draft').length,
    submitted: applications.filter((a) => a.status === 'submitted').length,
    underReview: applications.filter((a) => a.status === 'under_review').length,
    reviewed: applications.filter((a) => a.status === 'reviewed').length,
    decided: applications.filter((a) => a.status === 'decision_made').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light border border-red-200 text-danger text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Admin Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Full system overview. Manage applications, reviewers, and reports.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-primary' },
          { label: 'Draft', value: stats.draft, icon: FileText, color: 'text-text-dim' },
          { label: 'Submitted', value: stats.submitted, icon: ClipboardCheck, color: 'text-info' },
          { label: 'Under Review', value: stats.underReview, icon: BarChart3, color: 'text-warning' },
          { label: 'Reviewed', value: stats.reviewed, icon: ClipboardCheck, color: 'text-success' },
          { label: 'Decided', value: stats.decided, icon: Users, color: 'text-primary-dark' },
        ].map((stat) => (
          <div key={stat.label} className="card p-3 text-center">
            <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
            <p className="text-xl font-bold text-text">{stat.value}</p>
            <p className="text-[10px] text-text-secondary uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/users')}
          className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text">User Management</p>
            <p className="text-xs text-text-secondary">Manage roles and accounts</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-dim" />
        </button>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text">Reviewer Assignment</p>
            <p className="text-xs text-text-secondary">Assign reviewers to applications</p>
          </div>
        </div>

        <WorkflowManagement applications={applications} />

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => downloadCsv('faculty-portal-report.csv', [
              ['Reference', 'Applicant', 'Email', 'Application Type', 'Promotion Type', 'Department', 'Designation', 'Status', 'Academic Year', 'Final Decision', 'Internal Reviewer 1', 'Internal Reviewer 2', 'External Reviewer'],
              ...filtered.map((app) => [
                app.id,
                app.applicantName,
                app.applicantEmail,
                app.applicationType,
                app.applicationType === 'promotion' ? app.promotionType : '',
                app.personalInfo.department,
                app.personalInfo.currentDesignation,
                app.status,
                app.academicYear ?? app.annualEvaluation?.evaluationYear ?? '',
                app.finalDecision ?? '',
                app.assignments?.internalReviewer1Uid ?? '',
                app.assignments?.internalReviewer2Uid ?? '',
                app.assignments?.externalReviewerUid ?? '',
              ]),
            ])}
            className="btn-secondary btn-sm"
          >
            Export Excel-compatible CSV
          </button>
          <button
            onClick={() => printPdfReport('Institutional Application Report', filtered.map((app) => ({
              label: `${app.applicantName} · ${app.id}`,
              value: [
                `${app.applicationType}${app.applicationType === 'promotion' ? ` (${formatPromotionLabel(app.promotionType)})` : ''}`,
                `Department: ${app.personalInfo.department || '—'}`,
                `Designation: ${app.personalInfo.currentDesignation || '—'}`,
                `Status: ${app.status}`,
                `Final decision: ${app.finalDecision ?? 'Pending'}`,
              ].join('\n'),
            })))}
            className="btn-secondary btn-sm"
          >
            Print / Save report as PDF
          </button>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text">Reports</p>
            <p className="text-xs text-text-secondary">Generate promotion reports</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm font-medium text-text">Filter:</span>
        {(['all', 'draft', 'submitted', 'under_review', 'reviewed', 'decision_made'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-surface-hover text-text-secondary hover:text-text'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="text-xs px-2 py-1.5 rounded border border-border bg-surface">
          <option value="all">All types</option>
          <option value="self_evaluation">Annual evaluation</option>
          <option value="promotion">Promotion</option>
          <option value="contract_renewal">Contract renewal</option>
        </select>
        <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="text-xs px-2 py-1.5 rounded border border-border bg-surface">
          <option value="all">All departments</option>
          {departments.map((department) => <option key={department} value={department}>{department}</option>)}
        </select>
        <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="text-xs px-2 py-1.5 rounded border border-border bg-surface">
          <option value="all">All academic years</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value)} className="text-xs px-2 py-1.5 rounded border border-border bg-surface">
          <option value="all">All decisions</option>
          {['approved', 'not_approved', 'deferred', 'returned_for_information'].map((decision) => <option key={decision} value={decision}>{decision.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Applications table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Applicant</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Type</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Department</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Date</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id} className="border-b border-border hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{app.applicantName}</p>
                    <p className="text-xs text-text-dim">{app.applicantEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {app.applicationType === 'promotion'
                      ? `${formatPromotionLabel(app.promotionType)} Promotion`
                      : formatApplicationTypeLabel(app.applicationType)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {app.personalInfo.department || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <select
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(app.id, e.target.value as ApplicationStatus)
                        }
                        className="text-xs px-2 py-1 rounded border border-border bg-surface"
                      >
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="decision_made">Decision Made</option>
                      </select>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="p-1.5 rounded hover:bg-danger-light text-text-dim hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-dim">
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
