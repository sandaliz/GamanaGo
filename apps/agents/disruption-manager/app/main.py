# from fastapi import FastAPI
# from app.core.disruption import main_disruption_loop
# import asyncio
# import logging

# app = FastAPI(title="Disruption Manager")
# log = logging.getLogger(__name__)

# @app.get("/health")
# async def health():
#     return {"status": "ok"}

# @app.on_event("startup")
# async def startup_event():
#     # create a background task from the coroutine
#     asyncio.create_task(main_disruption_loop())

# if __name__ == "__main__":
#     import uvicorn
#     # If Docker already runs uvicorn with reload, set reload=False here.
#     uvicorn.run("app.main:app", host="0.0.0.0", port=8003, reload=True)


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import logging

from app.core.disruption import detect_alerts_for_legs

app = FastAPI(title="Disruption Manager")
log = logging.getLogger(__name__)

# If you ever call directly from the web app (without the Next proxy), open CORS:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LegIn(BaseModel):
    route_id: Optional[str] = None
    trip_id: Optional[str] = None
    from_stop: Optional[str] = None
    to_stop: Optional[str] = None
    depart_time: Optional[str] = None
    arrive_time: Optional[str] = None

class ForPlanIn(BaseModel):
    legs: List[LegIn]

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/disruptions/for-plan")
async def disruptions_for_plan(body: ForPlanIn):
    # compute alerts now
    alerts = detect_alerts_for_legs([l.model_dump() for l in body.legs])
    return {"alerts": alerts}

# ------------ Background loop -------------
async def disruption_watchdog():
    while True:
        try:
            log.info("Background: checking disruptions…")
            # Place periodic tasks here (e.g., prewarm caches)
            await asyncio.sleep(30)
        except Exception:
            log.exception("Loop crashed; retrying in 5s")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(disruption_watchdog())

if __name__ == "__main__":
    import uvicorn
    # If Docker runs uvicorn already (with --reload), disable reload here.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8003, reload=True)
