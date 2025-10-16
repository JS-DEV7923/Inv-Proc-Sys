import { Router } from 'express'

const router = Router()

// GET /settings
router.get('/', async (req, res) => {
  // TODO: return current settings (e.g., confidenceThreshold)
  return res.status(501).json({ message: 'Not implemented' })
})

// PATCH /settings
router.patch('/', async (req, res) => {
  // TODO: update settings
  return res.status(501).json({ message: 'Not implemented' })
})

export default router
