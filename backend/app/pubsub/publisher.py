"""
Redis Pub/Sub Publisher - For publishing progress updates from workers
"""
import json
from datetime import datetime, timezone
from typing import Optional
import redis

from app.config import settings


class ProgressPublisher:
    """
    Publisher for sending progress updates via Redis Pub/Sub.
    
    Used by Celery workers to publish processing progress.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self._client: Optional[redis.Redis] = None
    
    @property
    def client(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._client is None:
            self._client = redis.from_url(
                self.redis_url,
                decode_responses=True
            )
        return self._client
    
    def get_channel(self, job_id: str) -> str:
        """Get the channel name for a job."""
        return f"{settings.PROGRESS_CHANNEL_PREFIX}:{job_id}"
    
    def publish_progress(
        self,
        job_id: str,
        stage: str,
        progress: int,
        message: str,
        status: str = "processing",
        extra_data: dict = None
    ) -> int:
        """
        Publish a progress update.
        
        Args:
            job_id: Job UUID string
            stage: Current processing stage
            progress: Progress percentage (0-100)
            message: Human-readable status message
            status: Job status (queued, processing, completed, failed)
            extra_data: Optional additional data to include
            
        Returns:
            Number of subscribers that received the message
        """
        channel = self.get_channel(job_id)
        
        data = {
            "job_id": job_id,
            "event": "progress_update",
            "status": status,
            "stage": stage,
            "progress": progress,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if extra_data:
            data["data"] = extra_data
        
        message_json = json.dumps(data)
        return self.client.publish(channel, message_json)
    
    def publish_started(self, job_id: str, document_name: str) -> int:
        """Publish job started event."""
        return self.publish_progress(
            job_id=job_id,
            stage="job_started",
            progress=5,
            message=f"Started processing: {document_name}",
            status="processing"
        )
    
    def publish_completed(self, job_id: str) -> int:
        """Publish job completed event."""
        return self.publish_progress(
            job_id=job_id,
            stage="job_completed",
            progress=100,
            message="Processing completed successfully",
            status="completed"
        )
    
    def publish_failed(self, job_id: str, error: str) -> int:
        """Publish job failed event."""
        return self.publish_progress(
            job_id=job_id,
            stage="job_failed",
            progress=-1,
            message=f"Processing failed: {error}",
            status="failed"
        )
    
    def close(self):
        """Close Redis connection."""
        if self._client:
            self._client.close()
            self._client = None


# Global singleton for convenience
progress_publisher = ProgressPublisher()
