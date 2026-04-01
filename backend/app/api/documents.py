"""
Documents API Routes
"""
import os
import math
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Query
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models.document import Document
from app.models.job import Job, JobStatus
from app.schemas.document import DocumentResponse, DocumentListResponse, SortField, SortOrder
from app.services.storage_service import storage_service
from app.services.document_service import document_service
from app.config import settings


router = APIRouter()


@router.post("/upload", response_model=List[DocumentResponse], status_code=status.HTTP_201_CREATED)
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: DbSession = None,
    current_user: CurrentUser = None
):
    """
    Upload one or more documents.
    Creates a document record and triggers background processing.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )
    
    uploaded_documents = []
    
    for file in files:
        # Validate file
        if not file.filename:
            continue
        
        # Check file size
        file_content = await file.read()
        file_size = len(file_content)
        await file.seek(0)
        
        if file_size > settings.max_file_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File {file.filename} exceeds maximum size of {settings.MAX_FILE_SIZE_MB}MB"
            )
        
        # Get file extension
        from app.utils.file_utils import get_file_extension, validate_file_type
        if not validate_file_type(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed: {file.filename}"
            )
        
        # Create document and start processing
        document = await document_service.create_document(
            db=db,
            user_id=current_user.id,
            file=file,
            file_content=file_content
        )
        
        uploaded_documents.append(document)
    
    return uploaded_documents


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    db: DbSession,
    current_user: CurrentUser,
    search: Optional[str] = Query(None, description="Search in filename"),
    file_type: Optional[str] = Query(None, description="Filter by file type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by job status"),
    sort_by: SortField = Query(SortField.CREATED_AT),
    sort_order: SortOrder = Query(SortOrder.DESC),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    """List documents with search, filter, and pagination."""
    # Base query
    query = select(Document).where(Document.user_id == current_user.id)
    count_query = select(func.count(Document.id)).where(Document.user_id == current_user.id)
    
    # Apply search filter
    if search:
        search_filter = or_(
            Document.original_filename.ilike(f"%{search}%"),
            Document.filename.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Apply file type filter
    if file_type:
        query = query.where(Document.file_type == file_type.lower())
        count_query = count_query.where(Document.file_type == file_type.lower())
    
    # Apply sorting
    sort_column = getattr(Document, sort_by.value)
    if sort_order == SortOrder.DESC:
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query.options(selectinload(Document.jobs)))
    documents = result.scalars().all()
    
    # Build response with job status
    items = []
    for doc in documents:
        # Get latest job status
        latest_job = None
        if doc.jobs:
            latest_job = sorted(doc.jobs, key=lambda j: j.created_at, reverse=True)[0]
        
        doc_response = DocumentResponse(
            id=doc.id,
            user_id=doc.user_id,
            filename=doc.filename,
            original_filename=doc.original_filename,
            file_type=doc.file_type,
            file_size=doc.file_size,
            file_size_human=doc.file_size_human,
            mime_type=doc.mime_type,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            latest_job_status=latest_job.status if latest_job else None,
            latest_job_id=latest_job.id if latest_job else None,
            latest_job_progress=latest_job.progress if latest_job else None,
            latest_job_stage=latest_job.current_stage if latest_job else None,
            latest_job_error=latest_job.error_message if latest_job else None,
        )
        items.append(doc_response)
    
    # Filter by status if provided (needs to be done after fetching jobs)
    if status_filter:
        items = [item for item in items if item.latest_job_status == status_filter]
        total = len(items)
    
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: DbSession,
    current_user: CurrentUser
):
    """Get a specific document by ID."""
    result = await db.execute(
        select(Document)
        .where(Document.id == document_id, Document.user_id == current_user.id)
        .options(selectinload(Document.jobs))
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get latest job
    latest_job = None
    if document.jobs:
        latest_job = sorted(document.jobs, key=lambda j: j.created_at, reverse=True)[0]
    
    return DocumentResponse(
        id=document.id,
        user_id=document.user_id,
        filename=document.filename,
        original_filename=document.original_filename,
        file_type=document.file_type,
        file_size=document.file_size,
        file_size_human=document.file_size_human,
        mime_type=document.mime_type,
        created_at=document.created_at,
        updated_at=document.updated_at,
        latest_job_status=latest_job.status if latest_job else None,
        latest_job_id=latest_job.id if latest_job else None,
        latest_job_progress=latest_job.progress if latest_job else None,
        latest_job_stage=latest_job.current_stage if latest_job else None,
        latest_job_error=latest_job.error_message if latest_job else None,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    db: DbSession,
    current_user: CurrentUser
):
    """Delete a document and its associated jobs/results."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete file from storage
    try:
        await storage_service.delete_file(document.file_path)
    except Exception:
        pass  # File might not exist
    
    # Delete from database (cascades to jobs and results)
    await db.delete(document)
    await db.commit()
