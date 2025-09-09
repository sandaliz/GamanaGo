# apps/agents/route-optimizer/app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy import text

from .db import ENGINE
from .planner import plan as do_plan, nearest_stops, refresh_snapshot

app = FastAPI(title="Route Optimizer")

# ---------- Models ----------
class Place(BaseModel):
    stop_id: Optional[str] = None
    name: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class PlanRequest(BaseModel):
    origin: Place
    destination: Place
    depart_at: str = Field(..., description="HH:MM or HH:MM:SS (24h, same-day)")
    max_walk_m: Optional[int] = Field(800, ge=100, le=3000)

# ---------- Helpers ----------
def resolve_stop_id(p: Place) -> str:
    # 1) explicit id
    if p.stop_id:
        return p.stop_id

    # 2) by name (prefix match)
    if p.name:
        with ENGINE.begin() as c:
            row = c.execute(
                text("""
                  SELECT stop_id
                  FROM stops
                  WHERE lower(name) LIKE lower(:q) || '%'
                  ORDER BY stop_id
                  LIMIT 1
                """),
                {"q": p.name},
            ).first()
        if row:
            return row[0]

    # 3) nearest to lat/lon
    if p.lat is not None and p.lon is not None:
        cand = nearest_stops(p.lat, p.lon, k=1)
        if cand:
            return cand[0][0]

    raise ValueError("origin/destination requires stop_id or name or lat/lon")

# ---------- Routes ----------
@app.get("/health")
def health():
    return {"status": "ok", "service": "route-optimizer"}

@app.post("/plan")
def plan_route(req: PlanRequest):
    try:
        o_sid = resolve_stop_id(req.origin)
        d_sid = resolve_stop_id(req.destination)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return do_plan(
        o_sid,
        d_sid,
        req.depart_at,
        max_walk_m=req.max_walk_m,
    )

@app.post("/snapshot/refresh")
def refresh():
    refresh_snapshot()
    return {"ok": True}

@app.get("/stops")
def list_stops():
    with ENGINE.begin() as c:
        rows = c.execute(
            text("SELECT stop_id, name, lat, lon FROM stops ORDER BY stop_id")
        ).mappings().all()
    return [
        {
            "stop_id": r["stop_id"],
            "name": r["name"],
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
        }
        for r in rows
    ]
