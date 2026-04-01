"""
Document Service - Business Logic for Documents
"""
from uuid import UUID
from datetime import datetime
from typing import Optional
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.job import Job, JobStatus
from app.services.storage_service import storage_service
from app.utils.file_utils import (
    generate_unique_filename,
    get_file_extension,
    calculate_checksum,
    get_mime_type
)


class DocumentService:
    """Service for document-related operations."""
    
    async def create_document(
        self,
        db: AsyncSession,
        user_id: UUID,
        file: UploadFile,
        file_content: bytes
    ) -> Document:
        """
        Create a new document and trigger processing.
        
        Args:
            db: Database session
            user_id: Owner user ID
            file: Uploaded file
            file_content: File content bytes
            
        Returns:
            Created Document object
        """
        import io
        
        # Generate unique filename
        unique_filename = generate_unique_filename(file.filename)
        
        # Calculate checksum
        file_io = io.BytesIO(file_content)
        checksum = calculate_checksum(file_io)
        
        # Get file info
        file_extension = get_file_extension(file.filename)
        mime_type = get_mime_type(file.filename)
        file_size = len(file_content)
        
        # Create storage path
        file_path = f"documents/{user_id}/{unique_filename}"
        
        # Save file to storage
        await storage_service.save_file(file_path, file_content)
        
        # Create document record
        document = Document(
            user_id=user_id,
            filename=unique_filename,
            original_filename=file.filename,
            file_type=file_extension,
            file_size=file_size,
            file_path=file_path,
            mime_type=mime_type,
            checksum=checksum
        )
        
        db.add(document)
        await db.flush()  # Get the document ID
        
        # Create initial job
        job = Job(
            document_id=document.id,
            user_id=user_id,
            status=JobStatus.QUEUED.value,
            progress=0
        )
        
        db.add(job)
        await db.commit()
        await db.refresh(document)
        await db.refresh(job)
        
        # Queue celery task
        from app.worker.tasks import process_document
        task = process_document.delay(str(job.id))
        
        # Update job with celery task ID
        job.celery_task_id = task.id
        await db.commit()
        
        return document
    
    async def get_document_with_content(
        self,
        db: AsyncSession,
        document_id: UUID,
        user_id: UUID
    ) -> tuple[Optional[Document], Optional[bytes]]:
        """
        Get document with its file content.
        
        Returns:
            Tuple of (document, content) or (None, None) if not found
        """
        from sqlalchemy import select
        
        result = await db.execute(
            select(Document).where(
                Document.id == document_id,
                Document.user_id == user_id
            )
        )
        document = result.scalar_one_or_none()
        
        if not document:
            return None, None
        
        try:
            content = await storage_service.get_file(document.file_path)
            return document, content
        except FileNotFoundError:
            return document, None


# Global singleton instance
document_service = DocumentService()
