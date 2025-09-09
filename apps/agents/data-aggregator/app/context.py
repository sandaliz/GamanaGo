# apps/agents/data-aggregator/app/context.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

router = APIRouter()
# simple in-memory per-user context (swap for DB later if you want)
CTX: Dict[str, Dict[str, bool]] = {}

class SetContext(BaseModel):
    peak_hour: Optional[bool] = None
    rain: Optional[bool] = None
    train_delayed: Optional[bool] = None

def _default():
    now = datetime.now().hour
    return {
        "peak_hour": (7 <= now <= 9) or (16 <= now <= 19),
        "rain": False,
        "train_delayed": False,
    }

@router.get("/{user_id}")
async def get_context(user_id: str):
    return CTX.get(user_id, _default())

@router.post("/{user_id}")
async def set_context(user_id: str, body: SetContext):
    cur = CTX.get(user_id, _default()).copy()
    for k, v in body.dict(exclude_none=True).items():
        cur[k] = bool(v)
    CTX[user_id] = cur
    return cur
