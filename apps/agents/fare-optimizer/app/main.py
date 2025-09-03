from fastapi import FastAPI

app = FastAPI(title="fare-optimizer")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "fare-optimizer"}

# You can later add endpoints like /fare-calc here