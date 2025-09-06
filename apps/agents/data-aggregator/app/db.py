import os
from sqlalchemy import create_engine, text

POSTGRES_USER = os.getenv("POSTGRES_USER", "stc")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "stc")
POSTGRES_DB = os.getenv("POSTGRES_DB", "gamanagodb")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")

DB_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}/{POSTGRES_DB}"
engine = create_engine(DB_URL, future=True, pool_pre_ping=True)

def ensure_postgis():
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
