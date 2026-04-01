"""
Storage Service - File Storage Abstraction
Supports local filesystem and S3-compatible storage.
"""
import os
import aiofiles
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, Optional
import boto3
from botocore.exceptions import ClientError

from app.config import settings


class BaseStorageService(ABC):
    """Abstract base class for storage services."""
    
    @abstractmethod
    async def save_file(self, file_path: str, content: bytes) -> str:
        """Save file and return the path."""
        pass
    
    @abstractmethod
    async def get_file(self, file_path: str) -> bytes:
        """Get file content."""
        pass
    
    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """Delete file."""
        pass
    
    @abstractmethod
    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists."""
        pass


class LocalStorageService(BaseStorageService):
    """Local filesystem storage service."""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def _get_full_path(self, file_path: str) -> Path:
        """Get full path ensuring it's within base path."""
        full_path = self.base_path / file_path
        # Security: ensure path doesn't escape base directory
        try:
            full_path.resolve().relative_to(self.base_path.resolve())
        except ValueError:
            raise ValueError("Invalid file path")
        return full_path
    
    async def save_file(self, file_path: str, content: bytes) -> str:
        """Save file to local filesystem."""
        full_path = self._get_full_path(file_path)
        
        # Create directory if needed
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(full_path, 'wb') as f:
            await f.write(content)
        
        return str(file_path)
    
    async def get_file(self, file_path: str) -> bytes:
        """Read file from local filesystem."""
        full_path = self._get_full_path(file_path)
        
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        async with aiofiles.open(full_path, 'rb') as f:
            return await f.read()
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from local filesystem."""
        full_path = self._get_full_path(file_path)
        
        if full_path.exists():
            full_path.unlink()
            return True
        return False
    
    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists."""
        full_path = self._get_full_path(file_path)
        return full_path.exists()


class S3StorageService(BaseStorageService):
    """S3-compatible storage service."""
    
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        region: str = "us-east-1"
    ):
        self.bucket = bucket
        self.client = boto3.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        
        # Ensure bucket exists
        try:
            self.client.head_bucket(Bucket=bucket)
        except ClientError:
            self.client.create_bucket(Bucket=bucket)
    
    async def save_file(self, file_path: str, content: bytes) -> str:
        """Save file to S3."""
        import asyncio
        
        def _upload():
            self.client.put_object(
                Bucket=self.bucket,
                Key=file_path,
                Body=content
            )
        
        await asyncio.get_event_loop().run_in_executor(None, _upload)
        return file_path
    
    async def get_file(self, file_path: str) -> bytes:
        """Get file from S3."""
        import asyncio
        
        def _download():
            response = self.client.get_object(Bucket=self.bucket, Key=file_path)
            return response['Body'].read()
        
        return await asyncio.get_event_loop().run_in_executor(None, _download)
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from S3."""
        import asyncio
        
        def _delete():
            self.client.delete_object(Bucket=self.bucket, Key=file_path)
            return True
        
        return await asyncio.get_event_loop().run_in_executor(None, _delete)
    
    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists in S3."""
        import asyncio
        
        def _exists():
            try:
                self.client.head_object(Bucket=self.bucket, Key=file_path)
                return True
            except ClientError:
                return False
        
        return await asyncio.get_event_loop().run_in_executor(None, _exists)


class StorageService:
    """
    Storage service factory that provides the appropriate storage backend.
    """
    
    def __init__(self):
        self._service: Optional[BaseStorageService] = None
    
    @property
    def service(self) -> BaseStorageService:
        """Get or create the storage service instance."""
        if self._service is None:
            if settings.STORAGE_TYPE == "s3" and settings.S3_ENDPOINT:
                self._service = S3StorageService(
                    endpoint=settings.S3_ENDPOINT,
                    access_key=settings.S3_ACCESS_KEY or "",
                    secret_key=settings.S3_SECRET_KEY or "",
                    bucket=settings.S3_BUCKET,
                    region=settings.S3_REGION
                )
            else:
                self._service = LocalStorageService(settings.STORAGE_PATH)
        return self._service
    
    async def save_file(self, file_path: str, content: bytes) -> str:
        """Save file."""
        return await self.service.save_file(file_path, content)
    
    async def get_file(self, file_path: str) -> bytes:
        """Get file content."""
        return await self.service.get_file(file_path)
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file."""
        return await self.service.delete_file(file_path)
    
    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists."""
        return await self.service.file_exists(file_path)


# Global singleton instance
storage_service = StorageService()
