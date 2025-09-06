# apps/agents/profile-personalizer/app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os, asyncpg, json, uuid
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL missing")

app = FastAPI(title="Profile Personalization Agent")

# ---------- Pydantic models ----------
class PrefsIn(BaseModel):
    weights: Optional[dict] = None
    language: Optional[str] = None
    walk_limit_m: Optional[int] = None
    voice_assist: Optional[bool] = None
    accessibility: Optional[dict] = None

class OnboardingIn(BaseModel):
    faster_vs_cheaper: str  # 'faster' | 'cheaper'
    long_walk_ok: bool
    voice_assist: bool
    language: str = "en"

class EventIn(BaseModel):
    event: str
    meta: dict = {}

class BehaviorIn(BaseModel):
    mode_chosen: str
    travel_time: int
    travel_cost: int

class SuggestionOut(BaseModel):
    id: str                 # expose as string (DB column is TEXT)
    kind: str
    title: Dict[str, str]
    body: Dict[str, str]
    payload: Optional[Dict[str, Any]] = None

# ---------- App lifecycle ----------
@app.on_event("startup")
async def startup():
    app.state.pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

@app.on_event("shutdown")
async def shutdown():
    await app.state.pool.close()

# ---------- Helpers ----------
def _coerce_json(v):
    if isinstance(v, (dict, list)):
        return v
    if isinstance(v, str) and v.strip():
        try:
            return json.loads(v)
        except Exception:
            return v
    return v

async def fetch_context(user_id: str):
    # Placeholder for cross-agent context (weather, disruptions, etc.)
    now = datetime.now()
    return {
        "peak_hour": now.hour in range(7, 10) or now.hour in range(16, 19),
        "rain": False,
        "train_delayed": False,
    }

def adjust_weights(prefs: dict, context: dict):
    weights = dict(prefs.get("weights") or {})
    walk_limit = prefs.get("walk_limit_m", 900)

    if context.get("peak_hour"):
        weights["time"] = min(100, int(weights.get("time", 50)) + 10)
    if context.get("rain"):
        walk_limit = min(walk_limit, 500)
    if context.get("train_delayed"):
        weights["train"] = max(0, int(weights.get("train", 50)) - 20)
        weights["bus"] = min(100, int(weights.get("bus", 50)) + 10)

    prefs["weights"] = weights
    prefs["walk_limit_m"] = walk_limit
    return prefs

# Deterministic per-user suggestion IDs (TEXT)
def sug_id(user_id: str, suffix: str) -> str:
    # make a stable UUIDv5 then stringify it; safe to store in TEXT too
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"https://gamanago/suggestions/{user_id}/{suffix}"))

# ---------- Health ----------
@app.get("/health")
async def health():
    return {"ok": True}

# ---------- Preferences ----------
@app.get("/profile/{user_id}/preferences")
async def get_prefs(user_id: str):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT weights, language, walk_limit_m, voice_assist, accessibility
            FROM user_preferences
            WHERE user_id = $1
            """,
            user_id,
        )
    if not row:
        raise HTTPException(404, "Preferences not found")

    prefs = {
        "weights": _coerce_json(row["weights"]),
        "language": row["language"],
        "walk_limit_m": row["walk_limit_m"],
        "voice_assist": row["voice_assist"],
        "accessibility": _coerce_json(row["accessibility"]),
    }

    # Context-aware tweaks (not persisted)
    context = await fetch_context(user_id)
    prefs = adjust_weights(prefs, context)
    return prefs

@app.put("/profile/{user_id}/preferences")
async def put_prefs(user_id: str, body: PrefsIn):
    async with app.state.pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE user_preferences SET
                weights       = COALESCE($2::jsonb, weights),
                language      = COALESCE($3, language),
                walk_limit_m  = COALESCE($4, walk_limit_m),
                voice_assist  = COALESCE($5, voice_assist),
                accessibility = COALESCE($6::jsonb, accessibility),
                updated_at    = now()
            WHERE user_id = $1
            """,
            user_id,
            json.dumps(body.weights) if body.weights is not None else None,
            body.language,
            body.walk_limit_m,
            body.voice_assist,
            json.dumps(body.accessibility) if body.accessibility is not None else None,
        )
    return {"ok": True}

# ---------- Onboarding ----------
@app.post("/profile/{user_id}/onboarding")
async def onboarding(user_id: str, body: OnboardingIn):
    weights = {"time": 50, "cost": 50, "comfort": 50, "train": 50, "bus": 50, "tuk": 50}
    if body.faster_vs_cheaper == "faster":
        weights["time"] = 70
        weights["cost"] = 40
    else:
        weights["time"] = 40
        weights["cost"] = 70

    walk_limit_m = 1000 if body.long_walk_ok else 500

    async with app.state.pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO user_preferences (user_id, weights, language, walk_limit_m, voice_assist, accessibility)
            VALUES ($1, $2::jsonb, $3, $4, $5, $6::jsonb)
            ON CONFLICT (user_id) DO NOTHING
            """,
            user_id,
            json.dumps(weights),
            body.language,
            walk_limit_m,
            body.voice_assist,
            json.dumps({"seat_preference": "any"}),
        )
    return {"ok": True, "weights": weights, "walk_limit_m": walk_limit_m}

# ---------- Behavior (log to agent_interaction to avoid missing user_behavior table) ----------
@app.post("/profile/{user_id}/behavior")
async def log_behavior(user_id: str, body: BehaviorIn):
    async with app.state.pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO agent_interaction (user_id, event, meta)
            VALUES ($1::uuid, 'behavior', $2::jsonb)
            """,
            user_id,
            json.dumps(body.dict()),
        )
    return {"ok": True}

# ---------- Suggestions (single endpoint) ----------
@app.get("/profile/{user_id}/suggestions", response_model=List[SuggestionOut])
async def get_suggestions(user_id: str):
    # 1) Load current prefs for light tailoring
    async with app.state.pool.acquire() as conn:
        prefs_row = await conn.fetchrow(
            """
            SELECT weights, language, walk_limit_m, voice_assist
            FROM user_preferences
            WHERE user_id = $1
            """,
            user_id,
        )

    lang = "en"
    weights = {"time": 60, "cost": 50, "comfort": 50}
    walk_limit_m = 900
    voice = True

    if prefs_row:
        weights = _coerce_json(prefs_row["weights"]) or weights
        lang = prefs_row["language"] or lang
        walk_limit_m = prefs_row["walk_limit_m"] or walk_limit_m
        voice = prefs_row["voice_assist"] if prefs_row["voice_assist"] is not None else voice

    # 2) Define suggestions (deterministic per-user UUIDs; full i18n)
    fast_vs_cost = SuggestionOut(
        id=str(sug_id(user_id, "cost_saver_if_peak")),
        kind="cost",
        title={
            "en": "Save on fares during peak",
            "si": "පීක් වේලාවේ ගාස්තු ඉතිරි කරගන්න",
            "ta": "பீக் நேரத்தில் செலவை குறைக்க",
        },
        body={
            "en": "Shift a bit toward cheaper routes when it’s crowded.",
            "si": "ගොඩක් කිරිමැස්සෙදි අඩු වියදම් මාර්ග වෙත ටිකක් මාරුවන්න.",
            "ta": "அதிரடியான நேரங்களில் மலிவு பாதைகளுக்கு சிறிது மாற்றவும்.",
        },
       payload={"weights": {"cost": "+10", "time": -5}},
    )

    faster_commute = SuggestionOut(
        id=str(sug_id(user_id, "prefer_faster_mornings")),
        kind="time",
        title={
            "en": "Prioritize faster arrivals in the morning",
            "si": "උදේ වේලාවේ වේගවත් පැමිණීම්ට මුල් තැන දෙන්න",
            "ta": "காலையில் வேகமான வருகைக்கு முன்னுரிமை",
        },
        body={
            "en": "Boost time preference for morning commutes.",
            "si": "උදේ ගමන් සඳහා ‘කාලය’ ප්‍රමුඛතාව වැඩිකරන්න.",
            "ta": "காலை பயணங்களுக்கு ‘நேரம்’ முன்னுரிமையை உயர்த்துங்கள்.",
        },
        payload={"weights": {"time": "+10"}},
    )

    comfort_bump = SuggestionOut(
        id=str(sug_id(user_id, "comfort_bump_if_long_walk")),
        kind="comfort",
        title={
            "en": "A bit more comfort on longer walks",
            "si": "දිගු පාගැනීම් සඳහා අඩු තරමකට ආරामය",
            "ta": "நீண்ட நடைகளில் சிறிது நிம்மதி",
        },
        body={
            "en": "If walking distance is high, nudge comfort up slightly.",
            "si": "පාවිච්චි දුර වැඩි නම් ආරමයට ටිකක් වැඩි කරන්න.",
            "ta": "நடை தூரம் அதிகமாக இருந்தால், சௌகரியத்தை சிறிது உயர்த்தவும்.",
        },
        payload={"weights": {"comfort": "+5"}},
    )

    # 3) Always show three (we still order with light tailoring)
    base = [fast_vs_cost, faster_commute, comfort_bump]
    # simple ordering: if you already value time highly, lead with the time suggestion
    if int(weights.get("time", 50)) >= 60 and int(weights.get("cost", 50)) <= 50:
        chosen = [faster_commute, fast_vs_cost, comfort_bump]
    else:
        chosen = [fast_vs_cost, faster_commute, comfort_bump]

    # 4) Upsert full records (id is TEXT in DB, user_id is UUID)
    async with app.state.pool.acquire() as conn:
        async with conn.transaction():
            for s in chosen:
                await conn.execute(
                    """
                    INSERT INTO agent_suggestion (id, user_id, kind, title, body, payload)
                    VALUES ($1, $2::uuid, $3, $4::jsonb, $5::jsonb, $6::jsonb)
                    ON CONFLICT (id) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        kind    = EXCLUDED.kind,
                        title   = EXCLUDED.title,
                        body    = EXCLUDED.body,
                        payload = EXCLUDED.payload
                    """,
                    s.id,
                    uuid.UUID(user_id),
                    s.kind,
                    json.dumps(s.title),
                    json.dumps(s.body),
                    json.dumps(s.payload or {}),
                )

    return chosen

# ---------- Apply suggestion ----------
@app.post("/profile/{user_id}/suggestions/{suggestion_id}/apply")
async def apply_suggestion(user_id: str, suggestion_id: str):
    async with app.state.pool.acquire() as conn:
        async with conn.transaction():
            s = await conn.fetchrow(
                "SELECT payload FROM agent_suggestion WHERE id=$1 AND user_id=$2::uuid",
                suggestion_id, user_id
            )
            if not s:
                raise HTTPException(404, "Suggestion not found")

            payload = _coerce_json(s["payload"]) or {}
            weights_delta = payload.get("weights") or {}

            cur = await conn.fetchrow(
                "SELECT weights FROM user_preferences WHERE user_id=$1::uuid",
                user_id
            )
            if not cur:
                raise HTTPException(404, "Preferences not found")

            weights = _coerce_json(cur["weights"]) or {}
            for k, v in weights_delta.items():
                try:
                    delta = int(str(v).replace("+", ""))
                except Exception:
                    delta = 0
                weights[k] = max(0, min(100, int(weights.get(k, 50)) + delta))

            await conn.execute(
                "UPDATE user_preferences SET weights=$2::jsonb, updated_at=now() WHERE user_id=$1::uuid",
                user_id, json.dumps(weights)
            )
            await conn.execute(
                "UPDATE agent_suggestion SET applied_at=now() WHERE id=$1",
                suggestion_id
            )
            await conn.execute(
                "INSERT INTO agent_interaction(user_id, event, meta) VALUES($1::uuid,'accept_suggestion',$2::jsonb)",
                user_id, json.dumps({"suggestion_id": suggestion_id})
            )

    return {"ok": True, "weights": weights}

# ---------- Events & Feedback ----------
@app.post("/profile/{user_id}/events")
async def post_event(user_id: str, body: EventIn):
    async with app.state.pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO agent_interaction(user_id, event, meta) VALUES($1::uuid,$2,$3::jsonb)",
            user_id,
            body.event,
            json.dumps(body.meta),
        )
    return {"ok": True}

@app.post("/profile/{user_id}/feedback")
async def feedback(user_id: str, suggestion_id: str, action: str, reason: Optional[str] = None):
    payload = {"suggestion_id": suggestion_id, "action": action, "reason": reason}
    async with app.state.pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO agent_interaction(user_id, event, meta) VALUES($1::uuid,'suggestion_feedback',$2::jsonb)",
            user_id,
            json.dumps(payload),
        )
    return {"ok": True}
