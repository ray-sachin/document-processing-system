"""
Redis Pub/Sub Subscriber - For receiving progress updates
"""
import json
import asyncio
from typing import Optional, Callable, AsyncGenerator
import redis.asyncio as redis

from app.config import settings


class ProgressSubscriber:
    """
    Subscriber for receiving progress updates via Redis Pub/Sub.
    
    Used by the API server to stream updates to clients.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self._client: Optional[redis.Redis] = None
        self._pubsub: Optional[redis.client.PubSub] = None
    
    async def connect(self):
        """Connect to Redis."""
        if self._client is None:
            self._client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
    
    def get_channel(self, job_id: str) -> str:
        """Get the channel name for a job."""
        return f"{settings.PROGRESS_CHANNEL_PREFIX}:{job_id}"
    
    async def subscribe(self, job_id: str) -> None:
        """Subscribe to a job's progress channel."""
        await self.connect()
        
        if self._pubsub is None:
            self._pubsub = self._client.pubsub()
        
        channel = self.get_channel(job_id)
        await self._pubsub.subscribe(channel)
    
    async def unsubscribe(self, job_id: str) -> None:
        """Unsubscribe from a job's progress channel."""
        if self._pubsub:
            channel = self.get_channel(job_id)
            await self._pubsub.unsubscribe(channel)
    
    async def listen(self, timeout: float = 1.0) -> AsyncGenerator[dict, None]:
        """
        Listen for messages on subscribed channels.
        
        Args:
            timeout: Timeout in seconds for each get_message call
            
        Yields:
            Parsed message data
        """
        if self._pubsub is None:
            return
        
        while True:
            message = await self._pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=timeout
            )
            
            if message and message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    yield data
                except json.JSONDecodeError:
                    continue
    
    async def listen_for_job(
        self,
        job_id: str,
        callback: Callable[[dict], None] = None,
        timeout: float = 300.0
    ) -> AsyncGenerator[dict, None]:
        """
        Subscribe and listen for a specific job's updates.
        
        Args:
            job_id: Job UUID string
            callback: Optional callback function for each message
            timeout: Total timeout in seconds
            
        Yields:
            Progress update data
        """
        await self.subscribe(job_id)
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            async for message in self.listen():
                # Check timeout
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > timeout:
                    break
                
                # Execute callback if provided
                if callback:
                    callback(message)
                
                yield message
                
                # Check if job is complete
                if message.get("status") in ["completed", "failed", "cancelled"]:
                    break
                    
        finally:
            await self.unsubscribe(job_id)
    
    async def close(self):
        """Close Redis connection."""
        if self._pubsub:
            await self._pubsub.close()
            self._pubsub = None
        
        if self._client:
            await self._client.close()
            self._client = None


async def create_subscriber() -> ProgressSubscriber:
    """Factory function to create a new subscriber."""
    subscriber = ProgressSubscriber()
    await subscriber.connect()
    return subscriber
