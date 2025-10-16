# Decisions Log

- [2025-10-16] Theme: Switched to black + neon via CSS vars in `frontend/src/index.css`. Reason: requested funky aesthetic; centralized theming avoids per-component edits.
- [2025-10-16] Charts: Neon palette in `frontend/src/pages/History.tsx` for visual consistency.
- [2025-10-16] Auth UI: Added `Login.tsx` and `Signup.tsx` using react-hook-form + zod. Reason: fast client validation with minimal deps.
- [2025-10-16] Subscribe UI: Added `Subscribe.tsx` (email only). Reason: future newsletter integration.
- [2025-10-16] Project layout: Chosen Option B. Moved frontend into `inv-proc-ui/frontend/` and created `inv-proc-ui/backend/` for API.
- [2025-10-16] API gateway stack: Node.js + Express, cookie-based auth, SSE for realtime, MinIO for storage, BullMQ for processing. Reason: predictable DX, compatibility with SPA, S3-compat storage, robust queuing.
- [2025-10-16] API design: Versioned `/api/v1`, RFC7807 errors, pagination/sort/filter query params. Reason: forward compatibility and consistency.
- [2025-10-16] Realtime: SSE for upload progress. Reason: simpler than WS, adequate for one-way progress events.
- [2025-10-16] Security: Session cookies (httpOnly, Secure), CSRF on mutating requests, CORS restricted to frontend origin. Reason: browser safety and least privilege.
- [2025-10-16] Storage: MinIO bucket per environment, server-side multipart ingest. Reason: avoids exposing secrets; can switch to presigned uploads later.
- [2025-10-16] Queue: BullMQ + Redis for OCR/extraction pipeline. Reason: retry/backoff and progress reporting support.
- [2025-10-16] Server split refinement: Renamed `backend/` to `api-gateway/` and created `backend-core/` for workers/business logic to support independent deploys and scaling.
- [2025-10-16] API route scaffolds: Added placeholder routers for `auth`, `uploads`, `documents`, `analytics`, `settings`, `integrations`, `users`, and `subscriptions` under `api-gateway/src/routes/` and mounted them in `api-gateway/src/index.ts`. Reason: enforce clean separation and incremental implementation.
- [2025-10-16] SSE registry: Centralized SSE client registry with heartbeat in `api-gateway/src/sse/registry.ts`. Reason: reliable one-way progress events for uploads.
- [2025-10-16] Sessions: Cookie sessions backed by Redis in `api-gateway/src/config/session.ts`. Reason: secure browser auth with server-managed session.

- [2025-10-16] Dev runtime: Switched API Gateway and Backend-Core dev to CommonJS + `ts-node` with `nodemon`. Reason: avoid ESM loader instability during local dev.
- [2025-10-16] Docker install: Installed Docker from official repo and started Redis + MinIO via `docker compose` using `inv-proc-ui/docker-compose.yml`. Reason: reliable local infra.
- [2025-10-16] Internal events: Added `/api/v1/internal/events` for worker-to-gateway SSE broadcasts. Reason: decouple background processing from client connections.
- [2025-10-16] Documents store: Added shared in-memory store `api-gateway/src/store/documents.ts`. Reason: single source of truth during dev before DB.
- [2025-10-16] Documents API: Implemented list/get/patch/approve/reject in `api-gateway/src/routes/documents.routes.ts`. Reason: enable Review/Dashboard to be API-driven.
- [2025-10-16] Analytics API: Implemented overview and per-day endpoints in `api-gateway/src/routes/analytics.routes.ts`. Reason: power Dashboard metrics from backend.
- [2025-10-16] Storage/Queue scaffolds: MinIO client (`api-gateway/src/config/minio.ts`) and BullMQ queue (`api-gateway/src/queues/bullmq.ts`), plus backend-core BullMQ scaffold at `backend-core/src/queues/bullmq.ts`. Reason: prepare for upload ingest and async processing.
- [2025-10-16] OpenAPI: Seeded `api-gateway/openapi.yaml` to document endpoints and guide future client/server integration.
