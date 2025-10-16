import type { Response } from 'express'

// Simple in-memory SSE client registry keyed by session/user id.
// In production, consider eviction on disconnect and limits per user.

const clients = new Map<string, Set<Response>>()

export function addClient(key: string, res: Response) {
  let set = clients.get(key)
  if (!set) {
    set = new Set()
    clients.set(key, set)
  }
  set.add(res)
}

export function removeClient(key: string, res: Response) {
  const set = clients.get(key)
  if (!set) return
  set.delete(res)
  if (set.size === 0) clients.delete(key)
}

export function broadcast(key: string, event: string, data: unknown) {
  const set = clients.get(key)
  if (!set) return
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`
  for (const res of set) {
    try {
      res.write(payload)
    } catch {}
  }
}

export function heartbeat() {
  const payload = `: keep-alive\n\n`
  for (const set of clients.values()) {
    for (const res of set) {
      try { res.write(payload) } catch {}
    }
  }
}
