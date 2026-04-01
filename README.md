# Document Processing Workflow System

Production-style full-stack document workflow for asynchronous processing, live progress tracking, review/finalization, and JSON/CSV export.

## What This Project Covers

- Multi-file upload for PDF, DOCX, TXT, CSV, PNG, JPG, and JPEG
- Background processing with Celery workers
- Progress updates through Redis Pub/Sub and WebSocket/SSE delivery
- Review and edit flow for extracted fields
- Finalization workflow before export
- Batch and single-record export in JSON or CSV
- JWT authentication with access and refresh tokens
- Dockerized local stack plus a deployment compose file for external PostgreSQL

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, React Query, Zustand
- Backend: FastAPI, SQLAlchemy, Pydantic
- Queue and messaging: Celery + Redis
- Database: PostgreSQL in local/full-stack mode, Supabase PostgreSQL in deployment mode
- Reverse proxy: Nginx

## Architecture

```text
Next.js UI
  -> FastAPI API
  -> PostgreSQL for document, job, result, and auth data
  -> Redis for Celery broker/result backend + Pub/Sub progress events
  -> Celery worker for background document processing
```

Core flow:

1. User uploads one or more documents.
2. API stores metadata, creates a queued job, and schedules background work.
3. Worker publishes progress events while parsing and extracting fields.
4. Frontend listens over WebSocket, with SSE available as fallback.
5. User reviews and edits extracted fields, finalizes the result, and exports it.

## Project Layout

```text
document-processing-system/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── pubsub/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── worker/
│   ├── alembic/
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/
│   │   └── types/
│   └── __tests__/
├── nginx/
├── sample-files/
├── sample-outputs/
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.deploy.yml
└── .env.example
```

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Redis available locally on `localhost:6379`
- Docker Desktop if you want the full containerized stack

### 1. Environment

Copy the example file and adjust values as needed:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2. Full Local Stack with Docker

This mode uses the bundled PostgreSQL and Redis services.

```bash
docker compose up -d --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- Nginx proxy: `http://localhost`
- Flower: `http://localhost:5555` when started with the `monitoring` profile

Optional monitoring:

```bash
docker compose --profile monitoring up -d flower
```

### 3. Local Development Split Mode

Use Docker only for infra:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Worker:

```bash
cd backend
venv\Scripts\activate
celery -A app.worker.celery_app worker --loglevel=info
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Verification

### Backend

Backend tests now run against SQLite for portability, so they do not require a local PostgreSQL instance:

```bash
cd backend
venv\Scripts\activate
python -m pytest tests -q
```

### Frontend

```bash
cd frontend
npm test
npm run build
```

Verified during this cleanup pass:

- `23` backend tests passing
- `13` frontend tests passing
- production `npm run build` passing

## Key Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Documents

- `POST /api/documents/upload`
- `GET /api/documents`
- `GET /api/documents/{id}`
- `DELETE /api/documents/{id}`

### Jobs

- `GET /api/jobs`
- `GET /api/jobs/{id}`
- `POST /api/jobs/{id}/retry`
- `POST /api/jobs/{id}/cancel`
- `GET /api/jobs/{id}/progress`
- `GET /ws/progress/{job_id}`

### Results and Export

- `GET /api/results/{job_id}`
- `PUT /api/results/{job_id}`
- `POST /api/results/{job_id}/finalize`
- `GET /api/export/json`
- `GET /api/export/csv`
- `GET /api/export/{job_id}/json`
- `GET /api/export/{job_id}/csv`

## Environment Notes

Important variables:

- `DATABASE_URL`: async SQLAlchemy connection string
- `SYNC_DATABASE_URL`: sync SQLAlchemy connection string for Celery
- `REDIS_URL`: Redis connection string
- `CELERY_BROKER_URL`: Celery broker
- `CELERY_RESULT_BACKEND`: Celery result backend
- `SECRET_KEY`: JWT signing key
- `CORS_ORIGINS`: comma-separated allowed origins
- `NEXT_PUBLIC_API_URL`: optional public API base URL; leave empty for same-origin `/api`
- `NEXT_PUBLIC_WS_URL`: optional public WebSocket base URL; leave empty to derive from browser location

## Deployment

### Target Shape

Deployment is set up for:

- Single Docker-hosted application stack
- Supabase-hosted PostgreSQL
- Redis running in the app stack

### Compose File for External PostgreSQL

Use `docker-compose.deploy.yml` when the database is hosted outside the stack:

```bash
docker compose -f docker-compose.deploy.yml up -d --build
```

Required deployment env values:

```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>:5432/<db>
SYNC_DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>
SECRET_KEY=<strong-secret>
CORS_ORIGINS=https://your-frontend-domain
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
```

For same-origin deployment behind Nginx, leave `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` empty so the frontend uses relative `/api` and browser-derived WebSocket URLs.

### Supabase

Supabase is intended for PostgreSQL hosting only in this setup. Auth, file storage, and background job orchestration remain inside the application.

## Assumptions

- Single-tenant user-scoped app
- Background processing architecture is the main evaluation target, not OCR quality
- Local file storage is acceptable for the project unless object storage is explicitly needed
- Export happens after review/finalization, but batch export can still be filtered by finalized status

## Tradeoffs

- Celery + Redis is heavier than a simpler queue, but fits the assignment requirement and gives retry orchestration
- Tests use SQLite for portability, while production remains PostgreSQL-first
- Frontend client defaults to same-origin APIs for easier reverse-proxy deployment
- Document parsing is intentionally pragmatic and assignment-scoped rather than OCR-heavy

## Limitations

- No rate limiting
- No email verification
- No role-based access control
- File storage defaults to the local filesystem
- Docker runtime verification depends on Docker daemon availability on the host

## AI Usage Note

AI tooling was used during development and polish to accelerate implementation, debugging, test repair, documentation cleanup, and UI refinement. The resulting code was manually reviewed, tested, and adjusted to fit the project requirements.
