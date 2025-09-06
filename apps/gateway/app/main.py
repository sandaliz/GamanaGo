import os, json
from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
import httpx

# 👇 NEW: socket.io
import socketio

AGG_URL = os.getenv("AGG_URL", "http://data-aggregator:8001")
OPT_URL = os.getenv("OPT_URL", "http://route-optimizer:8002")

# --- Socket.IO server (why: realtime push to browser) ---
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_interval=25,
    ping_timeout=60,
)
# optional: simple rooms by route/agency/user later

app = FastAPI(title="Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "gateway", "agg": AGG_URL, "opt": OPT_URL}

# ---------- Proxy APIs (unchanged) ----------
@app.get("/api/routes")
async def routes():
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{AGG_URL}/routes", timeout=30)
        return JSONResponse(r.json())

@app.get("/api/stops/bbox")
async def stops_bbox(bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat")):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{AGG_URL}/stops/bbox", params={"bbox": bbox}, timeout=30)
        return JSONResponse(r.json())

@app.post("/api/plan")
async def api_plan(req: Request):
    payload = await req.json()
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{OPT_URL}/plan", json=payload, timeout=60)
        return JSONResponse(r.json(), status_code=r.status_code)

@app.post("/api/plan/latlon")
async def api_plan_latlon(req: Request):
    payload = await req.json()
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{OPT_URL}/plan/latlon", json=payload, timeout=60)
        return JSONResponse(r.json(), status_code=r.status_code)

# ---------- Simple notify endpoint (why: any service can push an event) ----------
@app.post("/events/notify")
async def events_notify(req: Request):
    """
    Body: {
      "type": "disruption" | "info" | "reload",
      "payload": {...},
      "rooms": ["route:RNCG2"]   # optional; if omitted -> broadcast
    }
    """
    body = await req.json()
    rooms = body.get("rooms") or [None]  # None == broadcast
    for room in rooms:
        await sio.emit("notify", body, room=room)
    return {"ok": True}

# ---------- Tiny HTML UI with socket client ----------
@app.get("/", response_class=HTMLResponse)
def ui():
    return """
<!doctype html><html><head><meta charset="utf-8"/>
<title>STC Demo</title>
<style>body{font-family:system-ui;padding:24px;max-width:900px;margin:auto}
pre{background:#111;color:#0f0;padding:12px;border-radius:8px;overflow:auto}</style>
</head><body>
<h1>Smart Transit Companion – Demo</h1>
<button onclick="plan()">Plan S01 → S25 @ 07:00</button>
<button onclick="reload()">Reload + Build + Refresh</button>
<h3>Result</h3><pre id="out">waiting…</pre>
<h3>Realtime events</h3><pre id="events"></pre>
<script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
<script>
  const out  = document.getElementById('out');
  const evts = document.getElementById('events');
  const sock = io(); // same origin

  sock.on('connect', () => evts.textContent += "[ws] connected\\n");
  sock.on('disconnect', () => evts.textContent += "[ws] disconnected\\n");
  sock.on('notify', (msg) => {
    evts.textContent += "[notify] " + JSON.stringify(msg) + "\\n";
  });

  async function plan(){
    const r = await fetch('/api/plan', {method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({origin:{stop_id:'S01'}, destination:{stop_id:'S25'}, depart_at:'07:00'})});
    out.textContent = JSON.stringify(await r.json(), null, 2);
  }
  async function reload(){
    const r = await fetch('/api/reload', {method:'POST'});
    out.textContent = JSON.stringify(await r.json(), null, 2);
  }
</script>
</body></html>
    """

# --- Socket.IO handlers (optional hooks) ---
@sio.event
async def connect(sid, environ):
    # could parse query to auto-join rooms like ?route=RNCG2
    pass

@sio.event
async def join(sid, data):
    # data = {"room":"route:RNCG2"}
    room = (data or {}).get("room")
    if room: sio.enter_room(sid, room)

@sio.event
async def leave(sid, data):
    room = (data or {}).get("room")
    if room: sio.leave_room(sid, room)

# 👇 export the combined ASGI app (this is what uvicorn will run)
asgi = socketio.ASGIApp(sio, other_asgi_app=app)
