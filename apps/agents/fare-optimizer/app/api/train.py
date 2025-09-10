# app/api/train.py
from fastapi import APIRouter, HTTPException, Query
from app.services.train_service import get_train_fare

router = APIRouter()

@router.get("/fare/train")
async def train_fare(
    from_station: str = Query(..., description="Origin station name"),
    to_station: str = Query(..., description="Destination station name")
):
    fare = await get_train_fare(from_station, to_station)
    if fare is None:
        # Return explicit error message
        raise HTTPException(status_code=404, detail={
            "fare": None,
            "message": f"No fare found between {from_station} and {to_station}"
        })
    return {"mode": "train", "from": from_station, "to": to_station, "fare": fare}