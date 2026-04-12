import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../contexts/AuthContext'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, user, loading } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        {!loading && user && !profile && (
          <div className="px-4 sm:px-6 pt-4">
            <div className="p-3 rounded-lg bg-warning-light border border-yellow-200 text-warning text-sm">
              <strong>Firestore profile not found.</strong>{' '}
              Your account exists in Firebase Auth but has no profile document in Firestore.
              This usually means Firestore is not set up, security rules haven&apos;t been deployed,
              or the &apos;users&apos; collection doesn&apos;t have a document for your UID ({user.uid}).
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
