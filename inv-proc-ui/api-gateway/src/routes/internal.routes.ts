import { Router } from 'express'
import { broadcast } from '../sse/registry'
import { ensureDocument, upsertDocument } from '../store/documents'
import { env } from '../config/env'

const router = Router()

// NOTE: In production, protect this with auth tokens or mTLS.
router.post('/events', (req, res) => {
  const secret = req.header('x-internal-secret')
  if (!secret || secret !== (process.env.INTERNAL_EVENTS_SECRET || 'dev-internal-secret')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { userId, event, data } = req.body || {}
  if (!userId || !event) return res.status(400).json({ error: 'Missing userId or event' })

  // Update in-memory document store based on event
  if (event === 'progress' && data?.documentId) {
    const doc = ensureDocument(userId, data.documentId)
    doc.status = 'Pending'
    doc.updatedAt = Date.now()
    upsertDocument(doc)
  }
  if (event === 'completed' && data?.documentId) {
    const doc = ensureDocument(userId, data.documentId)
    doc.status = 'Processed'
    doc.updatedAt = Date.now()
    if (typeof data.total === 'number') doc.total = data.total
    upsertDocument(doc)
  }
  if (event === 'error' && data?.documentId) {
    const doc = ensureDocument(userId, data.documentId)
    doc.status = 'Error'
    doc.errorReason = data?.reason || 'Processing error'
    doc.updatedAt = Date.now()
    upsertDocument(doc)
  }

  broadcast(userId, event, data ?? {})
  return res.status(202).json({ ok: true })
})

export default router
