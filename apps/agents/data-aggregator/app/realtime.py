# apps/agents/data-aggregator/app/realtime.py
from __future__ import annotations
import os, time, json
from typing import Optional, Dict, Any, List
import redis
from fastapi import APIRouter
from pydantic import BaseModel
from starlette.responses import StreamingResponse

router = APIRouter()

# ---------- Redis client (global) ----------
# Why: one reusable connection; env-driven so it works in Docker and locally
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB   = int(os.getenv("REDIS_DB", 0))

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    decode_responses=True,        # -> return strings, not bytes
    socket_timeout=5,
    retry_on_timeout=True,
    health_check_interval=30,
)

try:
    redis_client.ping()
    print(f"[realtime] Connected to Redis at {REDIS_HOST}:{REDIS_PORT} db={REDIS_DB}")
except Exception as e:
    print(f"[realtime] WARNING: Redis not reachable: {e}")

# ---------- Models ----------
class RealtimeBeacon(BaseModel):
    trip_id: str
    lat: float
    lon: float
    speed_kph: Optional[float] = None
    timestamp: Optional[float] = None   # unix seconds

# ---------- Helpers ----------
def _key(trip_id: str) -> str:
    # Why: consistent key for per-trip latest position
    return f"realtime:trip:{trip_id}"

def store_latest_position(b: RealtimeBeacon) -> None:
    # Why: keep the "latest" state for quick polling/debug
    ts = b.timestamp if b.timestamp is not None else time.time()
    key = _key(b.trip_id)
    mapping = {
        "lat": str(b.lat),
        "lon": str(b.lon),
        "speed_kph": str(b.speed_kph if b.speed_kph is not None else 0),
        "last_seen": str(int(ts)),
    }
    # Use pipeline so HSET + EXPIRE are atomic-ish
    with redis_client.pipeline() as p:
        p.hset(key, mapping=mapping)
        p.expire(key, 86400)  # 24h TTL so stale trips disappear
        p.execute()

def publish_beacon(b: RealtimeBeacon) -> None:
    # Why: push events to all live subscribers (SSE)
    payload = {
        "trip_id": b.trip_id,
        "lat": b.lat,
        "lon": b.lon,
        "speed_kph": b.speed_kph if b.speed_kph is not None else 0,
        "ts": int(b.timestamp if b.timestamp is not None else time.time()),
    }
    redis_client.publish("pubsub:realtime", json.dumps(payload))

# ---------- Endpoints ----------
@router.post("/driver/beacon")
def driver_beacon(b: RealtimeBeacon):
    # Why: driver (or your simulator) posts here every ~5–10s
    if b.timestamp is None:
        b.timestamp = time.time()
    store_latest_position(b)
    publish_beacon(b)
    return {"ok": True}

@router.get("/positions")
def list_positions() -> List[Dict[str, Any]]:
    # Why: handy for polling and debugging
    out: List[Dict[str, Any]] = []
    for key in redis_client.scan_iter(match="realtime:trip:*", count=100):
        h = redis_client.hgetall(key)
        if not h:
            continue
        trip_id = key.split("realtime:trip:", 1)[-1]
        try:
            out.append({
                "trip_id": trip_id,
                "lat": float(h.get("lat", "0") or 0),
                "lon": float(h.get("lon", "0") or 0),
                "speed_kph": float(h.get("speed_kph", "0") or 0),
                "last_seen": int(h.get("last_seen", "0") or 0),
            })
        except Exception:
            # skip malformed entries
            continue
    return out

@router.get("/stream")
def stream_sse():
    """
    Why: Server-Sent Events feed for browsers.
    It subscribes to Redis pub/sub and yields messages as SSE 'data:' lines.
    """
    pubsub = redis_client.pubsub()
    pubsub.subscribe("pubsub:realtime")

    def event_generator():
        last_ping = time.time()
        try:
            for msg in pubsub.listen():
                now = time.time()
                # Heartbeat every ~15s to keep proxies alive
                if now - last_ping > 15:
                    yield b": ping\n\n"
                    last_ping = now

                if msg.get("type") != "message":
                    continue
                data = msg.get("data")
                if not data:
                    continue
                # Each event must end with a blank line per SSE protocol
                yield f"data: {data}\n\n".encode("utf-8")
        finally:
            try:
                pubsub.close()
            except Exception:
                pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")
