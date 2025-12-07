import { Router } from 'express'
import { allDocuments } from '../store/documents'

const router = Router()

// GET /analytics/overview
router.get('/overview', async (_req, res) => {
  try {
    const docs = allDocuments()
    console.log(`Found ${docs.length} total documents`)
    
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0] // YYYY-MM-DD format
    
    let processed = 0, pending = 0, errors = 0, today = 0
    
    type DocumentStatus = 'Processed' | 'Pending' | 'Processing' | 'Error' | 'Failed';
    
    docs.forEach(doc => {
      const status = (doc.status as DocumentStatus) || 'Pending';
      console.log(`Document ${doc.id}: status=${status}, updatedAt=${doc.updatedAt}`);
      
      // Count by status
      if (status === 'Processed') processed++
      else if (status === 'Pending' || status === 'Processing') pending++
      else if (status === 'Error' || status === 'Failed') errors++
      
      // Count today's documents
      if (doc.updatedAt) {
        const docDate = new Date(doc.updatedAt).toISOString().split('T')[0]
        if (docDate === todayStr) today++
      }
    })
    
    console.log(`Analytics overview: processed=${processed}, pending=${pending}, errors=${errors}, today=${today}`)
    
    return res.json({ 
      success: true,
      data: {
        processed,
        pending,
        errors,
        today
      },
      total: docs.length
    })
  } catch (error: unknown) {
    console.error('Error in analytics overview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data',
      details: errorMessage
    });
  }
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
