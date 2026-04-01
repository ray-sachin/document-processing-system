"""
Export API Routes
"""
import csv
import json
import io
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models.job import Job, ProcessedResult, JobStatus
from app.models.document import Document


router = APIRouter()


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


@router.get("/json")
async def export_all_json(
    db: DbSession,
    current_user: CurrentUser,
    finalized_only: bool = Query(True, description="Export only finalized results")
):
    """Export all processed results as JSON."""
    # Query results
    query = (
        select(ProcessedResult)
        .join(Job)
        .join(Document)
        .where(Job.user_id == current_user.id)
    )
    
    if finalized_only:
        query = query.where(ProcessedResult.is_finalized == True)
    
    result = await db.execute(
        query.options(
            selectinload(ProcessedResult.job).selectinload(Job.document)
        )
    )
    results = result.scalars().all()
    
    # Build export data
    export_data = {
        "exported_at": utcnow().isoformat(),
        "total_records": len(results),
        "items": []
    }
    
    for r in results:
        item = r.to_export_dict()
        if r.job and r.job.document:
            item["document_filename"] = r.job.document.original_filename
        export_data["items"].append(item)
    
    # Return as downloadable JSON
    json_str = json.dumps(export_data, indent=2)
    
    return StreamingResponse(
        io.BytesIO(json_str.encode()),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=export_{utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )


@router.get("/csv")
async def export_all_csv(
    db: DbSession,
    current_user: CurrentUser,
    finalized_only: bool = Query(True, description="Export only finalized results")
):
    """Export all processed results as CSV."""
    # Query results
    query = (
        select(ProcessedResult)
        .join(Job)
        .join(Document)
        .where(Job.user_id == current_user.id)
    )
    
    if finalized_only:
        query = query.where(ProcessedResult.is_finalized == True)
    
    result = await db.execute(
        query.options(
            selectinload(ProcessedResult.job).selectinload(Job.document)
        )
    )
    results = result.scalars().all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "id", "job_id", "document_id", "document_filename", 
        "title", "category", "summary", "keywords",
        "is_finalized", "finalized_at", "created_at", "updated_at"
    ])
    
    # Data rows
    for r in results:
        document_filename = ""
        if r.job and r.job.document:
            document_filename = r.job.document.original_filename
        
        writer.writerow([
            str(r.id),
            str(r.job_id),
            str(r.document_id),
            document_filename,
            r.extracted_title or "",
            r.extracted_category or "",
            r.extracted_summary or "",
            ",".join(r.extracted_keywords) if r.extracted_keywords else "",
            r.is_finalized,
            r.finalized_at.isoformat() if r.finalized_at else "",
            r.created_at.isoformat() if r.created_at else "",
            r.updated_at.isoformat() if r.updated_at else ""
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/{job_id}/json")
async def export_single_json(
    job_id: UUID,
    db: DbSession,
    current_user: CurrentUser
):
    """Export a single processed result as JSON."""
    # Verify job belongs to user and get result
    result = await db.execute(
        select(ProcessedResult)
        .join(Job)
        .where(
            ProcessedResult.job_id == job_id,
            Job.user_id == current_user.id
        )
        .options(
            selectinload(ProcessedResult.job).selectinload(Job.document)
        )
    )
    processed_result = result.scalar_one_or_none()
    
    if not processed_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found"
        )
    
    # Build export data
    export_data = processed_result.to_export_dict()
    if processed_result.job and processed_result.job.document:
        export_data["document_filename"] = processed_result.job.document.original_filename
    
    json_str = json.dumps(export_data, indent=2)
    
    return StreamingResponse(
        io.BytesIO(json_str.encode()),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=result_{job_id}.json"
        }
    )


@router.get("/{job_id}/csv")
async def export_single_csv(
    job_id: UUID,
    db: DbSession,
    current_user: CurrentUser
):
    """Export a single processed result as CSV."""
    # Verify job belongs to user and get result
    result = await db.execute(
        select(ProcessedResult)
        .join(Job)
        .where(
            ProcessedResult.job_id == job_id,
            Job.user_id == current_user.id
        )
        .options(
            selectinload(ProcessedResult.job).selectinload(Job.document)
        )
    )
    processed_result = result.scalar_one_or_none()
    
    if not processed_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found"
        )
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "id", "job_id", "document_id", "document_filename",
        "title", "category", "summary", "keywords",
        "is_finalized", "finalized_at", "created_at", "updated_at"
    ])
    
    # Data row
    document_filename = ""
    if processed_result.job and processed_result.job.document:
        document_filename = processed_result.job.document.original_filename
    
    writer.writerow([
        str(processed_result.id),
        str(processed_result.job_id),
        str(processed_result.document_id),
        document_filename,
        processed_result.extracted_title or "",
        processed_result.extracted_category or "",
        processed_result.extracted_summary or "",
        ",".join(processed_result.extracted_keywords) if processed_result.extracted_keywords else "",
        processed_result.is_finalized,
        processed_result.finalized_at.isoformat() if processed_result.finalized_at else "",
        processed_result.created_at.isoformat() if processed_result.created_at else "",
        processed_result.updated_at.isoformat() if processed_result.updated_at else ""
    ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=result_{job_id}.csv"
        }
    )
