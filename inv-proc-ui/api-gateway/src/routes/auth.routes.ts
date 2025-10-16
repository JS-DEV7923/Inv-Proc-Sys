import { Router } from 'express'

const router = Router()

// Minimal in-memory user store for development
type User = { id: string; name: string; email: string; password: string }
const users = new Map<string, User>()

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' })
  if (users.has(email)) return res.status(409).json({ error: 'User exists' })
  const user: User = { id: `u_${Date.now()}`, name, email, password }
  users.set(email, user)
  ;(req.session as any).user = { id: user.id, name: user.name, email: user.email }
  return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } })
})

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })
  const user = users.get(email)
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' })
  ;(req.session as any).user = { id: user.id, name: user.name, email: user.email }
  return res.status(200).json({ user: { id: user.id, name: user.name, email: user.email } })
})

// POST /auth/logout
router.post('/logout', async (req, res) => {
  req.session.destroy(() => {})
  return res.status(204).end()
})

// GET /auth/me
router.get('/me', async (req, res) => {
  const user = (req.session as any).user || null
  return res.status(200).json({ user })
})

export default router
