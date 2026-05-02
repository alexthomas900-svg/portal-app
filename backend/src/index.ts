import express from 'express'
import cors from 'cors'
import './firebase-admin.js' // Initialize Firebase Admin on startup
import authRoutes from './routes/auth.js'
import applicationRoutes from './routes/applications.js'
import reviewRoutes from './routes/reviews.js'

const app = express()
const PORT = parseInt(process.env.PORT || '5000', 10)

// ── CORS ──
const corsOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
])

const extraOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

for (const origin of extraOrigins) {
  corsOrigins.add(origin)
}

function isFirebaseOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'https:' &&
      (url.hostname.endsWith('.web.app') || url.hostname.endsWith('.firebaseapp.com'))
    )
  } catch {
    return false
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true)
      if (corsOrigins.has(origin) || isFirebaseOrigin(origin)) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '10mb' }))

// ── Routes ──
app.use('/api/auth', authRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/reviews', reviewRoutes)

app.get('/', (_req, res) => {
  res.json({
    service: 'portal-app-backend',
    status: 'ok',
    health: '/api/health',
  })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Start ──
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`)
})
