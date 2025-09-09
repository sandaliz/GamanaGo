# app/main.py
from fastapi import FastAPI
from app.api import bus, train, multi_fare, compare

app = FastAPI(title="fare-optimizer")

# Register routers (each endpoint lives in its own file now)
app.include_router(bus.router)
app.include_router(train.router)
app.include_router(multi_fare.router)
app.include_router(compare.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "fare-optimizer"}