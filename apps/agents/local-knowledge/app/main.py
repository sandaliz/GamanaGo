from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import time
from math import radians, sin, cos, sqrt, atan2

app = FastAPI(title="Local Knowledge Agent API")

# In-memory storage (demo only)
REPORTS = []  # each report is a dict

class Report(BaseModel):
    category: str           # e.g., "flood", "stop_closed", "crowding"
    description: str        # e.g., "Road under water near Gampaha"
    lat: float
    lon: float
    stop_id: Optional[str] = None
    created_at: Optional[float] = None  # auto-filled

# ---- Helpers ----
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two GPS points on Earth."""
    R = 6371.0  # Earth radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

# ---- Routes ----
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "local-knowledge"}

@app.post("/reports")
def create_report(r: Report):
    report = r.model_dump()  # .dict() also fine
    report["created_at"] = time.time()
    REPORTS.append(report)
    return {"status": "success", "report": report}

@app.get("/reports/nearby")
def get_reports(lat: float, lon: float, radius_km: float = 2.0):
    """Get reports within radius_km of (lat, lon)."""
    results = []
    for rep in REPORTS:
        d = haversine(lat, lon, rep["lat"], rep["lon"])
        if d <= radius_km:
            results.append(rep)
    return {"count": len(results), "reports": results}