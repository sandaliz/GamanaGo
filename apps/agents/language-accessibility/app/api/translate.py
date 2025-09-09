from fastapi import APIRouter, HTTPException, Query
from app.services.translator import translate_text, SUPPORTED_LANGS

router = APIRouter()

@router.get("/translate")
def translate(
    text: str = Query(..., description="Text to translate"),
    to_lang: str = Query("en", description="Target language: en/si/ta")
):
    try:
        return translate_text(text, dest=to_lang)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))