"""
Document Tests
"""
import pytest
import io
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_documents_empty(client: AsyncClient, auth_headers):
    """Test listing documents when none exist."""
    response = await client.get(
        "/api/documents",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_documents(client: AsyncClient, auth_headers, test_document):
    """Test listing documents."""
    response = await client.get(
        "/api/documents",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["original_filename"] == "test_document.txt"


@pytest.mark.asyncio
async def test_get_document(client: AsyncClient, auth_headers, test_document):
    """Test getting a specific document."""
    response = await client.get(
        f"/api/documents/{test_document.id}",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["original_filename"] == "test_document.txt"
    assert data["file_type"] == "txt"


@pytest.mark.asyncio
async def test_get_document_not_found(client: AsyncClient, auth_headers):
    """Test getting non-existent document."""
    import uuid
    fake_id = uuid.uuid4()
    
    response = await client.get(
        f"/api/documents/{fake_id}",
        headers=auth_headers
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_document(client: AsyncClient, auth_headers, test_document, db_session):
    """Test deleting a document."""
    response = await client.delete(
        f"/api/documents/{test_document.id}",
        headers=auth_headers
    )
    
    assert response.status_code == 204
    
    # Verify deletion
    get_response = await client.get(
        f"/api/documents/{test_document.id}",
        headers=auth_headers
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_list_documents_with_search(client: AsyncClient, auth_headers, test_document):
    """Test document search."""
    # Search for existing document
    response = await client.get(
        "/api/documents?search=test",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    
    # Search for non-existing
    response = await client.get(
        "/api/documents?search=nonexistent",
        headers=auth_headers
    )
    
    data = response.json()
    assert len(data["items"]) == 0


@pytest.mark.asyncio
async def test_list_documents_pagination(client: AsyncClient, auth_headers, db_session, test_user):
    """Test document pagination."""
    from app.models.document import Document
    
    # Create multiple documents
    for i in range(15):
        doc = Document(
            user_id=test_user.id,
            filename=f"doc_{i}.txt",
            original_filename=f"document_{i}.txt",
            file_type="txt",
            file_size=100,
            file_path=f"docs/doc_{i}.txt"
        )
        db_session.add(doc)
    await db_session.commit()
    
    # Test first page
    response = await client.get(
        "/api/documents?page=1&page_size=10",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 10
    assert data["total"] == 15
    assert data["total_pages"] == 2
    
    # Test second page
    response = await client.get(
        "/api/documents?page=2&page_size=10",
        headers=auth_headers
    )
    
    data = response.json()
    assert len(data["items"]) == 5
