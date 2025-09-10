# ... keep your imports ...
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any
import time
from math import radians, sin, cos, sqrt, atan2

app = FastAPI(title="Local Knowledge Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CATEGORIES: Dict[str, Dict[str, Any]] = {
    "flood":           {"action": "block",    "radius_m": 350, "default_valid_min": 180},
    "stop_closed":     {"action": "block",    "radius_m":  50, "default_valid_min": 240},
    "roadwork":        {"action": "penalize", "radius_m": 250, "default_valid_min": 720},
    "accident":        {"action": "penalize", "radius_m": 250, "default_valid_min": 120},
    "protest_strike":  {"action": "penalize", "radius_m": 500, "default_valid_min": 360},
    "crowding":        {"action": "penalize", "radius_m":  50, "default_valid_min":  30},
    "unsafe":          {"action": "penalize", "radius_m": 250, "default_valid_min": 240},
    "delay":           {"action": "penalize", "radius_m":   0, "default_valid_min": 120},
}
CategoryLiteral = Literal[
    "flood","stop_closed","roadwork","accident",
    "protest_strike","crowding","unsafe","delay"
]

REPORTS: List[dict] = []
_ID = 0

class Report(BaseModel):
    category: CategoryLiteral
    description: str = Field(..., min_length=2, max_length=500)
    lat: float
    lon: float
    route_name: str
    stop_id: Optional[str] = None
    severity: Optional[int] = Field(1, ge=1, le=3)
    valid_for_min: Optional[int] = Field(None, ge=5, le=24*60)
    created_at: Optional[float] = None

def now_s() -> float:
    return time.time()

def expires_at(created_at: float, valid_for_min: int) -> float:
    return created_at + valid_for_min * 60

def is_active(created_at: float, valid_for_min: int) -> bool:
    return now_s() <= expires_at(created_at, valid_for_min)

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "local-knowledge"}

@app.post("/reports")
def create_report(r: Report):
    global _ID
    _ID += 1
    policy = CATEGORIES[r.category]
    created = now_s()
    valid_min = int(r.valid_for_min or policy["default_valid_min"])
    route_name = r.route_name.strip()

    doc = {
        "id": _ID,
        "category": r.category,
        "description": r.description.strip(),
        "lat": float(r.lat),
        "lon": float(r.lon),
        "route_name": route_name,
        "stop_id": r.stop_id,
        "severity": int(r.severity or 1),
        "valid_for_min": valid_min,
        "created_at": created,
        "expires_at": expires_at(created, valid_min),

        # derived from policy (used by router)
        "action": policy["action"],       # "block" | "penalize"
        "radius_m": int(policy["radius_m"]),

        # community validation
        "votes_up": 0,
        "votes_down": 0,
        "verified": False,
    }
    REPORTS.append(doc)
    return {"status": "success", "report": doc}

@app.post("/reports/{rid}/vote")
def vote_report(rid: int, vote: Literal["up","down"]):
    """Confirm (up) or dispute (down) a report.
       - Upvote: +1 & extend expiry by 10 minutes (cap +60 total).
       - Downvote: +1 & reduce remaining time by 30% (but not below 5 min).
       - Verified rule: votes_up ≥ 3 and votes_up ≥ votes_down + 2.
    """
    rep = next((x for x in REPORTS if x["id"] == rid), None)
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")

    if vote == "up":
        rep["votes_up"] += 1
        # extend a little, up to +60 min total extension
        extra = 10 * 60
        max_extra = 60 * 60
        # how much already extended?
        base_exp = rep["created_at"] + rep["valid_for_min"] * 60
        already = rep["expires_at"] - base_exp
        add = min(extra, max(0, max_extra - already))
        rep["expires_at"] += add
    else:
        rep["votes_down"] += 1
        # reduce remaining time by 30%, but keep at least 5 min from now
        remaining = max(0, rep["expires_at"] - now_s())
        reduced = remaining * 0.7
        min_left = 5 * 60
        rep["expires_at"] = now_s() + max(min_left, reduced)

    # verification rule
    rep["verified"] = (rep["votes_up"] >= 3) and (rep["votes_up"] >= rep["votes_down"] + 2)

    return {"status": "ok", "report": rep}

@app.get("/reports/nearby")
def get_reports(
    lat: float,
    lon: float,
    radius_km: float = 2.0,
    categories: Optional[List[CategoryLiteral]] = Query(default=None),
    active_only: bool = True,
    route_name: Optional[str] = None,
    verified_only: bool = False,
):
    out = []
    for rep in REPORTS:
        if categories and rep["category"] not in categories:
            continue
        if route_name and rep.get("route_name") != route_name:
            continue
        if verified_only and not rep.get("verified"):
            continue
        # recompute active by expires_at (which can change with votes)
        if active_only and now_s() > rep["expires_at"]:
            continue
        if haversine(lat, lon, rep["lat"], rep["lon"]) <= radius_km:
            out.append(rep)
    # newest first
    out.sort(key=lambda r: r.get("created_at", 0), reverse=True)
    return {"count": len(out), "reports": out}

@app.get("/disruptions")
def disruptions_for_routing(
    lat: float,
    lon: float,
    radius_km: float = 3.0,
    categories: List[CategoryLiteral] = Query(default=[
        "flood","stop_closed","roadwork","accident","protest_strike","unsafe","delay"
    ]),
    active_only: bool = True,
    min_verified: bool = False,  # router can require only verified
):
    zones = []
    for rep in REPORTS:
        if rep["category"] not in categories:
            continue
        if min_verified and not rep.get("verified"):
            continue
        if active_only and now_s() > rep["expires_at"]:
            continue
        if haversine(lat, lon, rep["lat"], rep["lon"]) <= radius_km:
            zones.append({
                "category": rep["category"],
                "action": rep["action"],
                "lat": rep["lat"],
                "lon": rep["lon"],
                "radius_m": rep["radius_m"],
                "severity": rep["severity"],
                "created_at": rep["created_at"],
                "expires_at": rep["expires_at"],
                "description": rep["description"],
                "stop_id": rep.get("stop_id"),
                "route_name": rep.get("route_name"),
                "verified": rep.get("verified", False),
                "votes_up": rep.get("votes_up", 0),
                "votes_down": rep.get("votes_down", 0),
            })
    return {"count": len(zones), "zones": zones}

@app.get("/routes")
def list_routes():
    # unique, non-empty route names (seed two well-known ones)
    names = {r.get("route_name","").strip() for r in REPORTS if r.get("route_name")}
    seeds = {"Kandy → Panadura", "Nittabuwa → Panadura"}
    names |= {s for s in seeds if s}
    return {"routes": sorted(names)}

@app.get("/reports/all")
def reports_all():
    return {"count": len(REPORTS), "reports": REPORTS}
