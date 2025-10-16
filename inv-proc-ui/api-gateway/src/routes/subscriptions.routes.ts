import { Router } from 'express'

const router = Router()

// POST /subscriptions
router.post('/', async (req, res) => {
  // TODO: accept { email } and enqueue/store subscription
  return res.status(501).json({ message: 'Not implemented' })
})

export default router
