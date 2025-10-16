import { Router } from 'express'
import { getDocument, listDocumentsByUser, upsertDocument } from '../store/documents'

const router = Router()

// GET /documents - list
router.get('/', async (req, res) => {
  const status = (req.query.status as any | undefined) || undefined
  const userId = (req.session as any)?.user?.id || 'anon'
  let list = listDocumentsByUser(userId)
  if (status) list = list.filter(d => d.status === status)
  return res.json({ items: list, total: list.length })
})

// GET /documents/:id - get one
router.get('/:id', async (req, res) => {
  const doc = getDocument(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Not found' })
  return res.json(doc)
})

// PATCH /documents/:id - update fields
router.patch('/:id', async (req, res) => {
  const doc = getDocument(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Not found' })
  const allowed = ['vendor', 'invoiceId', 'date', 'total', 'lineItems'] as const
  for (const key of allowed) {
    if (key in req.body) (doc as any)[key] = req.body[key]
  }
  doc.updatedAt = Date.now()
  upsertDocument(doc)
  return res.json(doc)
})

// POST /documents/:id/approve
router.post('/:id/approve', async (req, res) => {
  const doc = getDocument(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Not found' })
  doc.status = 'Processed'
  doc.errorReason = undefined
  doc.updatedAt = Date.now()
  upsertDocument(doc)
  return res.json(doc)
})

// POST /documents/:id/reject
router.post('/:id/reject', async (req, res) => {
  const doc = getDocument(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Not found' })
  doc.status = 'Error'
  doc.errorReason = (req.body && req.body.reason) || 'Rejected'
  doc.updatedAt = Date.now()
  upsertDocument(doc)
  return res.json(doc)
})

export default router
