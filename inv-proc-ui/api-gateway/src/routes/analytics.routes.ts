import { Router } from 'express'
import { allDocuments } from '../store/documents'

const router = Router()

// GET /analytics/overview
router.get('/overview', async (_req, res) => {
  const docs = allDocuments()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  let processed = 0, pending = 0, errors = 0, today = 0
  for (const d of docs) {
    if (d.status === 'Processed') processed++
    else if (d.status === 'Pending') pending++
    else if (d.status === 'Error') errors++
    const dDate = new Date(d.updatedAt).toISOString().slice(0, 10)
    if (dDate === todayStr) today++
  }
  return res.json({ processed, pending, errors, today })
})

// GET /analytics/documents-per-day
router.get('/documents-per-day', async (req, res) => {
  const docs = allDocuments()
  const from = req.query.from ? new Date(String(req.query.from)) : null
  const to = req.query.to ? new Date(String(req.query.to)) : null

  const bucket = new Map<string, { date: string; total: number; errors: number }>()
  for (const d of docs) {
    const day = new Date(d.updatedAt).toISOString().slice(0, 10)
    const dayDate = new Date(day)
    if (from && dayDate < from) continue
    if (to && dayDate > to) continue
    let agg = bucket.get(day)
    if (!agg) { agg = { date: day, total: 0, errors: 0 }; bucket.set(day, agg) }
    agg.total++
    if (d.status === 'Error') agg.errors++
  }
  const arr = Array.from(bucket.values()).sort((a,b) => a.date.localeCompare(b.date))
  return res.json({ items: arr })
})

export default router
