import { useEffect, useState } from 'react'
import { apiGet, apiPut, apiDelete } from '../../lib/api'
import { Trash2, Shield } from 'lucide-react'
import type { UserProfile, UserRole } from '../../types'

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = async () => {
    try {
      const data = await apiGet<UserProfile[]>('/api/auth/users')
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleRoleChange = async (uid: string, role: UserRole) => {
    await apiPut(`/api/auth/users/${uid}/role`, { role })
    await loadUsers()
  }

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Delete this user profile? (Auth account remains)')) return
    await apiDelete(`/api/auth/users/${uid}`)
    await loadUsers()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">User Management</h1>
        <p className="text-text-secondary mt-1">
          Manage user accounts and roles. Total users: {users.length}
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">User</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Department</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Role</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uid} className="border-b border-border hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-text">{user.displayName}</p>
                        <p className="text-xs text-text-dim">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{user.department || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-text-dim" />
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        className="text-xs px-2 py-1 rounded border border-border bg-surface"
                      >
                        <option value="faculty">Faculty</option>
                        <option value="internal_reviewer">Internal Reviewer</option>
                        <option value="external_reviewer">External Reviewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(user.uid)}
                      className="p-1.5 rounded hover:bg-danger-light text-text-dim hover:text-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
