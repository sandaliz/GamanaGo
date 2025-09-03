from fastapi import FastAPI
app = FastAPI(title="data-aggregator")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "data-aggregator"}
