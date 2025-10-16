import { Router } from 'express'

const router = Router()

// GET /integrations
router.get('/', async (_req, res) => {
  // TODO: return redacted integration configs
  return res.status(501).json({ message: 'Not implemented' })
})

// PATCH /integrations
router.patch('/', async (_req, res) => {
  // TODO: update integration credentials server-side
  return res.status(501).json({ message: 'Not implemented' })
})

export default router
