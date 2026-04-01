# System Architecture

## Overview

The application is an asynchronous document workflow system built around four ideas:

1. The API should return quickly after intake.
2. Long-running extraction work should happen in the background.
3. Users should be able to see progress while work is happening.
4. Results should remain editable and exportable after processing completes.

## End-to-End Flow

### 1. User authentication

- The frontend authenticates with the FastAPI backend using JWT access and refresh tokens.
- Auth state is stored on the client and attached to API requests through the shared Axios client.

### 2. Document intake

- A user uploads one or more files from the `Upload` workspace.
- `POST /api/documents/upload` validates file size and extension.
- The backend stores the file through the storage service and creates:
  - one `documents` row
  - one `jobs` row
- The backend then enqueues a Celery task for each document.

### 3. Background processing

- Celery workers pull queued jobs from Redis.
- The worker loads the stored file, selects a processor based on file type, and moves through these stages:
  - `document_received`
  - `parsing_started`
  - `parsing_completed`
  - `extraction_started`
  - `extraction_completed`
  - `storing_result`
  - `job_completed` or `job_failed`
- Each stage updates the database and publishes a Redis Pub/Sub progress event.

### 4. Parsing and extraction

Each processor has two responsibilities:

- `parse()`: extract raw text and file-level metadata
- `extract()`: convert that output into structured fields used by the product

Current processors:

- `TextProcessor` for `.txt`
- `CSVProcessor` for `.csv`
- `DocxProcessor` for `.docx` and `.doc`
- `PDFProcessor` for `.pdf`
- `ImageProcessor` for common image formats

## OCR Strategy

The OCR path is designed to be robust for mixed evaluator input rather than limited to clean digital PDFs.

### Images

- Image files are routed through `ImageProcessor`.
- `OCRService` prepares multiple variants of the same image:
  - original
  - grayscale
  - high-contrast
  - sharpened
  - thresholded
  - rotated variants
- RapidOCR runs against those variants and the best result is selected.
- If no reliable text is detected, the document still completes processing using file metadata and filename-derived context instead of fabricated text.

### PDFs

`PDFProcessor` uses a tiered extraction approach:

1. `pypdf` for embedded text
2. `PyMuPDF` text-layer extraction for PDFs where `pypdf` is weak
3. RapidOCR on rendered page images for scanned or image-heavy PDFs

This keeps the workflow fast for digital PDFs while still recovering text from scans.

## Real-Time Progress

Progress visibility is implemented through Redis Pub/Sub plus live UI updates.

### Worker side

- The Celery task publishes progress payloads to Redis channels keyed by job ID.
- The same task updates the `jobs` table with status, progress, stage, timestamps, and any error message.

### Application side

- FastAPI exposes:
  - WebSocket progress streaming
  - SSE progress fallback
- The frontend also refetches active jobs/documents on a short interval so the dashboard stays current even if a socket reconnect is needed.

## Review and Finalization

Once processing completes:

- a `processed_results` row is stored for the job
- the document detail page loads the result
- users can:
  - review extracted fields
  - edit title, category, summary, and keywords
  - finalize the record
  - export the record individually

The worker now upserts the result row so retries do not break if a partially stored result already exists.

## Export Flow

The export subsystem supports:

- batch JSON export
- batch CSV export
- single-result JSON export
- single-result CSV export

Exports are filtered by user ownership, and batch exports can be restricted to finalized records only.

## Data Model

### `documents`

Stores file metadata and storage location.

Key fields:

- `id`
- `user_id`
- `original_filename`
- `file_type`
- `file_size`
- `file_path`
- `checksum`

### `jobs`

Tracks background workflow execution for each document.

Key fields:

- `id`
- `document_id`
- `user_id`
- `status`
- `progress`
- `current_stage`
- `celery_task_id`
- `error_message`
- `retry_count`

### `processed_results`

Stores structured extraction output for review and export.

Key fields:

- `job_id`
- `document_id`
- `extracted_title`
- `extracted_category`
- `extracted_summary`
- `extracted_keywords`
- `extracted_metadata`
- `raw_text`
- `structured_data`
- `is_finalized`

## Frontend Structure

### App Router pages

- `/` landing page
- `/login` and `/register`
- `/documents` dashboard
- `/documents/[id]` detail and review
- `/upload` intake workspace
- `/exports` delivery workspace

### Key frontend layers

- `src/app`: route-level screens
- `src/components`: reusable UI and workflow components
- `src/hooks`: data fetching and interaction hooks
- `src/store`: auth and document state with Zustand
- `src/lib`: API client, runtime URL resolution, utility helpers

## Backend Structure

### API layer

- `app/api`: FastAPI route modules

### Business services

- `app/services`: storage, OCR, and domain services

### Persistence

- `app/models`: SQLAlchemy models
- `app/schemas`: request/response validation

### Background execution

- `app/worker`: Celery app, task orchestration, file processors

### Progress messaging

- `app/pubsub`: publish/subscribe helpers for job progress events

## Deployment Shape

The intended production shape is:

- Next.js frontend
- FastAPI backend
- Celery worker
- Redis
- Supabase PostgreSQL
- Nginx as reverse proxy

This keeps PostgreSQL managed externally while the application runtime stays containerized and portable.
