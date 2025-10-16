import { Router } from 'express'

const router = Router()

// GET /users (admin)
router.get('/', async (_req, res) => {
  // TODO: list users with pagination
  return res.status(501).json({ message: 'Not implemented' })
})

// POST /users (admin)
router.post('/', async (_req, res) => {
  // TODO: create/invite user
  return res.status(501).json({ message: 'Not implemented' })
})

// PATCH /users/:id (admin)
router.patch('/:id', async (_req, res) => {
  // TODO: update user
  return res.status(501).json({ message: 'Not implemented' })
})

// DELETE /users/:id (admin)
router.delete('/:id', async (_req, res) => {
  // TODO: delete user
  return res.status(501).json({ message: 'Not implemented' })
})

export default router
