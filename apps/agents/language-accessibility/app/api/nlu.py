from fastapi import APIRouter, Query
from app.services.nlu_service import classify_intent

router = APIRouter()

@router.get("/nlu")
def get_intent(text: str = Query(..., description="User query to classify intent")):
    return classify_intent(text)