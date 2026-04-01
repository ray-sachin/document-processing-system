"""
Job Schemas
"""
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class JobResponse(BaseModel):
    """Schema for job response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    document_id: UUID
    user_id: UUID
    status: str
    progress: int
    current_stage: Optional[str] = None
    celery_task_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Include document info
    document_filename: Optional[str] = None


class JobListResponse(BaseModel):
    """Schema for paginated job list."""
    items: List[JobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class JobProgress(BaseModel):
    """Schema for job progress updates (Redis Pub/Sub)."""
    job_id: str
    event: str
    status: str
    stage: str
    progress: int
    message: str
    timestamp: datetime


class JobRetry(BaseModel):
    """Schema for job retry request."""
    reset_retry_count: bool = Field(default=False)


class JobStatusUpdate(BaseModel):
    """Schema for job status update (internal)."""
    status: str
    progress: int
    current_stage: Optional[str] = None
    error_message: Optional[str] = None


class ProgressEvent(BaseModel):
    """Schema for progress event data."""
    job_id: str
    event: str
    data: dict
