from fastapi import FastAPI, Query
from .gtfs_loader import load_gtfs, build_transfers, list_routes, list_stops, build_report
from fastapi.middleware.cors import CORSMiddleware
from .realtime import router as realtime_router

app = FastAPI(title="Data Aggregator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if you want
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(realtime_router, prefix="/realtime", tags=["realtime"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "data-aggregator"}

# ----- GTFS ingestion -----
@app.post("/load/gtfs")
async def load_gtfs_endpoint():
    counts = load_gtfs()
    return {"message":"GTFS loaded", "counts": counts}

# ----- Transfers (walking edges) -----
@app.post("/build/transfers")
async def build_transfers_endpoint(max_meters: int = Query(400, ge=50, le=2000)):
    n = build_transfers(max_meters=max_meters)
    return {"message":"transfers built", "count": n, "radius_m": max_meters}

# ----- Browsing data -----
@app.get("/routes")
async def routes():
    return list_routes()

@app.get("/stops")
async def stops(bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat")):
    return list_stops(bbox)

# ----- Tiny report -----
@app.post("/report/build")
async def report_build():
    path = build_report()
    return {"message": "report built", "path": path}
