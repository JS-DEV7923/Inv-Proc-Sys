export const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1'

let __csrfToken: string | null = null
async function getCsrfToken() {
  if (__csrfToken) return __csrfToken
  try {
    const res = await fetch(`${BASE_URL}/csrf`, { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    __csrfToken = json?.csrfToken || null
  } catch {}
  return __csrfToken
}

export async function uploadFile(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const token = await getCsrfToken()
  const res = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
    headers: token ? { 'x-csrf-token': token } as any : undefined,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json() as Promise<{ uploadId: string; documentId: string; status: string }>
}

export function openUploadSSE(handlers: { onProgress: (data: any) => void; onCompleted: (data: any) => void; onError?: (data: any) => void }) {
  const url = `${BASE_URL.replace(/\/api\/v1$/, '')}/api/v1/uploads/stream`
  const es = new EventSource(url, { withCredentials: true })
  es.addEventListener('progress', (ev: MessageEvent) => {
    try { handlers.onProgress(JSON.parse(ev.data)) } catch {}
  })
  es.addEventListener('completed', (ev: MessageEvent) => {
    try { handlers.onCompleted(JSON.parse(ev.data)) } catch {}
  })
  if (handlers.onError) {
    es.addEventListener('error', (ev: MessageEvent) => {
      try { handlers.onError!(JSON.parse((ev as any).data)) } catch {}
    })
  }
  return es
}

export async function fetchDocuments() {
  const res = await fetch(`${BASE_URL}/documents`, { credentials: 'include' })
  if (!res.ok) throw new Error('Documents fetch failed')
  return res.json() as Promise<{ items: any[]; total: number }>
}

export async function patchDocument(id: string, patch: any) {
  const token = await getCsrfToken()
  const res = await fetch(`${BASE_URL}/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
    credentials: 'include',
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Patch failed')
  return res.json()
}

export async function approveDocumentApi(id: string) {
  const token = await getCsrfToken()
  const res = await fetch(`${BASE_URL}/documents/${encodeURIComponent(id)}/approve`, {
    method: 'POST', credentials: 'include', headers: token ? { 'x-csrf-token': token } as any : undefined
  })
  if (!res.ok) throw new Error('Approve failed')
  return res.json()
}

export async function rejectDocumentApi(id: string, reason?: string) {
  const token = await getCsrfToken()
  const res = await fetch(`${BASE_URL}/documents/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
    credentials: 'include',
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw new Error('Reject failed')
  return res.json()
}

export async function fetchAnalyticsOverview() {
  const res = await fetch(`${BASE_URL}/analytics/overview`, { credentials: 'include' })
  if (!res.ok) throw new Error('Overview failed')
  return res.json() as Promise<{ processed: number; pending: number; errors: number; today: number }>
}

export async function fetchDocumentsPerDay(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  const res = await fetch(`${BASE_URL}/analytics/documents-per-day?${qs.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Documents-per-day failed')
  return res.json() as Promise<{ items: Array<{ date: string; total: number; errors: number }> }>
}
