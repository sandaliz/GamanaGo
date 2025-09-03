from fastapi import FastAPI

app = FastAPI(title="route-optimizer")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "route-optimizer"}

@app.post("/plan")
async def plan(payload: dict):
    return {
        "from": payload.get("from"),
        "to": payload.get("to"),
        "itinerary": []
    }