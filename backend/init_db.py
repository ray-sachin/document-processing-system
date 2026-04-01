"""
Database initialization script.
Creates all tables defined in the models.
"""
import asyncio
from app.database import async_engine, Base
# Import all models to register them with Base
from app.models import user, document, job


async def init_database():
    """Create all database tables."""
    print("Creating database tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")


if __name__ == "__main__":
    asyncio.run(init_database())
