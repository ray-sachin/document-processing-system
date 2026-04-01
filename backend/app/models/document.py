"""
Document Model
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    """Return current UTC time."""
    return datetime.now(timezone.utc)


class Document(Base):
    """Document model for uploaded files."""
    
    __tablename__ = "documents"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # File information
    filename = Column(String(255), nullable=False)  # Stored filename (UUID-based)
    original_filename = Column(String(255), nullable=False)  # Original uploaded name
    file_type = Column(String(50), nullable=False)  # pdf, docx, txt, csv, png, jpg
    file_size = Column(BigInteger, nullable=False)  # Size in bytes
    file_path = Column(String(500), nullable=False)  # Storage path
    mime_type = Column(String(100), nullable=True)  # MIME type
    checksum = Column(String(64), nullable=True)  # SHA-256 hash for deduplication
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", back_populates="documents")
    jobs = relationship("Job", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Document {self.original_filename}>"
    
    @property
    def file_size_human(self) -> str:
        """Return human-readable file size."""
        size = self.file_size
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.2f} {unit}"
            size /= 1024
        return f"{size:.2f} TB"
