"""
WebSocket API Routes for Real-time Progress
"""
import json
import asyncio
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from sqlalchemy import select
import redis.asyncio as redis_async

from app.database import AsyncSessionLocal
from app.models.job import Job, JobStatus
from app.models.user import User
from app.utils.security import decode_token
from app.config import settings


router = APIRouter()


class ConnectionManager:
    """Manager for WebSocket connections."""
    
    def __init__(self):
        # Map of job_id -> list of websockets
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept connection and add to job's connection list."""
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, job_id: str):
        """Remove connection from job's list."""
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
    
    async def send_to_job(self, job_id: str, message: dict):
        """Send message to all connections for a job."""
        if job_id in self.active_connections:
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


async def verify_ws_token(token: str) -> UUID | None:
    """Verify WebSocket authentication token."""
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        return None
    
    try:
        user_id = UUID(payload.get("sub"))
        return user_id
    except (ValueError, TypeError):
        return None


@router.websocket("/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: UUID):
    """
    WebSocket endpoint for real-time job progress updates.
    
    Client should send auth token as first message after connecting.
    Format: {"token": "your_access_token"}
    """
    job_id_str = str(job_id)
    
    try:
        await websocket.accept()
        
        # Wait for authentication message
        try:
            auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
            token = auth_data.get("token")
            
            if not token:
                await websocket.send_json({"error": "Authentication required"})
                await websocket.close(code=4001)
                return
            
            user_id = await verify_ws_token(token)
            if not user_id:
                await websocket.send_json({"error": "Invalid token"})
                await websocket.close(code=4001)
                return
                
        except asyncio.TimeoutError:
            await websocket.send_json({"error": "Authentication timeout"})
            await websocket.close(code=4001)
            return
        
        # Verify job belongs to user
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Job).where(Job.id == job_id, Job.user_id == user_id)
            )
            job = result.scalar_one_or_none()
            
            if not job:
                await websocket.send_json({"error": "Job not found"})
                await websocket.close(code=4004)
                return
            
            # Send initial status
            await websocket.send_json({
                "event": "connected",
                "job_id": job_id_str,
                "status": job.status,
                "progress": job.progress,
                "stage": job.current_stage
            })
        
        # Subscribe to Redis channel for this job
        redis_client = redis_async.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        
        pubsub = redis_client.pubsub()
        channel = f"{settings.PROGRESS_CHANNEL_PREFIX}:{job_id_str}"
        await pubsub.subscribe(channel)
        
        try:
            # Listen for updates
            while True:
                # Check for Redis messages
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.5)
                
                if message and message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await websocket.send_json(data)
                        
                        # Check if job is complete
                        if data.get("status") in [
                            JobStatus.COMPLETED.value,
                            JobStatus.FAILED.value,
                            JobStatus.CANCELLED.value
                        ]:
                            break
                    except json.JSONDecodeError:
                        pass
                
                # Small sleep to prevent busy loop
                await asyncio.sleep(0.1)
                
                # Check for incoming messages from client (ping/pong or close)
                try:
                    client_msg = await asyncio.wait_for(
                        websocket.receive_json(),
                        timeout=0.01
                    )
                    # Handle ping
                    if client_msg.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except asyncio.TimeoutError:
                    pass
                
        finally:
            await pubsub.unsubscribe(channel)
            await redis_client.close()
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
