# app/services/train_service.py
from sqlalchemy import text
from .db import SessionLocal

async def get_train_fare(from_station: str, to_station: str):
    async with SessionLocal() as session:
        res = await session.execute(
            text("""
                SELECT fare_rs FROM fare_optimizer.fares_train
                WHERE (from_station=:f AND to_station=:t)
                   OR (from_station=:t AND to_station=:f)
                LIMIT 1
            """),
            {"f": from_station, "t": to_station}
        )
        row = res.first()
        return row[0] if row else None