import { Menu, Bell } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
  onMenuToggle: () => void
  title?: string
}

export default function Header({ onMenuToggle, title }: HeaderProps) {
  const { profile } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-surface border-b border-border">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-surface-hover transition-colors"
        >
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
        {title && <h2 className="text-lg font-semibold text-text">{title}</h2>}
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-surface-hover transition-colors relative">
          <Bell className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">
            {profile?.displayName?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
      </div>
    </header>
  )
}
