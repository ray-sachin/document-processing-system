"""
Job Tests
"""
import pytest
from httpx import AsyncClient
from app.models.job import JobStatus


@pytest.mark.asyncio
async def test_list_jobs_empty(client: AsyncClient, auth_headers):
    """Test listing jobs when none exist."""
    response = await client.get(
        "/api/jobs",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_jobs(client: AsyncClient, auth_headers, test_job):
    """Test listing jobs."""
    response = await client.get(
        "/api/jobs",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["status"] == "queued"


@pytest.mark.asyncio
async def test_get_job(client: AsyncClient, auth_headers, test_job):
    """Test getting a specific job."""
    response = await client.get(
        f"/api/jobs/{test_job.id}",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "queued"
    assert data["progress"] == 0


@pytest.mark.asyncio
async def test_get_job_not_found(client: AsyncClient, auth_headers):
    """Test getting non-existent job."""
    import uuid
    fake_id = uuid.uuid4()
    
    response = await client.get(
        f"/api/jobs/{fake_id}",
        headers=auth_headers
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cancel_queued_job(client: AsyncClient, auth_headers, test_job, db_session):
    """Test canceling a queued job."""
    response = await client.post(
        f"/api/jobs/{test_job.id}/cancel",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cannot_cancel_completed_job(client: AsyncClient, auth_headers, test_job, db_session):
    """Test that completed jobs cannot be cancelled."""
    # Mark job as completed
    test_job.status = JobStatus.COMPLETED.value
    await db_session.commit()
    
    response = await client.post(
        f"/api/jobs/{test_job.id}/cancel",
        headers=auth_headers
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_retry_failed_job(client: AsyncClient, auth_headers, test_job, db_session):
    """Test retrying a failed job."""
    # Mark job as failed
    test_job.status = JobStatus.FAILED.value
    test_job.error_message = "Test error"
    await db_session.commit()
    
    response = await client.post(
        f"/api/jobs/{test_job.id}/retry",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "queued"
    assert data["retry_count"] == 1


@pytest.mark.asyncio
async def test_cannot_retry_completed_job(client: AsyncClient, auth_headers, test_job, db_session):
    """Test that completed jobs cannot be retried."""
    # Mark job as completed
    test_job.status = JobStatus.COMPLETED.value
    await db_session.commit()
    
    response = await client.post(
        f"/api/jobs/{test_job.id}/retry",
        headers=auth_headers
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_filter_jobs_by_status(client: AsyncClient, auth_headers, db_session, test_user, test_document):
    """Test filtering jobs by status."""
    from app.models.job import Job
    
    # Create jobs with different statuses
    for status in [JobStatus.QUEUED, JobStatus.PROCESSING, JobStatus.COMPLETED]:
        job = Job(
            document_id=test_document.id,
            user_id=test_user.id,
            status=status.value
        )
        db_session.add(job)
    await db_session.commit()
    
    # Filter by completed
    response = await client.get(
        "/api/jobs?status=completed",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["status"] == "completed"
