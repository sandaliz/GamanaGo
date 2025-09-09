from fastapi import APIRouter, Body
from typing import Dict, Any, Optional
from app.services.translator import translate_text

router = APIRouter()

LANGUAGE_NAMES = {
    "en": "English",
    "si": "Sinhala",
    "ta": "Tamil",
}

def build_message(data: Dict[str, Any]) -> str:
    """
    Very simple response templating.
    Expand later based on richer data and agent integration.
    """
    if data.get("mode") == "bus" and "fare" in data:
        return f"The bus fare is Rs. {data['fare']}"
    elif data.get("mode") == "train" and "fare" in data:
        return f"The train fare is Rs. {data['fare']}"
    elif "message" in data:
        return str(data["message"])
    else:
        return "Here is your response."

@router.post("/respond")
def respond(
    agent_response: Dict[str, Any] = Body(..., description="Raw agent JSON response"),
    target_lang: Optional[str] = "en"
):
    """
    Pipeline: Take JSON from any agent, build friendly message, 
    translate it into user's preferred language (en/si/ta).
    """
    # Build base English message
    message = build_message(agent_response)

    # Translate if needed
    final_message = message
    if target_lang and target_lang != "en":
        try:
            translated = translate_text(message, dest=target_lang)
            final_message = translated.get("output", message)
        except Exception as e:
            final_message = f"(Translation error: {str(e)}) {message}"

    return {
        "original_agent_data": agent_response,
        "base_message": message,
        "lang": target_lang,
        "lang_name": LANGUAGE_NAMES.get(target_lang, "Unknown"),
        "final_message": final_message
    }