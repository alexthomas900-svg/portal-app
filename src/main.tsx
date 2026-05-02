import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep details in console for debugging while showing a user-friendly fallback UI.
    console.error('Application crashed during render:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
          <div className="max-w-xl w-full card p-6">
            <h1 className="text-xl font-semibold text-danger mb-2">App failed to start</h1>
            <p className="text-sm text-text-secondary mb-3">
              A runtime error prevented the interface from rendering. Check browser DevTools console for details.
            </p>
            <p className="text-xs text-text-dim break-words">
              {this.state.message || 'Unknown startup error'}
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const rootElement = document.getElementById('root')

function showFatalError(message: string) {
  if (!rootElement) return
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;">
      <div style="max-width:720px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
        <h1 style="margin:0 0 8px;color:#b91c1c;font-size:20px;">App failed to start</h1>
        <p style="margin:0 0 10px;color:#475569;font-size:14px;">A startup error occurred before the UI could render.</p>
        <pre style="margin:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;white-space:pre-wrap;word-break:break-word;color:#0f172a;font-size:12px;">${message}</pre>
      </div>
    </div>
  `
}

window.addEventListener('error', (event) => {
  showFatalError(event.error?.message || event.message || 'Unknown error')
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const message = reason instanceof Error ? reason.message : String(reason)
  showFatalError(message)
})

// Wake up Render backend early — free tier spins down after 15 min of inactivity.
// Fire-and-forget: any failure is silently swallowed so it never blocks the UI.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
fetch(`${API_URL}/health`, { method: 'GET' }).catch(() => {/* backend cold-starting, ignore */})

async function bootstrap() {
  if (!rootElement) return
  const root = createRoot(rootElement)

  try {
    const [{ AuthProvider }, { default: App }] = await Promise.all([
      import('./contexts/AuthContext'),
      import('./App'),
    ])

    root.render(
      <StrictMode>
        <AppErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </AppErrorBoundary>
      </StrictMode>,
    )
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    showFatalError(message)
  }
}

void bootstrap()
