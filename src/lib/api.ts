import { auth } from '../firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}${endpoint}`, { headers })
  return handleResponse<T>(res)
}

export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  })
  return handleResponse<T>(res)
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse<T>(res)
}

export async function apiDelete(endpoint: string): Promise<void> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error || `Delete failed: ${res.status}`)
  }
}
