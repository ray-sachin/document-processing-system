"""
File Utilities
"""
import hashlib
import uuid
from pathlib import Path
from typing import BinaryIO, List

from app.config import settings


def get_file_extension(filename: str) -> str:
    """Get file extension from filename."""
    return Path(filename).suffix.lower().lstrip(".")


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename preserving extension."""
    extension = get_file_extension(original_filename)
    unique_id = uuid.uuid4().hex
    return f"{unique_id}.{extension}"


def calculate_checksum(file: BinaryIO) -> str:
    """Calculate SHA-256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    
    # Read file in chunks to handle large files
    for chunk in iter(lambda: file.read(8192), b""):
        sha256_hash.update(chunk)
    
    # Reset file position
    file.seek(0)
    
    return sha256_hash.hexdigest()


def validate_file_type(filename: str, allowed_extensions: List[str] = None) -> bool:
    """Validate file type against allowed extensions."""
    if allowed_extensions is None:
        allowed_extensions = settings.allowed_extensions_list
    
    extension = get_file_extension(filename)
    return extension in allowed_extensions


def get_mime_type(filename: str) -> str:
    """Get MIME type from filename."""
    extension = get_file_extension(filename)
    
    mime_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
        "txt": "text/plain",
        "csv": "text/csv",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "json": "application/json",
    }
    
    return mime_types.get(extension, "application/octet-stream")


def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} TB"
