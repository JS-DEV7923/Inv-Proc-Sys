import { Queue } from 'bullmq'
import { env } from '../config/env'
import IORedis from 'ioredis'

export const connection = new IORedis(env.REDIS_URL)

export const uploadQueue = new Queue('ocr-extract', { connection })

export type UploadJob = {
  uploadId: string
  documentId: string
  objectKey: string
  userId: string
}
