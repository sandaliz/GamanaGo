import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://stc:stc@postgres:5432/stc"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False  # set True if you want to debug raw SQL
)

SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)