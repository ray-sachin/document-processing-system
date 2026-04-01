"""
Export Schemas
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


class ExportItem(BaseModel):
    """Schema for a single export item."""
    id: str
    job_id: str
    document_id: str
    document_filename: str
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    keywords: List[str] = []
    metadata: dict = {}
    is_finalized: bool
    finalized_at: Optional[str] = None
    created_at: str
    updated_at: str


class ExportResponse(BaseModel):
    """Schema for export response."""
    total_records: int
    exported_at: datetime
    items: List[ExportItem]
