# app/api/bus.py
from fastapi import APIRouter, HTTPException
from app.services.bus_service import get_bus_fare

router = APIRouter()

@router.get("/fare/bus/{distance}")
async def bus_fare(distance: int):
    fare = await get_bus_fare(distance)
    if fare is None:
        raise HTTPException(status_code=404, detail={
            "fare": None,
            "message": f"No fare slab found for distance {distance} km"
        })
    return {"mode": "bus", "distance_km": distance, "fare": fare}