from fastapi import APIRouter, Query
from app.services.detector import detect_language

router = APIRouter()

@router.get("/detect")
def detect(text: str = Query(..., description="Text to detect language for")):
    return detect_language(text)