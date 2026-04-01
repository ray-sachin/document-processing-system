"""
Results API Routes
"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models.job import Job, ProcessedResult, JobStatus
from app.schemas.result import ProcessedResultResponse, ProcessedResultUpdate, FinalizeRequest


router = APIRouter()


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


@router.get("/{job_id}", response_model=ProcessedResultResponse)
async def get_result(
    job_id: UUID,
    db: DbSession,
    current_user: CurrentUser
):
    """Get processed result for a job."""
    # Verify job belongs to user
    job_result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = job_result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get the result
    result = await db.execute(
        select(ProcessedResult).where(ProcessedResult.job_id == job_id)
    )
    processed_result = result.scalar_one_or_none()
    
    if not processed_result:
        if job.status == JobStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Result not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job is not completed. Current status: {job.status}"
            )
    
    return ProcessedResultResponse(
        id=processed_result.id,
        job_id=processed_result.job_id,
        document_id=processed_result.document_id,
        extracted_title=processed_result.extracted_title,
        extracted_category=processed_result.extracted_category,
        extracted_summary=processed_result.extracted_summary,
        extracted_keywords=processed_result.extracted_keywords,
        extracted_metadata=processed_result.extracted_metadata,
        raw_text=processed_result.raw_text,
        structured_data=processed_result.structured_data,
        is_finalized=processed_result.is_finalized,
        finalized_at=processed_result.finalized_at,
        created_at=processed_result.created_at,
        updated_at=processed_result.updated_at
    )


@router.put("/{job_id}", response_model=ProcessedResultResponse)
async def update_result(
    job_id: UUID,
    update_data: ProcessedResultUpdate,
    db: DbSession,
    current_user: CurrentUser
):
    """Update processed result (edit extracted data)."""
    # Verify job belongs to user
    job_result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = job_result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get the result
    result = await db.execute(
        select(ProcessedResult).where(ProcessedResult.job_id == job_id)
    )
    processed_result = result.scalar_one_or_none()
    
    if not processed_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found"
        )
    
    # Check if already finalized
    if processed_result.is_finalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit finalized result"
        )
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(processed_result, field, value)
    
    processed_result.updated_at = utcnow()
    
    await db.commit()
    await db.refresh(processed_result)
    
    return ProcessedResultResponse(
        id=processed_result.id,
        job_id=processed_result.job_id,
        document_id=processed_result.document_id,
        extracted_title=processed_result.extracted_title,
        extracted_category=processed_result.extracted_category,
        extracted_summary=processed_result.extracted_summary,
        extracted_keywords=processed_result.extracted_keywords,
        extracted_metadata=processed_result.extracted_metadata,
        raw_text=processed_result.raw_text,
        structured_data=processed_result.structured_data,
        is_finalized=processed_result.is_finalized,
        finalized_at=processed_result.finalized_at,
        created_at=processed_result.created_at,
        updated_at=processed_result.updated_at
    )


@router.post("/{job_id}/finalize", response_model=ProcessedResultResponse)
async def finalize_result(
    job_id: UUID,
    finalize_data: FinalizeRequest,
    db: DbSession,
    current_user: CurrentUser
):
    """Finalize a processed result (mark as reviewed and locked)."""
    if not finalize_data.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required to finalize"
        )
    
    # Verify job belongs to user
    job_result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = job_result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get the result
    result = await db.execute(
        select(ProcessedResult).where(ProcessedResult.job_id == job_id)
    )
    processed_result = result.scalar_one_or_none()
    
    if not processed_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found"
        )
    
    # Check if already finalized
    if processed_result.is_finalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Result is already finalized"
        )
    
    # Finalize
    processed_result.is_finalized = True
    processed_result.finalized_at = utcnow()
    processed_result.finalized_by = current_user.id
    processed_result.updated_at = utcnow()
    
    await db.commit()
    await db.refresh(processed_result)
    
    return ProcessedResultResponse(
        id=processed_result.id,
        job_id=processed_result.job_id,
        document_id=processed_result.document_id,
        extracted_title=processed_result.extracted_title,
        extracted_category=processed_result.extracted_category,
        extracted_summary=processed_result.extracted_summary,
        extracted_keywords=processed_result.extracted_keywords,
        extracted_metadata=processed_result.extracted_metadata,
        raw_text=processed_result.raw_text,
        structured_data=processed_result.structured_data,
        is_finalized=processed_result.is_finalized,
        finalized_at=processed_result.finalized_at,
        created_at=processed_result.created_at,
        updated_at=processed_result.updated_at
    )
