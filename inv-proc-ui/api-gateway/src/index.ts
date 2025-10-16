import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { sessionMiddleware } from './config/session'
import { addClient, removeClient, heartbeat } from './sse/registry'
import { ensureBucket } from './config/minio'
import authRouter from './routes/auth.routes'
import uploadsRouter from './routes/uploads.routes'
import documentsRouter from './routes/documents.routes'
import analyticsRouter from './routes/analytics.routes'
import settingsRouter from './routes/settings.routes'
import integrationsRouter from './routes/integrations.routes'
import usersRouter from './routes/users.routes'
import subscriptionsRouter from './routes/subscriptions.routes'
import internalRouter from './routes/internal.routes'
import { skipCsrf, csrfTokenHandler } from './middleware/csrf'

const app = express()

app.use(helmet())
app.use(morgan('dev'))
const corsOrigin = Array.isArray(env.CORS_ORIGIN)
  ? env.CORS_ORIGIN
  : String(env.CORS_ORIGIN)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(cookieParser())
app.use(sessionMiddleware)
app.use(express.json({ limit: '5mb' }))
// CSRF protection (skip for GET, SSE, internal routes)
app.use(skipCsrf)

// Health
app.get('/api/v1/health', (_req, res) => res.json({ ok: true }))
// CSRF token endpoint (for clients to fetch a token)
app.get('/api/v1/csrf', csrfTokenHandler)

// SSE: Uploads stream (simple session-based key)
app.get('/api/v1/uploads/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  ;(res as any).flushHeaders?.()

  const key = (req.session as any)?.id || req.ip
  addClient(key, res)

  req.on('close', () => {
    removeClient(key, res)
  })
})

// Mount routes
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/uploads', uploadsRouter)
app.use('/api/v1/documents', documentsRouter)
app.use('/api/v1/analytics', analyticsRouter)
app.use('/api/v1/settings', settingsRouter)
app.use('/api/v1/integrations', integrationsRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/subscriptions', subscriptionsRouter)
app.use('/api/v1/internal', internalRouter)

// Heartbeat for SSE clients
setInterval(() => heartbeat(), 30000)

if (env.NODE_ENV !== 'production') {
  ensureBucket()
    .then(() => console.log('[api] MinIO bucket ensured'))
    .catch((e) => console.error('[api] MinIO ensureBucket error', e))
}

app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`)
})
