# app/services/bus_service.py
from sqlalchemy import text
from .db import SessionLocal

async def get_bus_fare(distance_km: int):
    async with SessionLocal() as session:
        res = await session.execute(
            text("SELECT fare_rs FROM fare_optimizer.fares_bus WHERE :d BETWEEN min_km AND max_km LIMIT 1"),
            {"d": distance_km}
        )
        row = res.first()
        return row[0] if row else None