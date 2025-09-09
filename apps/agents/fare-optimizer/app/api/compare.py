# app/api/compare.py
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

class RouteOption(BaseModel):
    legs: List[Leg]

class RouteRequest(BaseModel):
    routes: List[RouteOption]

@router.post("/fare/compare")
async def compare_routes(request: RouteRequest):
    results = []
    for idx, route in enumerate(request.routes):
        total = 0
        breakdown = []
        for leg in route.legs:
            fare = None
            if leg.mode == "bus" and leg.distance_km:
                fare = await get_bus_fare(leg.distance_km)
            elif leg.mode == "train" and leg.from_station and leg.to_station:
                fare = await get_train_fare(leg.from_station, leg.to_station)

            if fare is not None:
                total += fare
                breakdown.append({"mode": leg.mode, "fare": fare})

        results.append({"route_index": idx, "total_fare": total, "breakdown": breakdown})

    cheapest = min(results, key=lambda r: r["total_fare"]) if results else None
    return {"routes": results, "cheapest": cheapest}