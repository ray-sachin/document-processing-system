"""
Document Schemas
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class DocumentCreate(BaseModel):
    """Schema for document creation (internal use)."""
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    file_path: str
    mime_type: Optional[str] = None
    checksum: Optional[str] = None


class DocumentResponse(BaseModel):
    """Schema for document response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    file_size_human: str
    mime_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Include latest job status if available
    latest_job_status: Optional[str] = None
    latest_job_id: Optional[UUID] = None
    latest_job_progress: Optional[int] = None
    latest_job_stage: Optional[str] = None
    latest_job_error: Optional[str] = None


class DocumentListResponse(BaseModel):
    """Schema for paginated document list."""
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SortField(str, Enum):
    """Sort field enumeration."""
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    FILENAME = "original_filename"
    FILE_SIZE = "file_size"


class SortOrder(str, Enum):
    """Sort order enumeration."""
    ASC = "asc"
    DESC = "desc"


class DocumentFilter(BaseModel):
    """Schema for document filtering."""
    search: Optional[str] = Field(None, description="Search in filename")
    file_type: Optional[str] = Field(None, description="Filter by file type")
    status: Optional[str] = Field(None, description="Filter by latest job status")
    sort_by: SortField = Field(default=SortField.CREATED_AT)
    sort_order: SortOrder = Field(default=SortOrder.DESC)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
