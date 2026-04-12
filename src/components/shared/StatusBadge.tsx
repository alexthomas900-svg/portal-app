import type { ApplicationStatus, EligibilityStatus } from '../../types'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'badge-neutral' },
  submitted: { label: 'Submitted', className: 'badge-info' },
  under_review: { label: 'Under Review', className: 'badge-warning' },
  reviewed: { label: 'Reviewed', className: 'badge-success' },
  decision_made: { label: 'Decision Made', className: 'badge-success' },
  eligible: { label: 'Eligible', className: 'badge-success' },
  conditionally_eligible: { label: 'Conditionally Eligible', className: 'badge-warning' },
  not_eligible: { label: 'Not Eligible', className: 'badge-danger' },
}

interface StatusBadgeProps {
  status: ApplicationStatus | EligibilityStatus | string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'badge-neutral' }
  return <span className={config.className}>{config.label}</span>
}
