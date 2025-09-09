from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import translate, detect, nlu, understand, respond

app = FastAPI(title="language-accessibility")

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(translate.router)
app.include_router(detect.router)
app.include_router(nlu.router)
app.include_router(understand.router)
app.include_router(respond.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "language-accessibility"}