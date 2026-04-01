"""
Celery Application Configuration
"""
from celery import Celery
from app.config import settings

# Create Celery app
celery_app = Celery(
    "document_processor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Result backend
    result_expires=3600,  # 1 hour
    
    # Worker settings
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
    
    # Task time limits
    task_soft_time_limit=settings.PROCESSING_TIMEOUT_SECONDS - 30,
    task_time_limit=settings.PROCESSING_TIMEOUT_SECONDS,
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=settings.MAX_RETRY_ATTEMPTS,
    
    # Beat schedule (if needed for periodic tasks)
    beat_schedule={
        # Example: cleanup old jobs
        # 'cleanup-old-jobs': {
        #     'task': 'app.worker.tasks.cleanup_old_jobs',
        #     'schedule': crontab(hour=0, minute=0),  # Daily at midnight
        # },
    },
)

# Optional: Configure task routes
celery_app.conf.task_routes = {
    "app.worker.tasks.process_document": {"queue": "documents"},
}

# Optional: Configure task queues
celery_app.conf.task_queues = {
    "documents": {
        "exchange": "documents",
        "routing_key": "document.#",
    },
}
