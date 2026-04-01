"""
Celery Tasks - Document Processing Tasks
"""
import json
import time
from datetime import datetime, timezone
from uuid import UUID
import redis

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded

from app.worker.celery_app import celery_app
from app.config import settings
from app.database import SyncSessionLocal
from app.models.job import Job, ProcessedResult, JobStatus, ProcessingStage
from app.models.document import Document


def get_redis_client():
    """Get a Redis client for Pub/Sub."""
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def publish_progress(job_id: str, stage: str, progress: int, message: str, status: str = "processing"):
    """Publish progress update to Redis Pub/Sub."""
    redis_client = get_redis_client()
    channel = f"{settings.PROGRESS_CHANNEL_PREFIX}:{job_id}"
    
    data = {
        "job_id": job_id,
        "event": "progress_update",
        "status": status,
        "stage": stage,
        "progress": progress,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    redis_client.publish(channel, json.dumps(data))
    redis_client.close()


def update_job_status(db, job: Job, status: str, progress: int, stage: str = None, error: str = None):
    """Update job status in database."""
    job.status = status
    job.progress = progress
    job.current_stage = stage
    job.updated_at = datetime.now(timezone.utc)
    
    if status == JobStatus.PROCESSING.value and job.started_at is None:
        job.started_at = datetime.now(timezone.utc)
    
    if status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
        job.completed_at = datetime.now(timezone.utc)
    
    if error:
        job.error_message = error
    
    db.commit()


@celery_app.task(bind=True, max_retries=3)
def process_document(self, job_id: str):
    """
    Main document processing task.
    
    This task orchestrates the document processing workflow:
    1. Document received
    2. Parsing started/completed
    3. Extraction started/completed
    4. Store result
    5. Job completed
    
    Publishes progress events to Redis Pub/Sub at each stage.
    """
    db = SyncSessionLocal()
    
    try:
        # Get job from database
        job = db.query(Job).filter(Job.id == UUID(job_id)).first()
        
        if not job:
            raise ValueError(f"Job not found: {job_id}")
        
        # Get associated document
        document = db.query(Document).filter(Document.id == job.document_id).first()
        
        if not document:
            raise ValueError(f"Document not found for job: {job_id}")
        
        # Stage 1: Document Received (10%)
        publish_progress(job_id, ProcessingStage.DOCUMENT_RECEIVED.value, 10, 
                        f"Document received: {document.original_filename}")
        update_job_status(db, job, JobStatus.PROCESSING.value, 10, 
                         ProcessingStage.DOCUMENT_RECEIVED.value)
        time.sleep(0.5)  # Simulate work
        
        # Stage 2: Parsing Started (20%)
        publish_progress(job_id, ProcessingStage.PARSING_STARTED.value, 20,
                        "Starting document parsing...")
        update_job_status(db, job, JobStatus.PROCESSING.value, 20,
                         ProcessingStage.PARSING_STARTED.value)
        
        # Get the appropriate processor for the file type
        from app.worker.processors import get_processor
        processor = get_processor(document.file_type)
        
        # Read file content
        file_path = f"{settings.STORAGE_PATH}/{document.file_path}"
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # Parse the document
        time.sleep(1)  # Simulate parsing time
        parsed_content = processor.parse(file_content, document.original_filename)
        
        # Stage 3: Parsing Completed (40%)
        publish_progress(job_id, ProcessingStage.PARSING_COMPLETED.value, 40,
                        "Document parsing completed")
        update_job_status(db, job, JobStatus.PROCESSING.value, 40,
                         ProcessingStage.PARSING_COMPLETED.value)
        time.sleep(0.5)
        
        # Stage 4: Extraction Started (50%)
        publish_progress(job_id, ProcessingStage.EXTRACTION_STARTED.value, 50,
                        "Starting field extraction...")
        update_job_status(db, job, JobStatus.PROCESSING.value, 50,
                         ProcessingStage.EXTRACTION_STARTED.value)
        
        # Extract structured data
        time.sleep(1.5)  # Simulate extraction time
        extracted_data = processor.extract(parsed_content, document)
        
        # Stage 5: Extraction Completed (80%)
        publish_progress(job_id, ProcessingStage.EXTRACTION_COMPLETED.value, 80,
                        "Field extraction completed")
        update_job_status(db, job, JobStatus.PROCESSING.value, 80,
                         ProcessingStage.EXTRACTION_COMPLETED.value)
        time.sleep(0.5)
        
        # Stage 6: Storing Result (90%)
        publish_progress(job_id, ProcessingStage.STORING_RESULT.value, 90,
                        "Storing processed result...")
        update_job_status(db, job, JobStatus.PROCESSING.value, 90,
                         ProcessingStage.STORING_RESULT.value)
        
        # Upsert processed result so retries do not fail on an existing row.
        result = db.query(ProcessedResult).filter(ProcessedResult.job_id == job.id).first()

        if result is None:
            result = ProcessedResult(
                job_id=job.id,
                document_id=document.id,
            )
            db.add(result)

        result.document_id = document.id
        result.extracted_title = extracted_data.get("title")
        result.extracted_category = extracted_data.get("category")
        result.extracted_summary = extracted_data.get("summary")
        result.extracted_keywords = extracted_data.get("keywords")
        result.extracted_metadata = extracted_data.get("metadata")
        result.raw_text = extracted_data.get("raw_text")
        result.structured_data = extracted_data.get("structured_data")

        db.commit()
        db.refresh(result)
        time.sleep(0.5)
        
        # Stage 7: Job Completed (100%)
        publish_progress(job_id, ProcessingStage.JOB_COMPLETED.value, 100,
                        "Processing completed successfully", JobStatus.COMPLETED.value)
        update_job_status(db, job, JobStatus.COMPLETED.value, 100,
                         ProcessingStage.JOB_COMPLETED.value)
        
        return {
            "job_id": job_id,
            "status": "completed",
            "result_id": str(result.id)
        }
        
    except SoftTimeLimitExceeded:
        # Handle timeout
        publish_progress(job_id, ProcessingStage.JOB_FAILED.value, -1,
                        "Processing timed out", JobStatus.FAILED.value)
        update_job_status(db, job, JobStatus.FAILED.value, job.progress,
                         ProcessingStage.JOB_FAILED.value, "Processing timed out")
        raise
        
    except Exception as e:
        # Handle error
        error_message = str(e)
        publish_progress(job_id, ProcessingStage.JOB_FAILED.value, -1,
                        f"Processing failed: {error_message}", JobStatus.FAILED.value)
        
        if job:
            update_job_status(db, job, JobStatus.FAILED.value, job.progress,
                             ProcessingStage.JOB_FAILED.value, error_message)
        
        # Retry if under max retries
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        
        raise
        
    finally:
        db.close()
