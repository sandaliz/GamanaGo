import os
from sqlalchemy import create_engine

PG_USER = os.getenv("POSTGRES_USER", "stc")
PG_PWD  = os.getenv("POSTGRES_PASSWORD", "stc")
PG_HOST = os.getenv("POSTGRES_HOST", "postgres")
PG_PORT = os.getenv("POSTGRES_PORT", "5432")
PG_DB   = os.getenv("POSTGRES_DB", "gamanagodb")

ENGINE = create_engine(
    f"postgresql+psycopg2://{PG_USER}:{PG_PWD}@{PG_HOST}:{PG_PORT}/{PG_DB}",
    pool_pre_ping=True
)