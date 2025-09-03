from fastapi import FastAPI

app = FastAPI(title="local-knowledge")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "local-knowledge"}

# future: endpoints for crowdsourced local info, neighborhood insights, etc.