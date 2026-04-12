import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Users,
  Settings,
  LogOut,
  GraduationCap,
  X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { signOut } from '../../services/auth'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const facultyLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/applications', icon: FileText, label: 'My Applications' },
]

const internalReviewerLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/review/applications', icon: ClipboardCheck, label: 'Review Applications' },
]

const externalReviewerLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/external-review', icon: ClipboardCheck, label: 'Evaluations' },
]

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/applications', icon: FileText, label: 'All Applications' },
  { to: '/admin/users', icon: Users, label: 'User Management' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { role, profile } = useAuth()
  const navigate = useNavigate()

  const links =
    role === 'admin'
      ? adminLinks
      : role === 'internal_reviewer'
        ? internalReviewerLinks
        : role === 'external_reviewer'
          ? externalReviewerLinks
          : facultyLinks

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-surface border-r border-border
          flex flex-col transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text leading-tight">FCC Evaluation</h1>
              <p className="text-[11px] text-text-dim">Faculty Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-surface-hover">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary border border-primary-100'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                }`
              }
            >
              <link.icon className="w-[18px] h-[18px]" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-3 pb-4 mt-auto">
          <div className="p-3 rounded-lg bg-surface-alt border border-border">
            <p className="text-sm font-medium text-text truncate">{profile?.displayName}</p>
            <p className="text-xs text-text-dim truncate">{profile?.email}</p>
            <p className="text-[10px] text-text-dim uppercase tracking-wide mt-1">
              {role?.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 mt-2 text-sm text-danger rounded-lg hover:bg-danger-light transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
