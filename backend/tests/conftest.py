"""
Test Configuration
"""
import os
from types import SimpleNamespace
import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.database import Base, get_db
from app.models import User, Document, Job, ProcessedResult
from app.utils.security import hash_password, create_access_token
from app.worker import tasks as worker_tasks


# Test database URL (uses test database)
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///./test_document_processing.db",
)

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
)

# Test session factory
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def mock_task_queue(monkeypatch: pytest.MonkeyPatch):
    """Avoid requiring a live Celery worker or Redis broker during API tests."""
    monkeypatch.setattr(
        worker_tasks.process_document,
        "delay",
        lambda job_id: SimpleNamespace(id=f"test-task-{job_id}"),
    )


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session
        
        # Cleanup after test
        await session.rollback()
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with overridden database dependency."""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password=hash_password("testpassword123"),
        full_name="Test User",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict:
    """Get authorization headers for test user."""
    token = create_access_token(str(test_user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def test_document(db_session: AsyncSession, test_user: User) -> Document:
    """Create a test document."""
    document = Document(
        user_id=test_user.id,
        filename="test_doc.txt",
        original_filename="test_document.txt",
        file_type="txt",
        file_size=1024,
        file_path="documents/test/test_doc.txt",
        mime_type="text/plain"
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)
    return document


@pytest_asyncio.fixture
async def test_job(db_session: AsyncSession, test_user: User, test_document: Document) -> Job:
    """Create a test job."""
    from app.models.job import JobStatus
    
    job = Job(
        document_id=test_document.id,
        user_id=test_user.id,
        status=JobStatus.QUEUED.value,
        progress=0
    )
    db_session.add(job)
    await db_session.commit()
    await db_session.refresh(job)
    return job
