# apps/agents/route-optimizer/app/planner.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from loguru import logger
from sqlalchemy import text
from .db import ENGINE

# ---- time helpers -------------------------------------------------
def hms_to_sec(s: str) -> int:
    hh, mm, ss = map(int, s.split(":"))
    return hh*3600 + mm*60 + ss

def sec_to_hm(s: int) -> str:
    s %= 24*3600
    hh = s//3600; mm=(s%3600)//60
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

# ---- prefetch GTFS to RAM (fast for small feeds) ------------------

_snapshot = None

def load_snapshot_cached():
    global _snapshot
    if _snapshot is None:
        _snapshot = load_snapshot()
    return _snapshot

def refresh_snapshot():
    global _snapshot
    _snapshot = load_snapshot()
    
def load_snapshot():
    """
    Returns:
      trips_by_id: {trip_id: [StopEvent(...), ...]}   # per-trip ordered events
      dep_by_stop: {stop_id: [(trip_id, dep_seconds, stop_sequence), ...]}
      tf_map:      {from_stop_id: [(to_stop_id, distance_m), ...]}
    """
    with ENGINE.begin() as c:
        # 1) Build per-trip sequences with route_id and times
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

        # 2) For fast departure scanning at each stop
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
        # sort each stop’s departures by time
        for sid in dep_by_stop:
            dep_by_stop[sid].sort(key=lambda t: t[1])

        # 3) Transfers → make undirected edges for walking
        tf_rows = c.execute(text("""
            SELECT from_stop_id, to_stop_id, distance_m
            FROM transfers
        """)).mappings().all()

        tf_map: Dict[str, List[Tuple[str, int]]] = {}
        for r in tf_rows:
            a, b, d = r["from_stop_id"], r["to_stop_id"], int(r["distance_m"])
            tf_map.setdefault(a, []).append((b, d))
            tf_map.setdefault(b, []).append((a, d))

    return trips_by_id, dep_by_stop, tf_map

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
def plan(origin_stop: str, dest_stop: str, depart_hm: str, walk_m_per_s: float = 1.2):
    trips_by_id, dep_by_stop, tf_map = load_snapshot()
    depart_s = hms_to_sec(depart_hm + (":00" if len(depart_hm) == 5 else ""))

    # Dijkstra-like label setting on stops (time-dependent via GTFS times)
    import heapq
    INF = 10**9
    best: Dict[str, int] = {}
    parent: Dict[str, Tuple[str, str, Optional[str], Optional[int], Optional[int]]] = {}
    # parent[stop] = (prev_stop, mode, trip_id, board_seq, alight_seq)

    pq: List[Tuple[int, str]] = []
    best[origin_stop] = depart_s
    heapq.heappush(pq, (depart_s, origin_stop))

    seen_trip_at_stop: set[Tuple[str, str]] = set()  # (stop_id, trip_id) to avoid re-expanding same trip from same stop

    while pq:
        t_s, u = heapq.heappop(pq)
        if t_s != best.get(u, INF):
            continue
        if u == dest_stop:
            break

        # 1) ride options from u: choose any trip departing >= t_s
        for (tid, dep_s, seq) in dep_by_stop.get(u, []):
            if dep_s < t_s:  # too early
                continue
            key = (u, tid)
            if key in seen_trip_at_stop:
                continue
            seen_trip_at_stop.add(key)
            evs = trips_by_id[tid]
            # find index at seq and propagate forward on that trip
            for i in range(len(evs)):
                if evs[i].seq == seq:
                    start_i = i
                    break
            else:
                continue
            board_dep = max(dep_s, t_s)
            for j in range(start_i+1, len(evs)):
                v_ev = evs[j]
                arrive_v = v_ev.arr_s
                v = v_ev.stop_id
                if arrive_v < best.get(v, INF):
                    best[v] = arrive_v
                    parent[v] = (u, "ride", tid, evs[start_i].seq, v_ev.seq)
                    heapq.heappush(pq, (arrive_v, v))

        # 2) walking transfers from u
        for (v, dist_m) in tf_map.get(u, []):
            walk_s = int(round(dist_m / walk_m_per_s))
            arrive_v = t_s + walk_s
            if arrive_v < best.get(v, INF):
                best[v] = arrive_v
                parent[v] = (u, "walk", None, None, None)
                heapq.heappush(pq, (arrive_v, v))

    if dest_stop not in best:
        return {"found": False, "message": "No path found"}

    # reconstruct legs, merging ride sequences on same trip
    legs: List[dict] = []
    cur = dest_stop
    while cur != origin_stop:
        prev, mode, tid, bseq, aseq = parent[cur]
        if mode == "ride":
            # merge contiguous ride legs with same trip
            if legs and legs[-1]["mode"] == "ride" and legs[-1]["trip_id"] == tid and legs[-1]["from_seq"] == aseq:
                # should not happen due to direction, keep simple
                pass
            legs.append({
                "mode": "ride",
                "trip_id": tid,
                "route_id": trips_by_id[tid][0].route_id,
                "from_stop": prev,
                "to_stop": cur,
                "from_seq": bseq,
                "to_seq": aseq,
                "depart_time": sec_to_hm(best[prev]),
                "arrive_time": sec_to_hm(best[cur]),
            })
        else:
            legs.append({
                "mode": "walk",
                "from_stop": prev,
                "to_stop": cur,
                "depart_time": sec_to_hm(best[prev]),
                "arrive_time": sec_to_hm(best[cur]),
            })
        cur = prev

    legs.reverse()
    total_min = round((best[dest_stop] - best[origin_stop]) / 60)
    transfers = sum(1 for L in legs if L["mode"] == "walk")
    return {
        "found": True,
        "depart_at": sec_to_hm(best[origin_stop]),
        "arrive_at": sec_to_hm(best[dest_stop]),
        "duration_min": total_min,
        "transfers": transfers,
        "legs": legs
    }
