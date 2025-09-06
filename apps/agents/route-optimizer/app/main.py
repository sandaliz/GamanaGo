# apps/agents/route-optimizer/app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal
from .planner import plan, nearest_stops

app = FastAPI(title="Route Optimizer")


class LatLon(BaseModel):
    lat: float
    lon: float

class PlanLLRequest(BaseModel):
    origin: LatLon
    destination: LatLon
    depart_at: str  # "HH:MM"

class Place(BaseModel):
    stop_id: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class PlanRequest(BaseModel):
    origin: Place
    destination: Place
    depart_at: str = Field(..., description="HH:MM or HH:MM:SS (24h, same-day)")

@app.get("/health")
def health():
    return {"status": "ok", "service": "route-optimizer"}

@app.post("/plan")
def plan_endpoint(req: PlanRequest):
    # resolve origin stop
    if req.origin.stop_id:
        origin = req.origin.stop_id
    elif req.origin.lat is not None and req.origin.lon is not None:
        ns = nearest_stops(req.origin.lat, req.origin.lon, k=1)
        if not ns:
            raise HTTPException(400, "No nearby origin stops")
        origin = ns[0][0]
    else:
        raise HTTPException(400, "Provide origin.stop_id or origin.lat/lon")

    # resolve destination stop
    if req.destination.stop_id:
        dest = req.destination.stop_id
    elif req.destination.lat is not None and req.destination.lon is not None:
        ns = nearest_stops(req.destination.lat, req.destination.lon, k=1)
        if not ns:
            raise HTTPException(400, "No nearby destination stops")
        dest = ns[0][0]
    else:
        raise HTTPException(400, "Provide destination.stop_id or destination.lat/lon")

    result = plan(origin, dest, req.depart_at)
    if not result.get("found"):
        raise HTTPException(404, "No path found")
    return {"origin_stop": origin, "dest_stop": dest, **result}


@app.post("/plan/latlon")
def plan_latlon(req: PlanLLRequest):
    o_candidates = nearest_stops(req.origin.lat, req.origin.lon, k=1)
    d_candidates = nearest_stops(req.destination.lat, req.destination.lon, k=1)
    if not o_candidates or not d_candidates:
        return {"found": False, "message": "No nearby stops"}
    o = o_candidates[0][0]
    d = d_candidates[0][0]
    return plan(o, d, req.depart_at)


# apps/agents/route-optimizer/app/main.py
@app.post("/snapshot/refresh")
def refresh():
    from .planner import refresh_snapshot
    refresh_snapshot()
    return {"ok": True}
