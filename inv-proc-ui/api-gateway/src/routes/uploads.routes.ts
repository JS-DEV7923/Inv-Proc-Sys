import { Router } from 'express'
import multer from 'multer'
import { minio } from '../config/minio'
import { uploadQueue, type UploadJob } from '../queues/bullmq'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// POST /uploads - multipart form-data with file
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' })
    const userId = (req.session as any)?.user?.id || 'anon'
    const documentId = `doc_${uuidv4()}`
    const objectKey = `${userId}/${documentId}/${req.file.originalname}`

    await minio.putObject(
      process.env.MINIO_BUCKET || 'invoices',
      objectKey,
      req.file.buffer,
      req.file.size,
      { 'Content-Type': req.file.mimetype }
    )

    const uploadId = `up_${uuidv4()}`
    const job: UploadJob = { uploadId, documentId, objectKey, userId }
    await uploadQueue.add('process', job, { removeOnComplete: 100, removeOnFail: 100 })

    return res.status(201).json({ uploadId, documentId, status: 'Pending' })
  } catch (e: any) {
    return res.status(500).json({ error: 'Upload failed', detail: e?.message || String(e) })
  }
})

// GET /uploads/:id - status/progress (stub)
router.get('/:id', async (req, res) => {
  return res.status(200).json({ id: req.params.id, status: 'Pending', progress: 0 })
})

// GET /uploads - inflight jobs (stub)
router.get('/', async (_req, res) => {
  return res.status(200).json({ uploads: [] })
})

export default router
