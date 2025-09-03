from fastapi import FastAPI
app = FastAPI(title="profile-personalizer")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "profile-personalizer"}
