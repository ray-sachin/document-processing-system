# Deployment Guide

## Recommended Hosting Shape

This project is easiest to deploy as a single Docker-hosted application stack with an external PostgreSQL database.

Recommended split:

- Supabase: PostgreSQL only
- App host: Nginx, frontend, backend, Celery worker, Redis

This architecture matches the app design because the worker and Redis need to stay online alongside the API.

## What You Need

### Database

From Supabase:

- `DATABASE_URL`
- `SYNC_DATABASE_URL`

Use:

- `DATABASE_URL` with `postgresql+asyncpg://...`
- `SYNC_DATABASE_URL` with `postgresql://...`

### Secrets

- `SECRET_KEY`

Generate a strong secret, for example with Python:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Allowed origin

- `CORS_ORIGINS`

For example:

```env
CORS_ORIGINS=https://your-domain.example
```

### Optional frontend runtime variables

For same-origin deployment behind Nginx, leave these empty:

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
```

The frontend will then use relative `/api` routes and browser-derived WebSocket URLs automatically.

## Deployment Files

Use:

- `docker-compose.deploy.yml`
- `.env` populated with production values

## Production Environment Example

```env
DATABASE_URL=postgresql+asyncpg://postgres:<password>@db.<project>.supabase.co:5432/postgres
SYNC_DATABASE_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
SECRET_KEY=<strong-secret>
CORS_ORIGINS=https://your-live-domain.example
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
```

## Deployment Steps

### 1. Prepare the host

Install:

- Docker
- Docker Compose

Confirm the daemon is running:

```bash
docker info
```

### 2. Add production environment values

Create or update `.env` in the repo root with production values.

### 3. Build and start the stack

```bash
docker compose -f docker-compose.deploy.yml up -d --build
```

### 4. Verify services

Check running containers:

```bash
docker compose -f docker-compose.deploy.yml ps
```

Check backend health/docs:

- `http://<your-host>:8000/docs` if exposed directly
- or through your Nginx domain if proxied

### 5. Smoke-test the product

Run this path end to end:

1. Register
2. Login
3. Upload one PDF and one image
4. Confirm processing progresses
5. Open the result detail page
6. Edit and finalize the record
7. Export JSON and CSV

## Free Hosting Reality Check

Because this app needs:

- frontend
- backend
- Celery worker
- Redis

there is no truly frictionless free-tier deployment that fits every service perfectly.

### Best practical free/low-cost options

- A single small VPS with Docker
- Railway/Render/Fly if you already have account access and enough service quotas

### What does not fit alone

- Vercel by itself is not enough for this architecture because the worker and Redis need persistent runtime support.

## Deploying Through Codex

If you want me to deploy it directly from this environment, I need one of these:

### Option 1: authenticated tooling on this machine

- `supabase` CLI or direct database URLs
- deployment provider CLI already logged in
- or SSH access to your server

### Option 2: explicit credentials

- Supabase `DATABASE_URL`
- Supabase `SYNC_DATABASE_URL`
- hosting provider token or SSH details
- production domain or subdomain choice
- `SECRET_KEY`

Without one of those, I can finish the deployment config and documentation, but I cannot complete the actual live deployment from this session.
