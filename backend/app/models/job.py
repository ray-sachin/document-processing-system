"""
Job and ProcessedResult Models
"""
import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    """Return current UTC time."""
    return datetime.now(timezone.utc)


class JobStatus(str, Enum):
    """Job status enumeration."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ProcessingStage(str, Enum):
    """Processing stage enumeration."""
    DOCUMENT_RECEIVED = "document_received"
    PARSING_STARTED = "parsing_started"
    PARSING_COMPLETED = "parsing_completed"
    EXTRACTION_STARTED = "extraction_started"
    EXTRACTION_COMPLETED = "extraction_completed"
    STORING_RESULT = "storing_result"
    JOB_COMPLETED = "job_completed"
    JOB_FAILED = "job_failed"


class Job(Base):
    """Job model for processing tasks."""
    
    __tablename__ = "jobs"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(Uuid(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Status tracking
    status = Column(String(50), nullable=False, default=JobStatus.QUEUED.value, index=True)
    progress = Column(Integer, default=0)  # 0-100
    current_stage = Column(String(100), nullable=True)
    
    # Celery integration
    celery_task_id = Column(String(255), nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="jobs")
    user = relationship("User", back_populates="jobs")
    result = relationship("ProcessedResult", back_populates="job", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Job {self.id} - {self.status}>"


class ProcessedResult(Base):
    """Processed result model for extracted data."""
    
    __tablename__ = "processed_results"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, nullable=False)
    document_id = Column(Uuid(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    # Extracted fields
    extracted_title = Column(String(500), nullable=True)
    extracted_category = Column(String(100), nullable=True)
    extracted_summary = Column(Text, nullable=True)
    extracted_keywords = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # List of keywords
    extracted_metadata = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # Additional metadata
    
    # Raw content
    raw_text = Column(Text, nullable=True)  # Extracted text content
    structured_data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # Any structured output
    
    # Finalization
    is_finalized = Column(Boolean, default=False)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    finalized_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="result")
    
    def __repr__(self):
        return f"<ProcessedResult {self.id} - finalized={self.is_finalized}>"
    
    def to_export_dict(self) -> dict:
        """Convert to dictionary for export."""
        return {
            "id": str(self.id),
            "job_id": str(self.job_id),
            "document_id": str(self.document_id),
            "title": self.extracted_title,
            "category": self.extracted_category,
            "summary": self.extracted_summary,
            "keywords": self.extracted_keywords or [],
            "metadata": self.extracted_metadata or {},
            "is_finalized": self.is_finalized,
            "finalized_at": self.finalized_at.isoformat() if self.finalized_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
