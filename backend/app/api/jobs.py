"""
Jobs API Routes
"""
import math
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import selectinload
import asyncio
import json

from app.api.deps import DbSession, CurrentUser
from app.models.job import Job, JobStatus
from app.models.document import Document
from app.schemas.job import JobResponse, JobListResponse, JobRetry
from app.config import settings


router = APIRouter()


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


@router.get("", response_model=JobListResponse)
async def list_jobs(
    db: DbSession,
    current_user: CurrentUser,
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    """List all jobs for the current user."""
    # Base query
    query = select(Job).where(Job.user_id == current_user.id)
    count_query = select(func.count(Job.id)).where(Job.user_id == current_user.id)
    
    # Filter by status
    if status_filter:
        query = query.where(Job.status == status_filter)
        count_query = count_query.where(Job.status == status_filter)
    
    # Order by created_at descending
    query = query.order_by(desc(Job.created_at))
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).options(selectinload(Job.document))
    
    # Execute query
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    # Build response
    items = []
    for job in jobs:
        job_response = JobResponse(
            id=job.id,
            document_id=job.document_id,
            user_id=job.user_id,
            status=job.status,
            progress=job.progress,
            current_stage=job.current_stage,
            celery_task_id=job.celery_task_id,
            error_message=job.error_message,
            retry_count=job.retry_count,
            started_at=job.started_at,
            completed_at=job.completed_at,
            created_at=job.created_at,
            updated_at=job.updated_at,
            document_filename=job.document.original_filename if job.document else None
        )
        items.append(job_response)
    
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return JobListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: UUID,
    db: DbSession,
    current_user: CurrentUser
):
    """Get a specific job by ID."""
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id, Job.user_id == current_user.id)
        .options(selectinload(Job.document))
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return JobResponse(
        id=job.id,
        document_id=job.document_id,
        user_id=job.user_id,
        status=job.status,
        progress=job.progress,
        current_stage=job.current_stage,
        celery_task_id=job.celery_task_id,
        error_message=job.error_message,
        retry_count=job.retry_count,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        document_filename=job.document.original_filename if job.document else None
    )


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(
    job_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
    retry_data: JobRetry = None
):
    """Retry a failed job."""
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id, Job.user_id == current_user.id)
        .options(selectinload(Job.document))
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Only allow retry for failed or cancelled jobs
    if job.status not in [JobStatus.FAILED.value, JobStatus.CANCELLED.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot retry job with status: {job.status}"
        )
    
    # Check max retry attempts
    if job.retry_count >= settings.MAX_RETRY_ATTEMPTS and not (retry_data and retry_data.reset_retry_count):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum retry attempts ({settings.MAX_RETRY_ATTEMPTS}) reached"
        )
    
    # Reset job for retry
    if retry_data and retry_data.reset_retry_count:
        job.retry_count = 0
    else:
        job.retry_count += 1
    
    job.status = JobStatus.QUEUED.value
    job.progress = 0
    job.current_stage = None
    job.error_message = None
    job.started_at = None
    job.completed_at = None
    job.updated_at = utcnow()
    
    await db.commit()
    await db.refresh(job)
    
    # Re-queue the celery task
    from app.worker.tasks import process_document
    task = process_document.delay(str(job.id))
    
    job.celery_task_id = task.id
    await db.commit()
    await db.refresh(job)
    
    return JobResponse(
        id=job.id,
        document_id=job.document_id,
        user_id=job.user_id,
        status=job.status,
        progress=job.progress,
        current_stage=job.current_stage,
        celery_task_id=job.celery_task_id,
        error_message=job.error_message,
        retry_count=job.retry_count,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        document_filename=job.document.original_filename if job.document else None
    )


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: UUID,
    db: DbSession,
    current_user: CurrentUser
):
    """Cancel a processing job."""
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id, Job.user_id == current_user.id)
        .options(selectinload(Job.document))
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Only allow cancel for queued or processing jobs
    if job.status not in [JobStatus.QUEUED.value, JobStatus.PROCESSING.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job with status: {job.status}"
        )
    
    # Revoke celery task if exists
    if job.celery_task_id:
        from app.worker.celery_app import celery_app
        celery_app.control.revoke(job.celery_task_id, terminate=True)
    
    # Update job status
    job.status = JobStatus.CANCELLED.value
    job.completed_at = utcnow()
    job.updated_at = utcnow()
    
    await db.commit()
    await db.refresh(job)
    
    return JobResponse(
        id=job.id,
        document_id=job.document_id,
        user_id=job.user_id,
        status=job.status,
        progress=job.progress,
        current_stage=job.current_stage,
        celery_task_id=job.celery_task_id,
        error_message=job.error_message,
        retry_count=job.retry_count,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        document_filename=job.document.original_filename if job.document else None
    )


@router.get("/{job_id}/progress")
async def get_job_progress_sse(
    job_id: UUID,
    request: Request,
    db: DbSession,
    current_user: CurrentUser
):
    """
    Server-Sent Events endpoint for job progress.
    This is a fallback for when WebSocket is not available.
    """
    # Verify job exists and belongs to user
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    async def event_generator():
        """Generate SSE events for job progress."""
        import redis.asyncio as redis_async
        
        redis_client = redis_async.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        
        pubsub = redis_client.pubsub()
        channel = f"{settings.PROGRESS_CHANNEL_PREFIX}:{job_id}"
        
        await pubsub.subscribe(channel)
        
        try:
            # Send initial status
            yield f"data: {json.dumps({'status': job.status, 'progress': job.progress, 'stage': job.current_stage})}\n\n"
            
            # Listen for updates
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                
                if message and message["type"] == "message":
                    yield f"data: {message['data']}\n\n"
                
                # Check if job is complete
                result = await db.execute(select(Job).where(Job.id == job_id))
                current_job = result.scalar_one_or_none()
                
                if current_job and current_job.status in [
                    JobStatus.COMPLETED.value,
                    JobStatus.FAILED.value,
                    JobStatus.CANCELLED.value
                ]:
                    yield f"data: {json.dumps({'status': current_job.status, 'progress': current_job.progress, 'stage': 'completed', 'final': True})}\n\n"
                    break
                
                await asyncio.sleep(0.5)
                
        finally:
            await pubsub.unsubscribe(channel)
            await redis_client.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
