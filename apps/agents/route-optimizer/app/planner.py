# apps/agents/route-optimizer/app/planner.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from sqlalchemy import text
from .db import ENGINE

_route_meta_by_id = None
# ---- time helpers -------------------------------------------------
def hms_to_sec(s: str) -> int:
    parts = s.split(":")
    if len(parts) == 2:
        parts.append("00")
    hh, mm, ss = map(int, parts)
    return hh * 3600 + mm * 60 + ss

def sec_to_hm(s: int) -> str:
    s %= 24 * 3600
    hh = s // 3600
    mm = (s % 3600) // 60
    return f"{hh:02d}:{mm:02d}"

# ---- data models --------------------------------------------------
@dataclass
class StopEvent:
    trip_id: str
    route_id: str
    stop_id: str
    arr_s: int
    dep_s: int
    seq: int

# ---- snapshot (prefetch GTFS into RAM) ----------------------------
_snapshot = None
_stop_names_cache = None
_stop_info_cache = None  
# ---- snapshot (prefetch GTFS into RAM) ----------------------------


def _load_route_meta():
    with ENGINE.begin() as c:
        rows = c.execute(text("""
            SELECT r.route_id,
                   r.route_short_name,
                   r.route_long_name,
                   r.agency_id,
                   COALESCE(a.agency_name, r.agency_id) AS agency_name
            FROM routes r
            LEFT JOIN agencies a USING (agency_id)
        """)).mappings().all()
    meta = {}
    for r in rows:
        meta[r["route_id"]] = {
            "route_short_name": r["route_short_name"],
            "route_long_name":  r["route_long_name"],
            "agency_id":        r["agency_id"],
            "agency_name":      r["agency_name"],
        }
    return meta

def route_meta_by_id():
    global _route_meta_by_id
    if _route_meta_by_id is None:
        _route_meta_by_id = _load_route_meta()
    return _route_meta_by_id

def load_snapshot():
    """
    Returns:
      trips_by_id: {trip_id: [StopEvent(...), ...]}
      dep_by_stop: {stop_id: [(trip_id, dep_seconds, stop_sequence), ...]}
      tf_map:      {from_stop_id: [(to_stop_id, distance_m), ...]}
      route_type_by_id: {route_id: int}
    """
    with ENGINE.begin() as c:
        # Check if routes.route_type exists (avoids failing the txn)
        has_route_type = c.execute(text("""
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'routes' AND column_name = 'route_type'
            LIMIT 1
        """)).scalar() is not None

        if has_route_type:
            rtypes = c.execute(text("SELECT route_id, route_type FROM routes")).mappings().all()
            route_type_by_id = {
                r["route_id"]: int(r["route_type"])
                for r in rtypes
                if r["route_type"] is not None
            }
        else:
            route_type_by_id = {}

        # 1) Per-trip sequences
        ev_rows = c.execute(text("""
            SELECT st.trip_id,
                   t.route_id,
                   st.stop_id,
                   st.stop_sequence,
                   st.arrival_time,
                   st.departure_time
            FROM stop_times st
            JOIN trips t USING (trip_id)
            ORDER BY st.trip_id, st.stop_sequence
        """)).mappings().all()

        trips_by_id: Dict[str, List[StopEvent]] = {}
        for r in ev_rows:
            tid = r["trip_id"]
            trips_by_id.setdefault(tid, []).append(
                StopEvent(
                    trip_id=tid,
                    route_id=r["route_id"],
                    stop_id=r["stop_id"],
                    arr_s=hms_to_sec(r["arrival_time"]),
                    dep_s=hms_to_sec(r["departure_time"]),
                    seq=int(r["stop_sequence"]),
                )
            )

        # 2) Departures by stop
        st_rows = c.execute(text("""
            SELECT trip_id, stop_id, stop_sequence, departure_time
            FROM stop_times
            ORDER BY stop_id, stop_sequence
        """)).mappings().all()

        dep_by_stop: Dict[str, List[Tuple[str, int, int]]] = {}
        for r in st_rows:
            sid = r["stop_id"]
            dep_by_stop.setdefault(sid, []).append(
                (r["trip_id"], hms_to_sec(r["departure_time"]), int(r["stop_sequence"]))
            )
        for sid in dep_by_stop:
            dep_by_stop[sid].sort(key=lambda t: t[1])

        # 3) Walking transfers
        tf_rows = c.execute(text("""
            SELECT from_stop_id, to_stop_id, distance_m
            FROM transfers
        """)).mappings().all()

        tf_map: Dict[str, List[Tuple[str, int]]] = {}
        for r in tf_rows:
            a, b, d = r["from_stop_id"], r["to_stop_id"], int(r["distance_m"])
            tf_map.setdefault(a, []).append((b, d))
            tf_map.setdefault(b, []).append((a, d))

    return trips_by_id, dep_by_stop, tf_map, route_type_by_id


def load_snapshot_cached():
    global _snapshot
    if _snapshot is None:
        _snapshot = load_snapshot()
    return _snapshot

# def refresh_snapshot():
#     global _snapshot
#     _snapshot = load_snapshot()
def refresh_snapshot():
    global _snapshot, _stop_info_cache, _stop_names_cache, _route_meta_by_id
    _snapshot = load_snapshot()
    _stop_info_cache = None
    _stop_names_cache = None
    _route_meta_by_id = None



def _load_stop_info():
    with ENGINE.begin() as c:
        rows = c.execute(text("""
            SELECT stop_id, name, lat, lon FROM stops
        """)).mappings().all()
    return {r["stop_id"]: {"name": r["name"], "lat": float(r["lat"]), "lon": float(r["lon"])} for r in rows}

def stop_info(sid: str):
    global _stop_info_cache
    if _stop_info_cache is None:
        _stop_info_cache = _load_stop_info()
    # fallback if unknown
    return _stop_info_cache.get(sid, {"name": sid, "lat": None, "lon": None})

# ---- nearest stop (for lat/lon inputs) ----------------------------
def nearest_stops(lat: float, lon: float, k: int = 3) -> List[Tuple[str, int]]:
    with ENGINE.begin() as c:
        rows = c.execute(text("""
            SELECT stop_id,
                   CAST(ST_DistanceSphere(geom, ST_SetSRID(ST_MakePoint(:lon,:lat),4326)) AS integer) AS dist
            FROM stops
            ORDER BY dist ASC
            LIMIT :k
        """), {"lat": lat, "lon": lon, "k": k}).mappings().all()
    return [(r["stop_id"], r["dist"]) for r in rows]

# ---- planner (earliest-arrival with simple trip scanning) ---------
def plan(
    origin_stop: str, dest_stop: str, depart_hm: str, *, max_walk_m: Optional[int] = 800, walk_m_per_s: float = 1.2):
    # trips_by_id, dep_by_stop, tf_map, route_type_by_id = load_snapshot_cached()
    # depart_s = hms_to_sec(depart_hm)

    res = load_snapshot_cached()
    if len(res) == 3:
        trips_by_id, dep_by_stop, tf_map = res
        route_type_by_id = {}
    else:
        trips_by_id, dep_by_stop, tf_map, route_type_by_id = res

    depart_s = hms_to_sec(depart_hm)


    import heapq
    INF = 10**9
    best: Dict[str, int] = {}
    parent: Dict[str, Tuple[str, str, Optional[str], Optional[int], Optional[int]]] = {}
    pq: List[Tuple[int, str]] = []

    best[origin_stop] = depart_s
    heapq.heappush(pq, (depart_s, origin_stop))
    seen_trip_at_stop: set[Tuple[str, str]] = set()

    while pq:
        t_s, u = heapq.heappop(pq)
        if t_s != best.get(u, INF):
            continue
        if u == dest_stop:
            break

        # 1) Ride options from u
        for (tid, dep_s, seq) in dep_by_stop.get(u, []):
            if dep_s < t_s:
                continue
            key = (u, tid)
            if key in seen_trip_at_stop:
                continue
            seen_trip_at_stop.add(key)

            evs = trips_by_id[tid]
            start_i = next((i for i, ev in enumerate(evs) if ev.seq == seq), None)
            if start_i is None:
                continue

            for j in range(start_i + 1, len(evs)):
                v_ev = evs[j]
                v = v_ev.stop_id
                arrive_v = v_ev.arr_s
                if arrive_v < best.get(v, INF):
                    best[v] = arrive_v
                    parent[v] = (u, "ride", tid, evs[start_i].seq, v_ev.seq)
                    heapq.heappush(pq, (arrive_v, v))

        # 2) Walking transfers from u
        for (v, dist_m) in tf_map.get(u, []):
            if max_walk_m is not None and dist_m > max_walk_m:
                continue
            walk_s = int(round(dist_m / walk_m_per_s))
            arrive_v = t_s + walk_s
            if arrive_v < best.get(v, INF):
                best[v] = arrive_v
                parent[v] = (u, "walk", None, None, None)
                heapq.heappush(pq, (arrive_v, v))

    if dest_stop not in best:
        return {"found": False, "message": "No path found"}

    # reconstruct path
    legs: List[dict] = []
    cur = dest_stop
    while cur != origin_stop:
        prev, mode, tid, bseq, aseq = parent[cur]
        prev_i = stop_info(prev)
        cur_i  = stop_info(cur)
        if mode == "ride":
            route_id = trips_by_id[tid][0].route_id
            rmeta = route_meta_by_id().get(route_id, {})
            legs.append({
                "mode": "ride",
                "trip_id": tid,
                "route_id": route_id,
                "route_type": route_type_by_id.get(route_id),
               "operator": rmeta.get("agency_name"),
                "agency_id": rmeta.get("agency_id"),
                "route_short_name": rmeta.get("route_short_name"),
               "route_long_name": rmeta.get("route_long_name"),
                "from_stop": prev,
                "to_stop": cur,
                "from_stop_name": prev_i["name"],
                "to_stop_name": cur_i["name"],
                "from_lat": prev_i["lat"], "from_lon": prev_i["lon"],
                "to_lat": cur_i["lat"],   "to_lon": cur_i["lon"],
                "from_seq": bseq, "to_seq": aseq,
                "depart_time": sec_to_hm(best[prev]),
                "arrive_time": sec_to_hm(best[cur]),
            })
        else:
            legs.append({
                "mode": "walk",
                "from_stop": prev,
                "to_stop": cur,
                "from_stop_name": prev_i["name"],
                "to_stop_name": cur_i["name"],
                "from_lat": prev_i["lat"], "from_lon": prev_i["lon"],
                "to_lat": cur_i["lat"],   "to_lon": cur_i["lon"],
                "depart_time": sec_to_hm(best[prev]),
                "arrive_time": sec_to_hm(best[cur]),
            })
        cur = prev
    legs.reverse()
    total_min = round((best[dest_stop] - best[origin_stop]) / 60)
    transfers = sum(1 for L in legs if L["mode"] == "walk")

    o = stop_info(origin_stop)
    d = stop_info(dest_stop)
    return {
        "found": True,
        "depart_at": sec_to_hm(best[origin_stop]),
        "arrive_at": sec_to_hm(best[dest_stop]),
        "duration_min": total_min,
        "transfers": transfers,
        "legs": legs,
        "max_walk_m": max_walk_m,
        "origin_stop": origin_stop, "origin_name": o["name"],
        "dest_stop": dest_stop,     "dest_name": d["name"],
        "origin_lat": o["lat"], "origin_lon": o["lon"],
        "dest_lat": d["lat"],   "dest_lon": d["lon"],
    }
# ---- add this back (seconds!) ------------------------------------
def sec_to_hms(s: int) -> str:
    s %= 24 * 3600
    hh = s // 3600
    mm = (s % 3600) // 60
    ss = s % 60
    return f"{hh:02d}:{mm:02d}:{ss:02d}"


def available_trips_between(origin_stop: str, dest_stop: str,
                             depart_hm: str, window_min: int = 15, limit: int = 20):
    start_s = hms_to_sec(depart_hm)
    end_s   = start_s + window_min * 60

    # Use HH:MM:SS so string comparisons line up
    start = sec_to_hms(start_s)
    end   = sec_to_hms(end_s)
    wrap = end < start  # crosses midnight

    sql = f"""
        SELECT 
            o.trip_id,
            t.route_id,
            o.departure_time::text AS depart_time,
            d.arrival_time::text   AS arrive_time,
            r.route_short_name,
            r.route_long_name,
            COALESCE(a.agency_name, r.agency_id) AS agency_name
        FROM stop_times o
        JOIN stop_times d ON d.trip_id = o.trip_id AND d.stop_sequence > o.stop_sequence
        JOIN trips t      ON t.trip_id = o.trip_id
        LEFT JOIN routes r  ON r.route_id = t.route_id
        LEFT JOIN agencies a ON a.agency_id = r.agency_id
        WHERE o.stop_id = :o_sid
          AND d.stop_id = :d_sid
          AND (
            {"(o.departure_time::text >= :start OR o.departure_time::text < :end)" if wrap else
              "(o.departure_time::text >= :start AND o.departure_time::text < :end)"}
          )
        ORDER BY o.departure_time
        LIMIT :limit
    """

    params = {
        "o_sid": origin_stop,
        "d_sid": dest_stop,
        "start": start,  # "HH:MM:SS"
        "end": end,      # "HH:MM:SS"
        "limit": limit,
    }

    with ENGINE.begin() as c:
        rows = c.execute(text(sql), params).mappings().all()

    # Already strings, safe for JSON
    return [
        {
            "trip_id":          r["trip_id"],
            "route_id":         r["route_id"],
            "depart_time":      r["depart_time"],
            "arrive_time":      r["arrive_time"],
            "route_short_name": r["route_short_name"],
            "route_long_name":  r["route_long_name"],
            "agency_name":      r["agency_name"],
        }
        for r in rows
    ]


# --- add near the other module globals ---

def _load_stop_names():
    with ENGINE.begin() as c:
        rows = c.execute(text("SELECT stop_id, name FROM stops")).mappings().all()
    return {r["stop_id"]: r["name"] for r in rows}

def stop_name(sid: str) -> str:
    global _stop_names_cache
    if _stop_names_cache is None:
        _stop_names_cache = _load_stop_names()
    return _stop_names_cache.get(sid, sid)
