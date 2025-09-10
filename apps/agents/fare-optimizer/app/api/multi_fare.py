# app/api/multi_fare.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.services.bus_service import get_bus_fare
from app.services.train_service import get_train_fare

router = APIRouter()

class Leg(BaseModel):
    mode: str
    distance_km: Optional[int] = None
    from_station: Optional[str] = None
    to_station: Optional[str] = None

class FareRequest(BaseModel):
    legs: List[Leg]

@router.post("/fare")
async def fare_calc(request: FareRequest):
    total = 0
    breakdown = []

    for leg in request.legs:
        fare = None
        if leg.mode == "bus" and leg.distance_km:
            fare = await get_bus_fare(leg.distance_km)
        elif leg.mode == "train" and leg.from_station and leg.to_station:
            fare = await get_train_fare(leg.from_station, leg.to_station)

        if fare is not None:
            total += fare
            breakdown.append({"mode": leg.mode, "fare": fare})

    return {"total_fare": total, "breakdown": breakdown}