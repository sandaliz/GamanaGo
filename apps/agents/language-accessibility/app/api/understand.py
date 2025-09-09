from fastapi import APIRouter, Query
from app.services.detector import detect_language
from app.services.translator import translate_text
from app.services.nlu_service import classify_intent

router = APIRouter()

@router.get("/understand")
def understand(
    text: str = Query(..., description="User query (Sinhala, Tamil, English)")
):
    detected = detect_language(text)
    detected_lang = detected.get("lang", "unknown")
    detected_lang_name = detected.get("lang_name", "Unknown")
    confidence = detected.get("confidence", None)

    # always try to translate into English (system default)
    translated_text = None
    if detected_lang != "en" and detected_lang != "unknown":
        try:
            translated = translate_text(text, dest="en")
            translated_text = translated.get("output")
        except Exception as e:
            translated_text = None
    else:
        translated_text = text  # already English

    # classify intent (in English text)
    intent = classify_intent(translated_text or "")

    return {
        "input": text,
        "detected_lang": detected_lang,
        "detected_lang_name": detected_lang_name,
        "confidence": confidence,
        "translated_text": translated_text,
        "intent": intent.get("intent")
    }