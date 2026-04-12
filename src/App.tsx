import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import type { UserRole } from './types'

// Auth
import SignIn from './components/auth/SignIn'
import Register from './components/auth/Register'

// Layout
import DashboardLayout from './components/layout/DashboardLayout'

// Faculty
import FacultyDashboard from './components/faculty/FacultyDashboard'
import ApplicationForm from './components/faculty/ApplicationForm'
import ApplicationView from './components/faculty/ApplicationView'

// Reviewers
import InternalDashboard from './components/reviewer/InternalDashboard'
import ReviewForm from './components/reviewer/ReviewForm'
import ExternalDashboard from './components/reviewer/ExternalDashboard'
import ExternalReviewForm from './components/reviewer/ExternalReviewForm'

// Admin
import AdminDashboard from './components/admin/AdminDashboard'
import UserManagement from './components/admin/UserManagement'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/signin" replace />
  return <>{children}</>
}

function RequireRole({ role, children }: { role: UserRole | UserRole[]; children: React.ReactNode }) {
  const { role: userRole, loading, profile } = useAuth()
  if (loading) return null

  if (!profile) {
    // User authenticated but no profile — redirect to register to complete
    return <Navigate to="/register" replace />
  }

  const allowed = Array.isArray(role) ? role.includes(userRole!) : userRole === role
  if (!allowed) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function DashboardRouter() {
  const { role } = useAuth()
  if (role === 'admin') return <AdminDashboard />
  if (role === 'internal_reviewer') return <InternalDashboard />
  if (role === 'external_reviewer') return <ExternalDashboard />
  return <FacultyDashboard />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        {/* Dashboard — role-based */}
        <Route path="/dashboard" element={<DashboardRouter />} />

        {/* Faculty routes */}
        <Route
          path="/applications"
          element={
            <RequireRole role="faculty">
              <FacultyDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/applications/:id/edit"
          element={
            <RequireRole role="faculty">
              <ApplicationForm />
            </RequireRole>
          }
        />
        <Route
          path="/applications/:id"
          element={
            <RequireRole role={['faculty', 'internal_reviewer', 'admin']}>
              <ApplicationView />
            </RequireRole>
          }
        />

        {/* Internal reviewer routes */}
        <Route
          path="/review/applications"
          element={
            <RequireRole role="internal_reviewer">
              <InternalDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/review/applications/:id"
          element={
            <RequireRole role="internal_reviewer">
              <ReviewForm />
            </RequireRole>
          }
        />

        {/* External reviewer routes */}
        <Route
          path="/external-review"
          element={
            <RequireRole role="external_reviewer">
              <ExternalDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/external-review/:id"
          element={
            <RequireRole role="external_reviewer">
              <ExternalReviewForm />
            </RequireRole>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/applications"
          element={
            <RequireRole role="admin">
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireRole role="admin">
              <UserManagement />
            </RequireRole>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RequireRole role="admin">
              <div className="max-w-3xl mx-auto card p-8 text-center">
                <h2 className="text-lg font-semibold text-text mb-2">Settings</h2>
                <p className="text-text-secondary">System settings will be available here.</p>
              </div>
            </RequireRole>
          }
        />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-surface-alt">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-text mb-2">404</h1>
              <p className="text-text-secondary">Page not found</p>
            </div>
          </div>
        }
      />
    </Routes>
  )
}
