# from fastapi import FastAPI
# app = FastAPI(title="disruption-manager")

# @app.get("/health")
# async def health():
#     return {"status": "ok", "service": "disruption-manager"}
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Literal
from app.core.disruption import calculate_delay_for_vehicle
from app.clients.data_client import get_all_vehicle_positions

app = FastAPI(title="disruption-manager")

class PlanLeg(BaseModel):
    route_id: Optional[str] = None
    trip_id: Optional[str] = None
    from_stop: str
    to_stop: str
    depart_time: str
    arrive_time: str

class ForPlanReq(BaseModel):
    legs: List[PlanLeg]

class Alert(BaseModel):
    id: str
    scope: Literal["trip","route","network"]
    severity: Literal["info","minor","major"]
    title: str
    description: Optional[str] = None
    route_id: Optional[str] = None
    trip_id: Optional[str] = None
    advice: Optional[str] = None

@app.get("/health")
def health():
    return {"status":"ok","service":"disruption-manager"}

@app.post("/disruptions/for-plan")
def disruptions_for_plan(req: ForPlanReq):
    vehicles = get_all_vehicle_positions()  # live/sim stream
    by_trip = {v["trip_id"]: v for v in vehicles if v.get("trip_id")}

    alerts: List[Alert] = []
    seen = set()

    for leg in req.legs:
        if not leg.trip_id:
            continue
        v = by_trip.get(leg.trip_id)
        if not v:
            continue

        delay_min = calculate_delay_for_vehicle(v)
        if delay_min is None:
            continue

        # thresholds – tune as you like
        if delay_min >= 15:
            sev = "major"
        elif delay_min >= 5:
            sev = "minor"
        else:
            sev = "info"

        # Avoid duplicates if multiple legs hit the same trip
        key = (leg.trip_id, sev)
        if key in seen:
            continue
        seen.add(key)

        title = f"Delay on {leg.trip_id}: {delay_min:.0f} min"
        alerts.append(Alert(
            id=f"{leg.trip_id}:{sev}",
            scope="trip",
            severity=sev, title=title,
            description=f"Vehicle is approximately {delay_min:.1f} minutes behind the schedule.",
            route_id=leg.route_id, trip_id=leg.trip_id,
            advice="Consider an earlier/later departure or alternate route."
        ))

    return {"alerts": [a.model_dump() for a in alerts]}
