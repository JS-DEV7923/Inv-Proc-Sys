# Inv-Proc-Sys — Real-time Invoice Processing System
Modern full‑stack system for uploading, processing, and reviewing invoices with live progress updates, analytics, and a clean reviewer workflow.

## Overview / Problem Statement
Manual invoice processing is slow and opaque, especially during ingestion and review. Inv-Proc-Sys provides a streamlined experience to upload documents, monitor real-time processing progress, and quickly review results with actionable analytics. It’s designed for teams needing a developer-friendly, scalable starting point for invoice intake and processing pipelines.

## Features
- **Real-time uploads with SSE**: Live progress via `GET /api/v1/uploads/stream`.
- **Document review workflow**: Approve, reject, and patch metadata.
- **Analytics**: Overview metrics and per-day charts for processed/error trends.
- **Scalable architecture**: API Gateway + Background Worker with BullMQ on Redis.
- **S3-compatible storage**: Cloudflare R2 or S3 for uploaded files.
- **Secure by default**: CSRF token endpoint, session cookies, CORS, internal secret for worker → gateway.
- **Typed end-to-end**: TypeScript across frontend and backend.
- **Monorepo**: Clear separation between `frontend/`, `api-gateway/`, and `backend-core/`.

## Tech Stack
- **Frontend**
  - React (Vite)
  - Zustand (state)
  - TailwindCSS + shadcn/ui (UI)
  - Recharts (analytics)
  - pdfjs/react-pdf (viewer-ready)
- **Backend (API Gateway)**
  - Node.js, Express
  - TypeScript, ts-node + nodemon (dev)
  - SSE (Server-Sent Events)
- **Worker (Backend-Core)**
  - Node.js
  - BullMQ (Redis queue)
- **Data & Infra**
  - Redis (Upstash/Render or local)
  - Cloudflare R2 (S3-compatible)
  - Docker Compose (local dev for Redis & MinIO)
- **Tooling**
  - OpenAPI spec (`api-gateway/openapi.yaml`)
  - ESLint (frontend)
  - Vercel (frontend), Render (gateway + worker)

---

## ⚙️ Installation & Setup

> Prerequisites: Node.js >= 18, npm, Docker (for local infra), Git.

### 1) Clone the repo
```bash
git clone https://github.com/JS-DEV7923/Inv-Proc-Sys.git
cd Inv-Proc-Sys
```

### 2) Bring up local infra (Redis + MinIO for S3-compatible storage)
```bash
cd inv-proc-ui
docker compose up -d
# Services: redis, minio
```

### 3) API Gateway (dev)
```bash
cd api-gateway
cp .env.example .env
# Edit .env to your local values. For MinIO defaults, .env.example is ready.

npm ci
npm run dev
# -> http://localhost:4000
```

### 4) Backend-Core Worker (dev)
```bash
cd ../backend-core
cp .env.example .env
# Ensure REDIS_URL matches docker-compose Redis
# Ensure GATEWAY_URL is http://localhost:4000

npm ci
npm run dev
# Worker should log: "worker started"
```

### 5) Frontend (dev)
```bash
cd ../frontend
cp .env .env.local 2>/dev/null || true
# Set VITE_API_URL for local dev (default assumption)
# VITE_API_URL=http://localhost:4000/api/v1

npm ci
npm run dev
# -> http://localhost:5173
```

---

## 🚀 Usage / Demo

- Open the frontend: `http://localhost:5173`
  - Navigate to the Upload page.
  - Drop a PDF/PNG/JPG and watch live progress bars.
  - Check Dashboard for counts; History displays trends.

- API smoke tests:
```bash
# Health
curl -s http://localhost:4000/api/v1/health

# SSE stream (observe events)
curl -N http://localhost:4000/api/v1/uploads/stream

# Upload (adjust path to a local invoice file)
curl -i -X POST http://localhost:4000/api/v1/uploads \
  -F "file=@/path/to/invoice.pdf"
```

- Documents:
```bash
# List
curl -s http://localhost:4000/api/v1/documents | jq

# Patch a document
curl -s -X PATCH http://localhost:4000/api/v1/documents/<id> \
  -H "Content-Type: application/json" \
  --data '{"vendor":"Acme Inc."}'
```

- Analytics:
```bash
# Overview
curl -s http://localhost:4000/api/v1/analytics/overview | jq

# Per day
curl -s "http://localhost:4000/api/v1/analytics/documents-per-day?from=2024-01-01&to=2024-12-31" | jq
```

---

## 🔐 Configuration

Environment examples are provided:

- `inv-proc-ui/api-gateway/.env.example`
  - `PORT=4000`
  - `CORS_ORIGIN=http://localhost:5173`
  - `SESSION_SECRET=dev-secret-change-me`
  - `REDIS_URL=redis://localhost:6379`
  - S3-compatible (local MinIO or R2/S3):
    - `MINIO_ENDPOINT=localhost`
    - `MINIO_PORT=9000`
    - `MINIO_USE_SSL=false`
    - `MINIO_ACCESS_KEY=minioadmin`
    - `MINIO_SECRET_KEY=minioadmin`
    - `MINIO_BUCKET=invoices`
  - Worker auth:
    - `INTERNAL_EVENTS_SECRET=change-me`

- `inv-proc-ui/backend-core/.env.example`
  - `REDIS_URL=redis://localhost:6379`
  - `GATEWAY_URL=http://localhost:4000`
  - `INTERNAL_EVENTS_SECRET=change-me`

- `inv-proc-ui/frontend/.env` (create if missing)
  - `VITE_API_URL=http://localhost:4000/api/v1`

Production notes:
- On Render (API Gateway): set `NODE_ENV=production`, `CORS_ORIGIN=https://<your-vercel-app>.vercel.app`, secure session settings apply.
- On Vercel (Frontend): set `VITE_API_URL=https://<your-render-gateway>.onrender.com/api/v1`.
- On Render (Worker): set `GATEWAY_URL` and `INTERNAL_EVENTS_SECRET` to match gateway.

---

## 📡 API Reference

Base URL: `http://localhost:4000/api/v1`

- **Health**
  - `GET /health` → `{ ok: true }`

- **CSRF**
  - `GET /csrf` → `{ csrfToken: "<token>" }`
  - Frontend includes token in mutating calls.

- **Uploads**
  - `POST /uploads` (multipart `file`) → `{ uploadId, documentId, status }`
  - `GET /uploads/stream` (SSE) → events:
    - `progress`: `{ uploadId, progress, documentId? }`
    - `completed`: `{ uploadId, documentId }`

- **Documents**
  - `GET /documents` → `{ items: [...], total }`
  - `PATCH /documents/:id` → updates document metadata
  - `POST /documents/:id/approve`
  - `POST /documents/:id/reject`

- **Analytics**
  - `GET /analytics/overview` → `{ processed, pending, errors, today }`
  - `GET /analytics/documents-per-day?from=YYYY-MM-DD&to=YYYY-MM-DD`
    - `{ items: [{ date, total, errors }] }`

---

## 🗂 Folder Structure
```
Inv-Proc-Sys/
└─ inv-proc-ui/
   ├─ api-gateway/            # Express API, SSE, routes, config
   │  ├─ src/
   │  │  ├─ config/           # env, minio (S3), session
   │  │  ├─ middleware/       # CSRF, etc.
   │  │  ├─ routes/           # auth, uploads, documents, analytics, internal
   │  │  ├─ sse/              # SSE registry
   │  │  ├─ store/            # in-memory docs store
   │  │  └─ index.ts          # server entry
   │  ├─ openapi.yaml
   │  └─ .env.example
   ├─ backend-core/           # BullMQ worker
   │  ├─ src/
   │  │  ├─ queues/           # bullmq queue setup
   │  │  └─ index.ts          # worker entry
   │  └─ .env.example
   ├─ frontend/               # React + Vite app
   │  ├─ src/
   │  │  ├─ pages/            # Dashboard, Upload, Review, History, etc.
   │  │  ├─ store/            # Zustand store `docStore.ts`
   │  │  ├─ lib/              # API client `api.ts`
   │  │  └─ components/       # UI
   │  └─ public/
   ├─ docker-compose.yml      # Local Redis + MinIO
   └─ DECISIONS_LOG.md        # Architecture decisions
```

---

## 🧪 Testing
- Basic smoke testing is provided via the API curl commands above.
- Add your testing stack of choice (Vitest/Jest) for unit/integration tests.

---

## 🤝 Contributing Guidelines
- Fork the repository and create a feature branch.
- Keep changes focused and add helpful commit messages.
- Run locally and ensure no TypeScript errors before submitting PRs.
- For new APIs, update `api-gateway/openapi.yaml` and add basic usage notes.

---

## 📄 License
No license file is present. Unless a license is added, all rights are reserved by the author. Add a `LICENSE` file (e.g., MIT) to enable open-source contributions.

---

## 👤 Contact / Author
- GitHub: [@JS-DEV7923](https://github.com/JS-DEV7923)

If you need help deploying (Vercel + Render) or configuring Cloudflare R2/Upstash Redis, open an issue or reach out.
