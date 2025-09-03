from fastapi import FastAPI

app = FastAPI(title="language-accessibility")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "language-accessibility"}

# future: endpoints for translations, accessibility services, etc.