"""
Services Package
"""
from app.services.storage_service import StorageService, storage_service
from app.services.document_service import DocumentService, document_service

__all__ = [
    "StorageService",
    "storage_service",
    "DocumentService",
    "document_service"
]
