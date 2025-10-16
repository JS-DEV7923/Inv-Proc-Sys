import IORedis from 'ioredis'
import { Worker, Queue } from 'bullmq'

export const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null as any,
})

export const uploadQueue = new Queue('ocr-extract', { connection })

export function createUploadWorker(processor: (data: any) => Promise<void>) {
  const worker = new Worker('ocr-extract', async job => {
    await processor(job.data)
  }, { connection })
  return worker
}
