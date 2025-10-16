import { createUploadWorker } from './queues/bullmq'

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000'
const INTERNAL_SECRET = process.env.INTERNAL_EVENTS_SECRET || 'dev-internal-secret'

export async function startUploadWorker() {
  createUploadWorker(async (data: any) => {
    const { uploadId, documentId, objectKey, userId } = data
    // Simulate progress
    for (let p = 10; p <= 100; p += Math.floor(Math.random() * 25) + 10) {
      await postEvent(userId, 'progress', { uploadId, documentId, progress: Math.min(p, 100) })
      await delay(700)
    }
    // Simulate completion
    await postEvent(userId, 'completed', {
      uploadId,
      documentId,
      status: 'Processed',
      processingMs: Math.floor(Math.random() * 7000) + 1500,
      objectKey,
    })
  })
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function postEvent(userId: string, event: string, data: any) {
  await fetch(`${GATEWAY_URL}/api/v1/internal/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
    body: JSON.stringify({ userId, event, data }),
  }).catch(() => {})
}
