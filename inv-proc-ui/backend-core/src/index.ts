import { startUploadWorker } from './worker'

async function main() {
  console.log('[backend-core] starting worker')
  await startUploadWorker()
  console.log('[backend-core] worker started')
}

main().catch((e) => {
  console.error('[backend-core] fatal', e)
  process.exit(1)
})
