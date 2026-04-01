"""
Processed Result Schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ProcessedResultResponse(BaseModel):
    """Schema for processed result response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    job_id: UUID
    document_id: UUID
    extracted_title: Optional[str] = None
    extracted_category: Optional[str] = None
    extracted_summary: Optional[str] = None
    extracted_keywords: Optional[List[str]] = None
    extracted_metadata: Optional[Dict[str, Any]] = None
    raw_text: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None
    is_finalized: bool
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ProcessedResultUpdate(BaseModel):
    """Schema for updating processed result."""
    extracted_title: Optional[str] = Field(None, max_length=500)
    extracted_category: Optional[str] = Field(None, max_length=100)
    extracted_summary: Optional[str] = None
    extracted_keywords: Optional[List[str]] = None
    extracted_metadata: Optional[Dict[str, Any]] = None
    structured_data: Optional[Dict[str, Any]] = None


class FinalizeRequest(BaseModel):
    """Schema for finalizing a result."""
    confirm: bool = Field(..., description="Must be true to finalize")
