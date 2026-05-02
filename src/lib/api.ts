import { auth } from '../firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function getAuthHeader(forceRefresh = false): Promise<Record<string, string>> {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
  }

  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken(forceRefresh)
  return { Authorization: `Bearer ${token}` }
}

async function fetchWithAuthRetry(endpoint: string, init?: RequestInit): Promise<Response> {
  const headers = await getAuthHeader(false)
  const first = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...headers },
  })

  if (first.status !== 401 || !auth.currentUser) {
    return first
  }

  const refreshedHeaders = await getAuthHeader(true)
  return fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...refreshedHeaders },
  })
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetchWithAuthRetry(endpoint)
  return handleResponse<T>(res)
}

export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const res = await fetchWithAuthRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  })
  return handleResponse<T>(res)
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetchWithAuthRetry(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse<T>(res)
}

export async function apiDelete(endpoint: string): Promise<void> {
  const res = await fetchWithAuthRetry(endpoint, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error || `Delete failed: ${res.status}`)
  }
}
