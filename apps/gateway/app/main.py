import os
import httpx
from fastapi import FastAPI, Request

app = FastAPI(title="gateway")

# pull all envs
ROUTE_OPTIMIZER_URL = os.getenv("ROUTE_OPTIMIZER_URL")
DATA_AGGREGATOR_URL = os.getenv("DATA_AGGREGATOR_URL")
DISRUPTION_MANAGER_URL = os.getenv("DISRUPTION_MANAGER_URL")
PROFILE_PERSONALIZER_URL = os.getenv("PROFILE_PERSONALIZER_URL")
FARE_OPTIMIZER_URL = os.getenv("FARE_OPTIMIZER_URL")
LANGUAGE_ACCESSIBILITY_URL = os.getenv("LANGUAGE_ACCESSIBILITY_URL")
LOCAL_KNOWLEDGE_URL = os.getenv("LOCAL_KNOWLEDGE_URL")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/routes/plan")
async def routes_plan(request: Request):
    payload = await request.json()
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{ROUTE_OPTIMIZER_URL}/plan", json=payload)
        r.raise_for_status()
        return r.json()