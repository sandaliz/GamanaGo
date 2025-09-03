from fastapi import FastAPI
app = FastAPI(title="disruption-manager")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "disruption-manager"}
