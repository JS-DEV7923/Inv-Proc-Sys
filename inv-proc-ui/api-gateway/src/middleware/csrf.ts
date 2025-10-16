import type { Request, Response, NextFunction } from 'express'
import csurf from 'csurf'

// Using session storage for tokens (no cookies). Ensure sessions are enabled before this.
const csrfProtection = csurf({ cookie: false })

// Skip CSRF for safe or special endpoints, otherwise apply protection.
export function skipCsrf(req: Request, res: Response, next: NextFunction) {
  // Safe HTTP methods
  const safe = /^(GET|HEAD|OPTIONS)$/i.test(req.method)
  // SSE stream path and internal worker callbacks
  const isSSE = req.path === '/api/v1/uploads/stream'
  const isInternal = req.path.startsWith('/api/v1/internal')

  if (safe || isSSE || isInternal) return next()
  return csrfProtection(req, res, next)
}

export function csrfTokenHandler(req: Request, res: Response) {
  // Ensure a token is generated if protection is active.
  try {
    // Invoke underlying protection to initialize secret if needed.
    // For GET this would normally be skipped; explicitly call to get a token.
    // We call with a noop next to attach secrets.
    csrfProtection(req, res, () => {})
  } catch (_) {
    // If it throws due to method/path, ignore; token may still be available.
  }
  const token = (req as any).csrfToken ? (req as any).csrfToken() : null
  res.json({ csrfToken: token })
}
